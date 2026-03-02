import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CFOContext } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { question, context }: { question: string; context?: Partial<CFOContext> } = await req.json()

    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const ctx = context ?? {}

    const system = `You are Lucrum's AI CFO — a sharp, direct financial advisor for indie hackers, micro-SaaS founders, and AI builders.

You speak like a brilliant CFO who's also been a founder — blunt, practical, data-driven, zero fluff. Give specific, actionable advice. Never hedge excessively. Always use the real numbers when available.

LIVE FINANCIAL DATA FOR THIS BUSINESS:
- MRR: $${ctx.mrr ?? 'unknown'} (${ctx.mrrGrowth != null ? (ctx.mrrGrowth > 0 ? '+' : '') + ctx.mrrGrowth + '% MoM' : 'growth unknown'})
- 30-day Revenue: $${ctx.revenue30d ?? 'unknown'}
- Revenue Growth: ${ctx.revenueGrowth != null ? (ctx.revenueGrowth > 0 ? '+' : '') + ctx.revenueGrowth + '%' : 'unknown'}
- Active Subscriptions: ${ctx.activeSubscriptions ?? 'unknown'}
- New Subscriptions (30d): ${ctx.newSubscriptions30d ?? 'unknown'}
- Churn Rate: ${ctx.churnRate ?? 'unknown'}%
- New Customers (30d): ${ctx.newCustomers30d ?? 'unknown'}
- Available Cash: $${ctx.availableBalance ?? 'unknown'}
- Cash Runway: ${ctx.runway === 9999 ? 'Profitable / infinite' : (ctx.runway ?? 'unknown') + ' days'}
- Cancelled Subs (30d): ${ctx.cancelledSubscriptions30d ?? 'unknown'}

RESPONSE RULES:
1. Under 130 words unless a breakdown is genuinely required
2. Reference the actual numbers above when they're relevant
3. Sound like a human texting, not a report generator
4. If data is missing, say exactly what you'd need to answer better
5. Never start with "Great question" or any fluff opener`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 350,
      system,
      messages: [{ role: 'user', content: question }],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('[ai/cfo] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
