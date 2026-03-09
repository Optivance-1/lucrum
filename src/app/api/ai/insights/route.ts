import { NextRequest, NextResponse } from 'next/server'
import type { CFOContext, AIInsight } from '@/types'
import { generateAIText } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const context: CFOContext = await req.json()

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

    const result = await generateAIText({
      prompt,
      maxTokens: 800,
      temperature: 0.25,
      jsonMode: true,
    })

    const raw = result.text || '[]'

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const insights: AIInsight[] = JSON.parse(clean)

    // Sort by priority
    insights.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({ insights })
  } catch (error: any) {
    console.error('[ai/insights] error:', error)
    // Return safe fallback insights instead of crashing the dashboard
    return NextResponse.json({
      insights: [
        {
          id: 'fallback_1',
          type: 'opportunity',
          title: 'AI insights loading...',
          body: 'Connect a Gemini or Anthropic API key to enable AI-powered financial insights.',
          action: 'Add API key',
          metric: null,
          priority: 1,
        },
      ],
    })
  }
}
