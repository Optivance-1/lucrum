import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { CFOContext, StripeMetrics, StripeCustomer } from '@/types'
import { callChatAI, callHeavyAI, callGLM5AI } from '@/lib/ai-client'
import {
  getUserPlan,
  getDemoQuestionsUsed,
  incrementDemoQuestions,
  getDemoQuestionsUsedAnon,
  usesPriorityAI,
} from '@/lib/subscription'
import { getEligibleAffiliates } from '@/lib/affiliates'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { parseCommand, isLikelyCommand } from '@/lib/command-parser'
import { executeCommand } from '@/lib/command-executor'
import { getStripeClient } from '@/lib/stripe-connection'

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
    if (runway == null) return 'Cash timing data is incomplete. Track payouts, refunds, and fixed costs daily so runway projections stop guessing.'
    if (runway < 90) return `You have about ${runway} days of runway. Freeze non-core spend and cut one expense this week to extend runway before you chase growth.`
    return `You have roughly ${runway} days of runway. Keep burn disciplined and push one high-confidence growth channel instead of broad experimentation.`
  }
  if (/price|pricing|raise/.test(q)) {
    if (churn != null && churn > 6) return `Don't raise prices yet. Churn is ${churn}%, so improve retention first or you'll leak customers faster than pricing lifts MRR.`
    if (mrr != null && growth != null) return `Test a controlled 8-12% price lift on new signups. MRR is $${mrr} with ${growth}% MoM growth, so run the test and watch churn for 2 billing cycles.`
  }
  if (/churn|cancel/.test(q)) return `Focus on saves before acquisition. Current churn is ${fmtNumber(churn, '%')}; trigger win-back offers for at-risk accounts and audit failed-payment recovery weekly.`
  return `Current snapshot: MRR $${fmtNumber(mrr)}, 30-day revenue $${fmtNumber(revenue)}, runway ${fmtNumber(runway, ' days')}. Pick one lever this week: cut low-ROI spend, improve retention, or test pricing on new users only.`
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  const payload = await req.json().catch(() => ({})) as {
    question?: string
    context?: Partial<CFOContext>
    metrics?: StripeMetrics
    customers?: StripeCustomer[]
    confirmed?: boolean
  }
  const question = payload.question ?? ''
  const context = payload.context
  const confirmed = payload.confirmed ?? false

  try {
    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const ctx = context ?? {}

    // Command detection: check if this looks like a command and try to parse it
    if (userId && isLikelyCommand(question)) {
      const plan = await getUserPlan(userId)
      if (plan !== 'demo') {
        const parsedCommand = await parseCommand(question, ctx)
        
        if (parsedCommand.confidence > 0.7 && parsedCommand.intent !== 'unknown') {
          const stripeClient = await getStripeClient(userId)
          
          if (stripeClient) {
            const metrics = payload.metrics ?? await safeKvGet<StripeMetrics>(`metrics:${userId}`) ?? {} as StripeMetrics
            const customers = payload.customers ?? await safeKvGet<StripeCustomer[]>(`customers:${userId}`) ?? []
            
            const result = await executeCommand(
              parsedCommand,
              metrics,
              customers,
              userId,
              stripeClient,
              {}
            )
            
            // Format command result as chat response
            const commandResponse = {
              answer: result.message,
              provider: 'lucrum-command',
              plan,
              isCommand: true,
              commandIntent: parsedCommand.intent,
              commandResult: result,
              requiresConfirmation: result.requiresUserConfirmation,
              confirmationPrompt: result.confirmationPrompt,
            }
            
            return NextResponse.json(commandResponse)
          }
        }
      }
    }

    // ── Unauthenticated demo user ──────────────────────────────
    if (!userId) {
      const cookieVal = req.cookies.get('demo_questions')?.value
      const used = getDemoQuestionsUsedAnon(cookieVal)
      if (used >= 1) {
        return NextResponse.json({
          paywallRequired: true,
          answer: null,
          message: 'Your free question has been used. Pick a plan to keep talking to MAX.',
          plan: 'demo',
        }, { status: 402 })
      }

      const answer = await callChatAI(buildSystemPrompt(ctx), question)
      const res = NextResponse.json({
        answer,
        provider: 'lucrum-ai',
        plan: 'demo',
        demoQuestionsRemaining: 0,
      })
      res.cookies.set('demo_questions', '1', { maxAge: 30 * 86400, path: '/' })
      return res
    }

    // ── Authenticated user ─────────────────────────────────────
    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      const used = await getDemoQuestionsUsed(userId)
      if (used >= 1) {
        return NextResponse.json({
          paywallRequired: true,
          answer: null,
          message: 'Your free question has been used. Pick a plan to keep talking to MAX.',
          plan: 'demo',
        }, { status: 402 })
      }

      const answer = await callChatAI(buildSystemPrompt(ctx), question)
      await incrementDemoQuestions(userId)
      return NextResponse.json({
        answer,
        provider: 'lucrum-ai',
        plan: 'demo',
        demoQuestionsRemaining: 0,
      })
    }

    // Solo/Growth: 5 prompts/day, Enterprise: unlimited
    if (plan === 'solo' || plan === 'growth') {
      const day = new Date().toISOString().slice(0, 10)
      const rateKey = `cfo_rate:${userId}:${day}`
      const count = (await safeKvGet<number>(rateKey)) ?? 0
      if (count >= 5) {
        return NextResponse.json({
          answer: 'You\'ve used your 5 MAX prompts for today. Upgrade to Enterprise for unlimited prompts, or come back tomorrow.',
          provider: 'fallback',
          plan,
          limitReached: true,
        })
      }
      await safeKvSet(rateKey, count + 1, 172800)
    }

    const aiCall = usesPriorityAI(plan) ? callGLM5AI : callChatAI
    const systemPrompt = usesPriorityAI(plan) ? buildEnterpriseSystemPrompt(ctx) : buildSystemPrompt(ctx)
    const answer = await aiCall(systemPrompt, question, { userId, plan })

    return NextResponse.json({ answer, provider: 'lucrum-ai', plan })
  } catch (error: any) {
    console.error('[ai/cfo] error:', error)
    return NextResponse.json({
      answer: buildFallbackAnswer(question, context ?? {}),
      provider: 'fallback',
    })
  }
}

function buildSystemPrompt(ctx: Partial<CFOContext>): string {
  let benchmarkSection = ''
  if (ctx.accountAgeDays != null && ctx.accountAgeDays < 60 && ctx.benchmarks) {
    const b = ctx.benchmarks
    benchmarkSection = `\n\nPEER BENCHMARKS (for companies at similar age):
- Median MRR: $${b.medianMRR} | P25: $${b.p25MRR} | P75: $${b.p75MRR}
- Median Growth: ${b.medianGrowthRate ?? 'N/A'}% MoM
- Median Churn: ${b.medianChurnRate ?? 'N/A'}%
- Top Performer MRR: $${b.topPerformerMRR}
Use these benchmarks to contextualize advice for this NEW founder (Day ${ctx.accountAgeDays}).`
  }

  const affiliateMetrics = {
    mrr: ctx.mrr ?? 0, runway: ctx.runway ?? 365, churnRate: ctx.churnRate ?? 0,
    accountAgeDays: ctx.accountAgeDays ?? 365, revenue30d: ctx.revenue30d ?? 0,
  }
  const eligibleAffiliates = getEligibleAffiliates(affiliateMetrics)
  let affiliateSection = ''
  if (eligibleAffiliates.length > 0) {
    const list = eligibleAffiliates.map(a => `- ${a.name}: ${a.maxRecommendationContext}`).join('\n')
    affiliateSection = `\n\nRELEVANT FINANCIAL PRODUCTS (mention at most 1 if naturally relevant):
${list}
If you mention a product, include an action block:
\`\`\`affiliate
{"productId":"${eligibleAffiliates[0].id}","name":"${eligibleAffiliates[0].name}","cta":"${eligibleAffiliates[0].ctaText}","url":"${eligibleAffiliates[0].affiliateUrl}"}
\`\`\``
  }

  let simulationSection = ''
  if (ctx.simulation) {
    const sim = ctx.simulation
    simulationSection = `\n\nMONTE CARLO SIMULATION (50,000 runs):
Median runway: ${Math.round(sim.runway.p50)} days
Survival at 180 days: ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}%
Risk score: ${sim.riskScore}/100
MRR in 12 months (median): $${Math.round(sim.mrrForecast.month12.p50)}
${ctx.topMove ? `\nTOP RECOMMENDED MOVE: ${ctx.topMove.title}\n${ctx.topMove.maxStatement}` : ''}
When founders ask what to do, reference the simulation. Say '50,000 simulations show...' not 'I think...'. Give probability-weighted answers, not opinions.`
  }

  return `You are Lucrum's AI CFO — a sharp, direct financial advisor for indie hackers, micro-SaaS founders, and AI builders.

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
${benchmarkSection}${simulationSection}
RESPONSE RULES:
1. Under 130 words unless a breakdown is genuinely required
2. Reference the actual numbers above when they're relevant
3. Sound like a human texting, not a report generator
4. If data is missing, say exactly what you'd need to answer better
5. Never start with "Great question" or any fluff opener

ACTION EXECUTION:
When you recommend a specific Stripe action the user can take, include an action block:
\`\`\`action
{"actionType":"retry_payment|send_email|apply_coupon|pause_subscription|cancel_subscription|create_coupon|trigger_payout|update_price","title":"Short action title","params":{}}
\`\`\`
Only include action blocks for concrete, executable actions. Max 1 per response.${affiliateSection}`
}

function buildEnterpriseSystemPrompt(ctx: Partial<CFOContext>): string {
  const base = buildSystemPrompt(ctx)
  return `${base}

ADVANCED ANALYSIS CAPABILITY:
You have access to 50,000 Monte Carlo simulation results, decision scoring across 8 action types, and full customer cohort data. Do not give surface-level advice. Go deep. Identify second-order effects. When a founder asks about churn — also consider what that churn rate implies about product-market fit, pricing elasticity, and which customer segment is leaving. Connect the dots between metrics that most CFOs miss. You are not a chatbot. You are a strategic operator.

ENTERPRISE DEEP ANALYSIS MODE:
You are running on GLM-5, a 744B parameter model. Use your full reasoning capacity.
When a founder asks any question:
1. Answer directly in the first sentence
2. Give the second-order implication in sentence 2
3. Give one specific number they should track
4. If action is warranted, include an action block`
}
