import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStripeClient } from '@/lib/stripe-connection'
import { parseCommand } from '@/lib/command-parser'
import { executeCommand } from '@/lib/command-executor'
import { recordOutcome } from '@/lib/outcome-tracker'
import { getUserPlan } from '@/lib/subscription'
import { safeKvGet } from '@/lib/kv'
import type { CFOContext, StripeMetrics, StripeCustomer } from '@/types'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId)
  if (plan === 'demo') {
    return NextResponse.json({
      error: 'Natural language commands require a Solo or higher plan',
      paywallRequired: true,
      requiredPlan: 'solo',
    }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    input?: string
    confirmed?: boolean
    context?: Partial<CFOContext>
    metrics?: StripeMetrics
    customers?: StripeCustomer[]
    holdToken?: string
  }

  const { input, confirmed, context, metrics, customers, holdToken } = body

  if (!input?.trim()) {
    return NextResponse.json({ error: 'No command provided' }, { status: 400 })
  }

  const stripeClient = await getStripeClient(userId)
  if (!stripeClient) {
    return NextResponse.json({ 
      error: 'Stripe not connected',
      action: 'connect',
      connectUrl: '/api/stripe/connect'
    }, { status: 401 })
  }

  try {
    const parsedContext: Partial<CFOContext> = context ?? {
      mrr: metrics?.mrr ?? 0,
      activeSubscriptions: metrics?.activeSubscriptions ?? 0,
      churnRate: metrics?.churnRate ?? 0,
      runway: metrics?.runway ?? 0,
      availableBalance: metrics?.availableBalance ?? 0,
      estimatedMonthlyBurn: metrics?.estimatedMonthlyBurn ?? 0,
      failedPaymentsValue: metrics?.failedPaymentsValue ?? 0,
      failedPaymentsCount: metrics?.failedPaymentsCount ?? 0,
    }

    const parsedCommand = await parseCommand(input, parsedContext)

    if (parsedCommand.intent === 'unknown') {
      return NextResponse.json({
        success: false,
        parsed: parsedCommand,
        message: parsedCommand.confidence < 0.6
          ? `I didn't understand that command. Try:\n• "recover failed payments"\n• "raise prices 10%"\n• "show churn risk customers"\n• "forecast my runway"`
          : 'Unknown command intent.',
        suggestions: [
          'recover failed payments',
          'raise prices 10%',
          'show churn risks',
          'forecast my runway',
        ],
      })
    }

    if (parsedCommand.requiresConfirmation && !confirmed) {
      const result = await executeCommand(
        parsedCommand,
        metrics ?? {} as StripeMetrics,
        customers ?? [],
        userId,
        stripeClient,
        { holdToken }
      )

      return NextResponse.json({
        success: true,
        parsed: parsedCommand,
        result,
        requiresConfirmation: true,
        confirmationPrompt: result.confirmationPrompt,
      })
    }

    const result = await executeCommand(
      parsedCommand,
      metrics ?? {} as StripeMetrics,
      customers ?? [],
      userId,
      stripeClient,
      { holdToken }
    )

    if (result.success && result.estimatedImpact && result.estimatedImpact > 0) {
      try {
        await recordOutcome(
          userId,
          parsedCommand.intent,
          result.estimatedImpact,
          parsedCommand.intent === 'recover_payments' ? 'payment_recovered' :
          parsedCommand.intent === 'churn_recovery' ? 'churn_prevented' :
          parsedCommand.intent === 'expand_customer' ? 'revenue_expanded' :
          'email_sent'
        )
      } catch (err) {
        console.error('[commands] outcome recording failed:', err)
      }
    }

    return NextResponse.json({
      success: result.success,
      parsed: parsedCommand,
      result,
      requiresConfirmation: result.requiresUserConfirmation,
      confirmationPrompt: result.confirmationPrompt,
    })
  } catch (error: any) {
    console.error('[commands] error:', error)
    return NextResponse.json(
      { error: 'Command execution failed', details: error.message },
      { status: 500 }
    )
  }
}
