import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { getStripeClient } from '@/lib/stripe-connection'
import {
  calculateStdDev,
  deriveGrowthVolatility,
  parseScenario,
  runMonteCarlo,
  type MonteCarloOutput,
  type SimulationBaseline,
} from '@/lib/simulation'
import { generateAIText, type AIProvider } from '@/lib/ai'
import { createMockSimulationBaseline, isDemoModeEnabled } from '@/lib/mockData'

export const dynamic = 'force-dynamic'

type SimulateRequestBody = {
  user_id?: string
  scenario?: string
  iterations?: number
  months?: number
}

type AdviceResult = {
  text: string
  confidence: number
  source: AIProvider | 'fallback'
}

type BalanceTransaction = {
  id: string
  amount: number
  fee: number
  net: number
  type: string
  created: number
}

type SubscriptionLike = {
  id: string
  created: number
  canceled_at: number | null
  currency?: string | null
  customer?: string | { id: string } | null
  items: { data: Array<{ quantity?: number | null; price: { unit_amount?: number | null; recurring?: { interval: string } | null } }> }
}

type PayoutLike = {
  id: string
  amount?: number | null
}

declare global {
  // eslint-disable-next-line no-var
  var __lucrumSimAdviceCache: Map<string, AdviceResult> | undefined
}

const adviceCache = globalThis.__lucrumSimAdviceCache ?? new Map<string, AdviceResult>()
if (!globalThis.__lucrumSimAdviceCache) {
  globalThis.__lucrumSimAdviceCache = adviceCache
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function subToMonthlyAmount(sub: SubscriptionLike): number {
  return (
    sub.items.data.reduce((sum, item) => {
      const unitAmount = item.price.unit_amount ?? 0
      const qty = item.quantity ?? 1
      const interval = item.price.recurring?.interval
      if (interval === 'month') return sum + unitAmount * qty
      if (interval === 'year') return sum + (unitAmount * qty) / 12
      if (interval === 'week') return sum + unitAmount * qty * 4.33
      if (interval === 'day') return sum + unitAmount * qty * 30
      return sum
    }, 0) / 100
  )
}

async function fetchAll<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
  maxItems = 2000
): Promise<T[]> {
  const out: T[] = []
  let startingAfter: string | undefined

  while (true) {
    const page = await fetchPage(startingAfter)
    out.push(...page.data)
    if (!page.has_more) break
    if (out.length >= maxItems) break
    startingAfter = page.data[page.data.length - 1]?.id
    if (!startingAfter) break
  }

  return out.slice(0, maxItems)
}

function getDateBucket(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString().slice(0, 10)
}

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

function summarizeSimForPrompt(sim: MonteCarloOutput): string {
  return JSON.stringify({
    runway_months: sim.runwayMonths,
    cash_at_6_months: sim.cashAtMonths.m6,
    cash_at_12_months: sim.cashAtMonths.m12,
    cash_at_18_months: sim.cashAtMonths.m18,
    confidence: sim.confidence,
    survival_rate_12m_pct: sim.survivalRate12m,
  })
}

function buildAdviceCacheKey(scenario: string, baseline: SimulationBaseline, sim: MonteCarloOutput): string {
  const material = JSON.stringify({
    scenario: scenario.toLowerCase().trim(),
    mrr: Math.round(baseline.currentMrr),
    cash: Math.round(baseline.availableCash),
    rev: Math.round(baseline.monthlyRevenueMean),
    outflow: Math.round(baseline.monthlyOperatingOutflow),
    churn: Number((baseline.monthlyChurnRate * 100).toFixed(1)),
    runwayP50: sim.runwayMonths.p50,
    runwayP10: sim.runwayMonths.p10,
  })
  return createHash('sha256').update(material).digest('hex')
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ')}.`
}

function parseAdvicePayload(raw: string): { advice: string; confidence: number } | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    const advice = typeof parsed.advice === 'string' ? parsed.advice.trim() : ''
    const confidence = Number(parsed.confidence)
    if (!advice) return null
    return {
      advice: truncateWords(advice, 60),
      confidence: Math.round(clamp(Number.isFinite(confidence) ? confidence : 0, 0, 100)),
    }
  } catch {
    return null
  }
}

function buildFallbackAdvice(scenario: string, baseline: SimulationBaseline, sim: MonteCarloOutput): AdviceResult {
  const runwayP50 = sim.runwayMonths.p50
  const netDelta = baseline.monthlyRevenueMean - baseline.monthlyOperatingOutflow
  const churnPct = baseline.monthlyChurnRate * 100
  const scenarioLower = scenario.toLowerCase()

  let text = ''
  let confidence = sim.confidence

  if (runwayP50 < 6) {
    text = `Cut non-core spend this week. You're on a ${runwayP50.toFixed(1)}-month median runway, so buy time first, then rebuild growth channels.`
    confidence = clamp(sim.confidence + 6, 0, 100)
  } else if (churnPct > 4) {
    text = `Fix churn before adding spend. Monthly churn is ${churnPct.toFixed(1)}%, and retention work beats paid acquisition right now.`
    confidence = clamp(sim.confidence + 4, 0, 100)
  } else if (netDelta > 0 && /cut|pause|reduce/.test(scenarioLower)) {
    text = `Don't over-cut. You're already net-positive monthly, so keep the lean plan but protect the channels that drive expansion revenue.`
    confidence = clamp(sim.confidence - 4, 0, 100)
  } else {
    text = `Prioritize one growth bet with payback under 90 days. Your risk band is manageable, so force measurable ROI on the next spend decision.`
  }

  return {
    text: truncateWords(text, 60),
    confidence: Math.round(confidence),
    source: 'fallback',
  }
}

async function generateAdvice(
  scenario: string,
  baseline: SimulationBaseline,
  sim: MonteCarloOutput
): Promise<AdviceResult> {
  const cacheKey = buildAdviceCacheKey(scenario, baseline, sim)
  const cached = adviceCache.get(cacheKey)
  if (cached) return cached

  try {
    const system = `You are Lucrum, an AI CFO for solo founders. Be blunt and practical.
Recommend exactly ONE action: drop, add, or optimize.
Keep it under 60 words and use founder-style language.`

    const user = `Scenario: ${scenario || 'baseline'}
Baseline data:
${JSON.stringify({
      current_mrr: Math.round(baseline.currentMrr),
      available_cash: Math.round(baseline.availableCash),
      monthly_revenue: Math.round(baseline.monthlyRevenueMean),
      monthly_outflow: Math.round(baseline.monthlyOperatingOutflow),
      monthly_churn_pct: Number((baseline.monthlyChurnRate * 100).toFixed(2)),
      monthly_growth_pct: Number((baseline.monthlyGrowthRate * 100).toFixed(2)),
    })}
Simulation summary:
${summarizeSimForPrompt(sim)}

Respond as strict JSON only:
{"advice":"...", "confidence": 0-100}`

    const response = await generateAIText({
      system,
      prompt: user,
      maxTokens: 220,
      temperature: 0.4,
      jsonMode: true,
    })

    const parsed = parseAdvicePayload(response.text)
    if (parsed) {
      const value: AdviceResult = {
        text: parsed.advice,
        confidence: parsed.confidence,
        source: response.provider,
      }
      adviceCache.set(cacheKey, value)
      return value
    }
  } catch {
    // Fall through to deterministic fallback
  }

  const fallback = buildFallbackAdvice(scenario, baseline, sim)
  adviceCache.set(cacheKey, fallback)
  return fallback
}

async function buildBaseline(stripe: any): Promise<SimulationBaseline> {
  const now = Math.floor(Date.now() / 1000)
  const d90 = now - 90 * 86400
  const d365 = now - 365 * 86400

  const [
    activeSubs,
    newSubs90,
    cancelledSubsYear,
    payouts90,
    balanceTransactions90,
    balance,
  ] = await Promise.all([
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          status: 'canceled',
          created: { gte: d365 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2500
    ),
    fetchAll<PayoutLike>(
      (startingAfter) =>
        stripe.payouts.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<BalanceTransaction>(
      (startingAfter) =>
        stripe.balanceTransactions.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      5000
    ),
    stripe.balance.retrieve(),
  ])

  const cancelled90 = cancelledSubsYear.filter(sub => (sub.canceled_at ?? 0) >= d90)
  const currentMrr = activeSubs.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const newMrr90 = newSubs90.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const churnedMrr90 = cancelled90.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const previousMrr = Math.max(1, currentMrr - newMrr90 + churnedMrr90)
  const monthlyGrowthRate =
    previousMrr > 0 && currentMrr > 0
      ? clamp(Math.pow(currentMrr / previousMrr, 1 / 3) - 1, -0.5, 0.5)
      : 0

  const chargeTypes = new Set(['charge', 'payment'])
  const refundTypes = new Set(['refund'])
  const disputeTypes = new Set(['dispute', 'dispute_reversal'])

  const grossRevenue90 = balanceTransactions90
    .filter(tx => chargeTypes.has(tx.type) && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0) / 100
  const fees90 = balanceTransactions90
    .filter(tx => chargeTypes.has(tx.type) && tx.fee > 0)
    .reduce((sum, tx) => sum + tx.fee, 0) / 100
  const refundTotal90 = Math.abs(
    balanceTransactions90
      .filter(tx => refundTypes.has(tx.type) && tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0) / 100
  )
  const disputeTotal90 = Math.abs(
    balanceTransactions90
      .filter(tx => disputeTypes.has(tx.type) && tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0) / 100
  )

  const netRevenue90 = grossRevenue90 - fees90 - refundTotal90 - disputeTotal90
  const monthlyRevenueMean = Math.max(1, netRevenue90 > 0 ? netRevenue90 / 3 : currentMrr || 1)

  const dateBuckets = getLastNDates(90)
  const dailyRevenueMap: Record<string, number> = {}
  dateBuckets.forEach(date => {
    dailyRevenueMap[date] = 0
  })

  balanceTransactions90.forEach(tx => {
    if (!chargeTypes.has(tx.type) && !refundTypes.has(tx.type) && !disputeTypes.has(tx.type)) return
    const bucket = getDateBucket(tx.created)
    if (bucket in dailyRevenueMap) {
      dailyRevenueMap[bucket] += tx.net / 100
    }
  })

  const dailyValues = dateBuckets.map(date => dailyRevenueMap[date] ?? 0)
  const dailyStd = calculateStdDev(dailyValues)
  const monthlyRevenueStdDev = Math.max(monthlyRevenueMean * 0.08, dailyStd * Math.sqrt(30))

  const payoutTotal90 = payouts90.reduce((sum, p) => sum + (p.amount ?? 0), 0) / 100
  const monthlyOperatingOutflow = Math.max(
    1,
    payoutTotal90 > 0
      ? payoutTotal90 / 3 + (refundTotal90 + disputeTotal90) / 3
      : monthlyRevenueMean * 0.78
  )
  const margin = clamp(1 - monthlyOperatingOutflow / Math.max(1, monthlyRevenueMean), -0.8, 0.8)

  const activeAtStart = activeSubs.length + cancelled90.length
  const monthlyChurnRate = activeAtStart > 0 ? clamp((cancelled90.length / activeAtStart) / 3, 0, 0.5) : 0
  const expectedMonthlyChurnEvents = Math.max(0.05, cancelled90.length / 3)
  const avgRevenuePerSubscription =
    activeSubs.length > 0 ? currentMrr / activeSubs.length : Math.max(1, monthlyRevenueMean / 10)

  const availableBalance = balance.available.reduce((sum: number, b: any) => sum + b.amount, 0) / 100
  const pendingBalance = balance.pending.reduce((sum: number, b: any) => sum + b.amount, 0) / 100
  const liquidity = availableBalance + pendingBalance * 0.5

  return {
    currentMrr,
    availableCash: Math.max(0, liquidity),
    monthlyRevenueMean,
    monthlyRevenueStdDev,
    monthlyOperatingOutflow,
    monthlyChurnRate,
    expectedMonthlyChurnEvents,
    avgRevenuePerSubscription,
    margin,
    monthlyGrowthRate,
    monthlyGrowthVolatility: deriveGrowthVolatility(monthlyRevenueMean, monthlyRevenueStdDev),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    const demoMode = isDemoModeEnabled(req.nextUrl.searchParams.get('demo'))
    
    const stripe = userId ? await getStripeClient(userId) : null
    if (!stripe && !demoMode) {
      return NextResponse.json({ 
        error: 'Stripe not connected',
        action: 'connect',
        connectUrl: '/api/stripe/connect'
      }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as SimulateRequestBody
    const scenarioText = typeof body.scenario === 'string' ? body.scenario.trim() : 'baseline'
    const iterations = Number.isFinite(body.iterations) ? body.iterations : 10000
    const months = Number.isFinite(body.months) ? body.months : 18

    const baseline = stripe
      ? await buildBaseline(stripe)
      : createMockSimulationBaseline()
    const parsedScenario = parseScenario(scenarioText)
    const simulation = runMonteCarlo(baseline, parsedScenario, {
      iterations,
      months,
    })
    const advice = await generateAdvice(scenarioText, baseline, simulation)

    return NextResponse.json(
      {
        user_id: body.user_id ?? null,
        scenario: scenarioText || 'baseline',
        scenario_summary: parsedScenario.summary,
        iterations: simulation.iterations,
        runway_p10: simulation.runwayMonths.p10,
        runway_p50: simulation.runwayMonths.p50,
        runway_p90: simulation.runwayMonths.p90,
        runway_best: simulation.runwayMonths.best,
        runway_worst: simulation.runwayMonths.worst,
        cash_at_6_months: simulation.cashAtMonths.m6,
        cash_at_12_months: simulation.cashAtMonths.m12,
        cash_at_18_months: simulation.cashAtMonths.m18,
        confidence: simulation.confidence,
        advice: advice.text,
        advice_confidence: advice.confidence,
        advice_source: advice.source,
        baseline: {
          current_mrr: Math.round(baseline.currentMrr),
          available_cash: Math.round(baseline.availableCash),
          monthly_revenue_mean: Math.round(baseline.monthlyRevenueMean),
          monthly_revenue_std_dev: Math.round(baseline.monthlyRevenueStdDev),
          monthly_operating_outflow: Math.round(baseline.monthlyOperatingOutflow),
          monthly_churn_rate_pct: Number((baseline.monthlyChurnRate * 100).toFixed(2)),
          monthly_growth_rate_pct: Number((baseline.monthlyGrowthRate * 100).toFixed(2)),
        },
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('[simulate] error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Simulation failed' },
      { status: error?.statusCode ?? 500 }
    )
  }
}
