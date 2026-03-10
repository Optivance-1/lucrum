import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { CFOContext, AIInsight } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'
import { getUserPlan } from '@/lib/subscription'
import { getEligibleAffiliates } from '@/lib/affiliates'

function buildFallbackInsights(context: CFOContext): AIInsight[] {
  const runwayCritical = context.runway < 60
  const churnWarning = context.churnRate > 5
  const growthPositive = context.mrrGrowth > 0

  return [
    {
      id: 'fallback_cash', type: runwayCritical ? 'critical' : 'opportunity',
      title: runwayCritical ? 'Runway is tight' : 'Runway is stable',
      body: runwayCritical ? `You have ${context.runway} days of runway. Cut one non-core expense this week to buy decision time.` : `You have ${context.runway} days of runway. Protect this by avoiding fixed-cost increases without clear payback.`,
      action: runwayCritical ? 'Cut spend' : 'Protect runway', metric: `${context.runway} days`, priority: 1,
    },
    {
      id: 'fallback_churn', type: churnWarning ? 'warning' : 'win',
      title: churnWarning ? 'Retention leak detected' : 'Retention holding',
      body: churnWarning ? `Churn is ${context.churnRate}%. Focus on failed-payment recovery and targeted save offers before buying more traffic.` : `Churn is ${context.churnRate}%, which is manageable. Keep onboarding tight and monitor cancellation reasons weekly.`,
      action: 'Review churn', metric: `${context.churnRate}% churn`, priority: 2,
    },
    {
      id: 'fallback_growth', type: growthPositive ? 'win' : 'warning',
      title: growthPositive ? 'MRR trend is up' : 'Growth is soft',
      body: growthPositive ? `MRR grew ${context.mrrGrowth}% MoM. Double down on the acquisition channel driving the highest retained subscribers.` : `MRR is ${context.mrrGrowth}% MoM. Run one pricing or packaging test before increasing paid spend.`,
      action: growthPositive ? 'Scale channel' : 'Test pricing', metric: `${context.mrrGrowth}% MoM`, priority: 3,
    },
    {
      id: 'fallback_opportunity', type: 'opportunity',
      title: 'Next best action',
      body: `With $${context.revenue30d} in 30-day revenue and ${context.newCustomers30d} new customers, ship one retention experiment and one pricing experiment this month.`,
      action: 'Run experiments', metric: `${context.newCustomers30d} new customers`, priority: 3,
    },
  ]
}

function buildDemoInsights(): AIInsight[] {
  return [
    {
      id: 'demo_runway', type: 'critical',
      title: 'Runway is tight — 67 days',
      body: 'At current burn of $3,100/mo and $12,000 cash, you have 67 days. Cut one subscription this week to buy 4 more days of decision time.',
      action: 'Cut spend', metric: '67 days', priority: 1,
    },
    {
      id: 'demo_churn', type: 'warning',
      title: '3.8% churn is above benchmark',
      body: '2 customers are past_due right now. That\'s $380 MRR at risk. Recovery emails convert at 32% — send them today.',
      action: 'Recover now', metric: '3.8% churn', priority: 2,
    },
    {
      id: 'demo_growth', type: 'win',
      title: 'MRR growing 6% MoM',
      body: '$4,200 MRR with 6% monthly growth. You\'re compounding. Protect this by not raising prices until churn is below 3%.',
      action: 'Scale channel', metric: '+6% MoM', priority: 3,
    },
    {
      id: 'demo_opportunity', type: 'opportunity',
      title: 'Failed payment recovery = free revenue',
      body: '3 failed invoices worth $840 sitting in your Stripe. Retry takes 30 seconds. 78% success rate. This is literally free money.',
      action: 'Retry payments', metric: '$840 recoverable', priority: 1,
    },
  ]
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contextRaw: Partial<CFOContext> = await req.json().catch(() => ({}))
  const context: CFOContext = {
    mrr: Number(contextRaw.mrr ?? 0),
    mrrGrowth: Number(contextRaw.mrrGrowth ?? 0),
    revenue30d: Number(contextRaw.revenue30d ?? 0),
    revenueGrowth: Number(contextRaw.revenueGrowth ?? 0),
    activeSubscriptions: Number(contextRaw.activeSubscriptions ?? 0),
    newSubscriptions30d: Number(contextRaw.newSubscriptions30d ?? 0),
    churnRate: Number(contextRaw.churnRate ?? 0),
    newCustomers30d: Number(contextRaw.newCustomers30d ?? 0),
    availableBalance: Number(contextRaw.availableBalance ?? 0),
    runway: Number(contextRaw.runway ?? 0),
    cancelledSubscriptions30d: Number(contextRaw.cancelledSubscriptions30d ?? 0),
    accountAgeDays: contextRaw.accountAgeDays != null ? Number(contextRaw.accountAgeDays) : undefined,
    benchmarks: contextRaw.benchmarks,
  }

  try {
    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      return NextResponse.json({
        insights: buildDemoInsights(),
        provider: 'demo',
        plan,
        isDemoData: true,
      })
    }

    let benchmarkBlock = ''
    const isNew = (context.accountAgeDays ?? 365) < 60
    if (isNew && context.benchmarks) {
      const b = context.benchmarks
      benchmarkBlock = `\n\nPEER BENCHMARKS (this is a NEW founder, Day ${context.accountAgeDays}):
- Median MRR: $${b.medianMRR} | P25: $${b.p25MRR} | P75: $${b.p75MRR}
- Median Growth: ${b.medianGrowthRate ?? 'N/A'}% MoM
- Top Performer: $${b.topPerformerMRR}
Replace the "opportunity" insight with a benchmark comparison for new founders.`
    }

    const prompt = `You are Lucrum's AI CFO engine. Analyze this founder's financial data and generate exactly 4 insights.

FINANCIAL DATA:
- MRR: $${context.mrr} (${context.mrrGrowth > 0 ? '+' : ''}${context.mrrGrowth}% MoM)
- 30-day Revenue: $${context.revenue30d} (${context.revenueGrowth > 0 ? '+' : ''}${context.revenueGrowth}% vs prior period)
- Active Subscriptions: ${context.activeSubscriptions}
- New Subscriptions (30d): ${context.newSubscriptions30d}
- Cancelled Subscriptions (30d): ${context.cancelledSubscriptions30d}
- Churn Rate: ${context.churnRate}%
- New Customers (30d): ${context.newCustomers30d}
- Available Cash: $${context.availableBalance}
- Runway: ${context.runway === 9999 ? 'Profitable / Infinite' : context.runway + ' days'}
${benchmarkBlock}
RULES:
- Generate exactly 4 insights: 1 about cash/runway, 1 about churn/retention, 1 about growth, 1 opportunity
- Each insight must be specific to the numbers above
- If runway < 60 days: type = "critical". If churn > 5%: type = "warning". Wins get type = "win". Otherwise "opportunity"
- Keep body to 1-2 sentences max. Be blunt, specific, actionable.

Respond ONLY with valid JSON array, no markdown, no preamble:
[{"id":"insight_1","type":"critical|warning|opportunity|win","title":"...","body":"...","action":"...","metric":"...","priority":1}]`

    const rawText = await callHeavyAI(undefined, prompt)
    const clean = (rawText || '[]').replace(/```json|```/g, '').trim()
    const insights: AIInsight[] = JSON.parse(clean)
    insights.sort((a, b) => a.priority - b.priority)

    const affiliateMetrics = { mrr: context.mrr, runway: context.runway, churnRate: context.churnRate, accountAgeDays: context.accountAgeDays ?? 365, revenue30d: context.revenue30d }
    const eligible = getEligibleAffiliates(affiliateMetrics)
    if (eligible.length > 0) {
      const top = eligible[0]
      insights.push({
        id: `affiliate_${top.id}`, type: 'affiliate',
        title: top.tagline, body: `${top.description} — recommended by MAX based on your financials.`,
        action: top.ctaText, affiliateUrl: top.affiliateUrl, metric: top.name, priority: 3,
      })
    }

    return NextResponse.json({ insights, provider: 'lucrum-ai', plan })
  } catch (error: any) {
    console.error('[ai/insights] error:', error)
    return NextResponse.json({ insights: buildFallbackInsights(context), provider: 'fallback' })
  }
}
