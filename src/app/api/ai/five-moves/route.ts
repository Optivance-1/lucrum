import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { StripeMetrics, StripeCustomer, FiveMovesResult, Move, SimulationResult } from '@/types'
import { generateFiveMoves } from '@/lib/five-moves'
import { safeKvGet } from '@/lib/kv'
import { getUserPlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildFakeBaseline(): SimulationResult {
  return {
    runway: { p10: 28, p25: 42, p50: 67, p75: 105, p90: 180, mean: 78, probabilityOf60Days: 0.52, probabilityOf90Days: 0.38, probabilityOf180Days: 0.12, probabilityOf365Days: 0.03, probabilityOf730Days: 0.005 },
    mrrForecast: { month3: { p25: 3400, p50: 4200, p75: 5100 }, month6: { p25: 2800, p50: 4600, p75: 6200 }, month12: { p25: 1200, p50: 5800, p75: 9400 }, month24: { p25: 0, p50: 7200, p75: 15000 } },
    scenarios: {
      bear: { probability: 0.2, runway: 28, mrr3mo: 3400, mrr12mo: 1200, description: 'Churn accelerates, growth stalls' },
      base: { probability: 0.6, runway: 67, mrr3mo: 4200, mrr12mo: 5800, description: 'Current trajectory holds' },
      bull: { probability: 0.2, runway: 180, mrr3mo: 5100, mrr12mo: 9400, description: 'Breakout growth kicks in' },
    },
    riskScore: 62, volatilityScore: 63, breakEvenProbability: 0.41, baselineRunwayP50: 67, decisionLiftP50: 0, nSimulations: 50000, computedAt: Date.now(), horizonMonths: 24,
  }
}

function buildFakeMoves(): Move[] {
  const colors = { cutthroat: '#FF3B5C', aggressive: '#FF8C00', balanced: '#C9A84C', conservative: '#00A066', safe: '#00D084' } as const
  const labels = { cutthroat: 'Cutthroat — Maximum EV', aggressive: 'Aggressive — High Upside', balanced: 'Balanced — Best Risk-Adj', conservative: 'Conservative — Protect Position', safe: 'Safe — Minimum Viable Action' } as const
  const baseline = buildFakeBaseline()

  return [
    {
      rank: 1, risk: 'cutthroat', riskLabel: labels.cutthroat, riskColor: colors.cutthroat,
      title: 'Recover $840 in Failed Payments Now',
      summary: 'Retry 3 failed invoices before they expire.',
      rationale: '78% retry success rate across SaaS. $840 sitting in open invoices costs nothing to attempt.',
      tradeoff: 'None — fully reversible, no customer impact.',
      maxStatement: '78% retry success rate. $840 is sitting there. Takes 30 seconds. There is no reason not to do this today.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 18, expectedMRRAt90d: 4850, expectedMRRAt365d: 6200, survivalProbability: 0.84, expectedDollarImpact: 655, riskOfBackfire: 0.02, compositeScore: 91 },
    },
    {
      rank: 2, risk: 'aggressive', riskLabel: labels.aggressive, riskColor: colors.aggressive,
      title: 'Launch Churn Recovery + Coupon',
      summary: 'Email at-risk customers with a 20% retention offer.',
      rationale: '2 customers are past_due representing $380 MRR. A 20% coupon costs $76 to save $4,560 in annual LTV.',
      tradeoff: 'Coupon discount reduces margin on retained customers for 3 months.',
      maxStatement: '2 customers are past_due representing $380 MRR. A 20% coupon costs $76 to save $4,560 in annual LTV. That\'s a 60x return if it works.',
      timeToExecute: 'This week',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 31, expectedMRRAt90d: 5100, expectedMRRAt365d: 7800, survivalProbability: 0.88, expectedDollarImpact: 4560, riskOfBackfire: 0.08, compositeScore: 78 },
    },
    {
      rank: 3, risk: 'balanced', riskLabel: labels.balanced, riskColor: colors.balanced,
      title: 'Expand Top 5 Customers',
      summary: 'Upsell your 5 longest-tenured customers to the next tier.',
      rationale: 'Your 5 oldest customers have been paying 4+ months and never upgraded. 18% upsell rate means roughly 1 upgrade.',
      tradeoff: 'Requires crafting personalized upsell emails. Low effort, but not zero.',
      maxStatement: 'Your 5 oldest customers have been paying for 4+ months and never upgraded. 18% upsell rate means roughly 1 upgrade. At $50 delta that\'s $600 ARR for one email.',
      timeToExecute: 'This week',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 22, expectedMRRAt90d: 4950, expectedMRRAt365d: 6800, survivalProbability: 0.86, expectedDollarImpact: 600, riskOfBackfire: 0.04, compositeScore: 64 },
    },
    {
      rank: 4, risk: 'conservative', riskLabel: labels.conservative, riskColor: colors.conservative,
      title: 'Cut One Expense Line',
      summary: 'Identify and eliminate your lowest-ROI monthly expense.',
      rationale: 'Your burn is $3,100/mo. Cutting one $200 subscription extends runway by 4 days and costs nothing.',
      tradeoff: 'You lose access to whatever tool you cut. Choose wisely.',
      maxStatement: 'Your burn is $3,100/mo. Cutting one $200 subscription extends runway by 4 days and costs nothing to execute. Every dollar of burn you eliminate is a dollar that doesn\'t need to be earned.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 12, expectedMRRAt90d: 4400, expectedMRRAt365d: 5800, survivalProbability: 0.82, expectedDollarImpact: 200, riskOfBackfire: 0.01, compositeScore: 58 },
    },
    {
      rank: 5, risk: 'safe', riskLabel: labels.safe, riskColor: colors.safe,
      title: 'Send Monday Morning Metrics Email',
      summary: 'Set up a weekly metrics email to yourself every Monday.',
      rationale: 'Founders who review metrics weekly catch problems 3x faster. Zero cost, 10 minutes to set up.',
      tradeoff: 'Minimal — just the time to set it up.',
      maxStatement: 'Founders who review metrics weekly catch problems 3x faster. This costs nothing and takes 10 minutes to set up. It\'s the lowest-risk highest-signal habit in SaaS.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 4, expectedMRRAt90d: 4300, expectedMRRAt365d: 5600, survivalProbability: 0.81, expectedDollarImpact: 0, riskOfBackfire: 0, compositeScore: 42 },
    },
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      return NextResponse.json({
        moves: buildFakeMoves(),
        baselineSimulation: buildFakeBaseline(),
        generatedAt: Date.now(),
        dataQuality: 'low',
        isDemoData: true,
      } as FiveMovesResult & { isDemoData: boolean })
    }

    const body = await req.json().catch(() => ({})) as {
      metrics?: StripeMetrics
      customers?: StripeCustomer[]
    }

    if (!body.metrics) {
      return NextResponse.json({ error: 'metrics required' }, { status: 400 })
    }

    const customers: StripeCustomer[] = body.customers ?? []
    const result = await generateFiveMoves(body.metrics, customers, userId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[five-moves] error:', error)
    return NextResponse.json(
      { error: 'Five Moves generation failed. Try again shortly.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(userId)
    if (plan === 'demo') {
      return NextResponse.json({
        moves: buildFakeMoves(),
        baselineSimulation: buildFakeBaseline(),
        generatedAt: Date.now(),
        dataQuality: 'low',
        isDemoData: true,
      })
    }

    const pattern = `fivemoves:${userId}:`
    const cached = await safeKvGet<FiveMovesResult>(pattern)
    if (cached) return NextResponse.json(cached)

    return NextResponse.json({ cached: false })
  } catch (error: any) {
    console.error('[five-moves] GET error:', error)
    return NextResponse.json({ cached: false })
  }
}
