import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { CFOContext } from '@/types'
import { callChatAI } from '@/lib/ai-client'
import { getUserPlan } from '@/lib/subscription'

function fmtNumber(value: number | undefined, suffix = ''): string {
  if (value == null || Number.isNaN(value)) return 'unknown'
  return `${value}${suffix}`
}

function buildFallbackAnswer(question: string, ctx: Partial<CFOContext>): string {
  const q = question.toLowerCase()
  const runway = ctx.runway
  const churn = ctx.churnRate
  const mrr = ctx.mrr
  const growth = ctx.mrrGrowth
  const revenue = ctx.revenue30d

  if (/runway|cash|burn/.test(q)) {
    if (runway == null) {
      return 'Cash timing data is incomplete. Track payouts, refunds, and fixed costs daily so runway projections stop guessing.'
    }
    if (runway < 90) {
      return `You have about ${runway} days of runway. Freeze non-core spend and cut one expense this week to extend runway before you chase growth.`
    }
    return `You have roughly ${runway} days of runway. Keep burn disciplined and push one high-confidence growth channel instead of broad experimentation.`
  }

  if (/price|pricing|raise/.test(q)) {
    if (churn != null && churn > 6) {
      return `Don't raise prices yet. Churn is ${churn}%, so improve retention first or you'll leak customers faster than pricing lifts MRR.`
    }
    if (mrr != null && growth != null) {
      return `Test a controlled 8-12% price lift on new signups. MRR is $${mrr} with ${growth}% MoM growth, so run the test and watch churn for 2 billing cycles.`
    }
  }

  if (/churn|cancel/.test(q)) {
    return `Focus on saves before acquisition. Current churn is ${fmtNumber(churn, '%')}; trigger win-back offers for at-risk accounts and audit failed-payment recovery weekly.`
  }

  return `Current snapshot: MRR $${fmtNumber(mrr)}, 30-day revenue $${fmtNumber(revenue)}, runway ${fmtNumber(runway, ' days')}. Pick one lever this week: cut low-ROI spend, improve retention, or test pricing on new users only.`
}

function buildFreePlanAnswer(question: string, ctx: Partial<CFOContext>): string {
  const prompt = question.trim() ? `You asked: "${question.trim()}". ` : ''
  return `${prompt}Free plan gives you the dashboard and limited guidance only. You currently have MRR $${fmtNumber(ctx.mrr)} and churn ${fmtNumber(ctx.churnRate, '%')}. Upgrade to Pro to unlock full MAX CFO answers, deeper retention analysis, and action-ready recommendations.`
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json().catch(() => ({})) as {
    question?: string
    context?: Partial<CFOContext>
  }
  const question = payload.question ?? ''
  const context = payload.context

  try {
    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const ctx = context ?? {}
    const plan = await getUserPlan(userId)

    if (plan === 'free') {
      return NextResponse.json({
        answer: buildFreePlanAnswer(question, ctx),
        provider: 'fallback',
        plan,
      })
    }

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

    const answer = await callChatAI(system, question)

    return NextResponse.json({ answer, provider: 'lucrum-ai', plan })
  } catch (error: any) {
    console.error('[ai/cfo] error:', error)
    return NextResponse.json({
      answer: buildFallbackAnswer(question, context ?? {}),
      provider: 'fallback',
    })
  }
}
