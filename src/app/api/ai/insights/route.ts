import { NextRequest, NextResponse } from 'next/server'
import type { CFOContext, AIInsight } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'

function toMetric(label: string, value: string): string {
  return `${value} ${label}`.trim()
}

function buildFallbackInsights(context: CFOContext): AIInsight[] {
  const runwayCritical = context.runway < 60
  const churnWarning = context.churnRate > 5
  const growthPositive = context.mrrGrowth > 0

  const insights: AIInsight[] = [
    {
      id: 'fallback_cash',
      type: runwayCritical ? 'critical' : 'opportunity',
      title: runwayCritical ? 'Runway is tight' : 'Runway is stable',
      body: runwayCritical
        ? `You have ${context.runway} days of runway. Cut one non-core expense this week to buy decision time.`
        : `You have ${context.runway} days of runway. Protect this by avoiding fixed-cost increases without clear payback.`,
      action: runwayCritical ? 'Cut spend' : 'Protect runway',
      metric: toMetric('days', String(context.runway)),
      priority: 1,
    },
    {
      id: 'fallback_churn',
      type: churnWarning ? 'warning' : 'win',
      title: churnWarning ? 'Retention leak detected' : 'Retention holding',
      body: churnWarning
        ? `Churn is ${context.churnRate}%. Focus on failed-payment recovery and targeted save offers before buying more traffic.`
        : `Churn is ${context.churnRate}%, which is manageable. Keep onboarding tight and monitor cancellation reasons weekly.`,
      action: 'Review churn',
      metric: toMetric('churn', `${context.churnRate}%`),
      priority: 2,
    },
    {
      id: 'fallback_growth',
      type: growthPositive ? 'win' : 'warning',
      title: growthPositive ? 'MRR trend is up' : 'Growth is soft',
      body: growthPositive
        ? `MRR grew ${context.mrrGrowth}% MoM. Double down on the acquisition channel driving the highest retained subscribers.`
        : `MRR is ${context.mrrGrowth}% MoM. Run one pricing or packaging test before increasing paid spend.`,
      action: growthPositive ? 'Scale channel' : 'Test pricing',
      metric: toMetric('MoM', `${context.mrrGrowth}%`),
      priority: 3,
    },
    {
      id: 'fallback_opportunity',
      type: 'opportunity',
      title: 'Next best action',
      body: `With $${context.revenue30d} in 30-day revenue and ${context.newCustomers30d} new customers, ship one retention experiment and one pricing experiment this month.`,
      action: 'Run experiments',
      metric: toMetric('new', `${context.newCustomers30d} customers`),
      priority: 3,
    },
  ]

  return insights
}

export async function POST(req: NextRequest) {
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
  }

  try {
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
- Estimated Monthly Burn: (derived from payouts)
- Runway: ${context.runway === 9999 ? 'Profitable / Infinite' : context.runway + ' days'}

RULES:
- Generate exactly 4 insights: 1 about cash/runway, 1 about churn/retention, 1 about growth, 1 opportunity
- Each insight must be specific to the numbers above — no generic advice
- If runway < 60 days: type = "critical". If churn > 5%: type = "warning". Wins get type = "win". Otherwise "opportunity"
- Metric field: pull the single most important number from that insight (e.g. "47 days", "8.2% churn")
- Keep body to 1-2 sentences max. Be blunt, specific, actionable.
- Action = short 2-3 word CTA like "Review pricing" or "View customers"

Respond ONLY with valid JSON array, no markdown, no preamble:
[
  {
    "id": "insight_1",
    "type": "critical|warning|opportunity|win",
    "title": "...",
    "body": "...",
    "action": "...",
    "metric": "...",
    "priority": 1
  },
  ...
]`

    const rawText = await callHeavyAI(undefined, prompt)
    const raw = rawText || '[]'

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const insights: AIInsight[] = JSON.parse(clean)

    // Sort by priority
    insights.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({ insights, provider: 'lucrum-ai' })
  } catch (error: any) {
    console.error('[ai/insights] error:', error)
    return NextResponse.json({
      insights: buildFallbackInsights(context),
      provider: 'fallback',
    })
  }
}
