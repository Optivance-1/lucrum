import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStripeClient } from '@/lib/stripe-connection'
import { detectLeaks, calculateTotalRecoverable } from '@/lib/revenue-leak-detector'
import { getUserPlan } from '@/lib/subscription'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { recordOutcome } from '@/lib/outcome-tracker'
import type { StripeMetrics, StripeCustomer, RevenueLeak } from '@/types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId)
  if (plan === 'demo') {
    return NextResponse.json({
      error: 'Revenue Leak Detection requires a Solo or higher plan',
      paywallRequired: true,
      requiredPlan: 'solo',
    }, { status: 403 })
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

    const metricsCache = await safeKvGet<StripeMetrics>(`metrics:${userId}`)
    const customersCache = await safeKvGet<StripeCustomer[]>(`customers:${userId}`)

    const metrics = metricsCache ?? {
      mrr: 0,
      activeSubscriptions: 0,
      estimatedMonthlyBurn: 0,
    } as StripeMetrics

    const customers = customersCache ?? []

    const leaks = await detectLeaks(metrics, customers, stripeClient, userId)
    const totalRecoverable = calculateTotalRecoverable(leaks)

    const autoFixEnabled = await safeKvGet<boolean>(`autofix:${userId}`)

    return NextResponse.json({
      leaks,
      totalRecoverable,
      totalRecoverableARR: totalRecoverable * 12,
      leakCount: leaks.length,
      autoFixEnabled: plan === 'enterprise' && autoFixEnabled === true,
      canEnableAutoFix: plan === 'enterprise',
      detectedAt: Date.now(),
    })
  } catch (error: any) {
    console.error('[revenue/leaks] error:', error)
    return NextResponse.json(
      { error: 'Failed to detect revenue leaks', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId)
  if (plan === 'demo') {
    return NextResponse.json({
      error: 'Revenue Leak Detection requires a Solo or higher plan',
      paywallRequired: true,
      requiredPlan: 'solo',
    }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    leakId?: string
    confirmed?: boolean
    enableAutoFix?: boolean
  }

  const stripeClient = await getStripeClient(userId)
  if (!stripeClient) {
    return NextResponse.json({ 
      error: 'Stripe not connected',
      action: 'connect',
      connectUrl: '/api/stripe/connect'
    }, { status: 401 })
  }

  if (body.enableAutoFix !== undefined) {
    if (plan !== 'enterprise') {
      return NextResponse.json({
        error: 'Auto-fix requires Enterprise plan',
        paywallRequired: true,
        requiredPlan: 'enterprise',
      }, { status: 403 })
    }

    await safeKvSet(`autofix:${userId}`, body.enableAutoFix)
    return NextResponse.json({
      success: true,
      autoFixEnabled: body.enableAutoFix,
      message: body.enableAutoFix
        ? 'Auto-fix enabled. High-priority leaks (failed payments) will be automatically recovered.'
        : 'Auto-fix disabled.',
    })
  }

  if (!body.leakId) {
    return NextResponse.json({ error: 'leakId required' }, { status: 400 })
  }

  if (!body.confirmed) {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  try {
    const leaksCache = await safeKvGet<{ leaks: RevenueLeak[] }>(`leaks:${userId}`)
    const leak = leaksCache?.leaks.find(l => l.id === body.leakId)

    if (!leak) {
      return NextResponse.json({ error: 'Leak not found' }, { status: 404 })
    }

    let result: any = {}
    let success = false
    let recovered = 0

    switch (leak.actionType) {
      case 'retry_payment': {
        const invoiceIds = leak.actionParams.invoiceIds ?? []
        for (const invoiceId of invoiceIds) {
          try {
            const paid = await stripeClient.invoices.pay(invoiceId)
            if (paid.status === 'paid') {
              recovered += (paid.amount_paid ?? 0) / 100
            }
          } catch {
            // Continue with other invoices
          }
        }
        result = { recovered, attemptCount: invoiceIds.length }
        success = recovered > 0
        break
      }

      case 'apply_coupon': {
        const { percentOff, durationMonths, customerIds } = leak.actionParams
        const coupon = await stripeClient.coupons.create({
          percent_off: percentOff ?? 20,
          duration: 'repeating',
          duration_in_months: durationMonths ?? 1,
          name: 'Retention Offer',
        })
        
        let applied = 0
        for (const customerId of customerIds ?? []) {
          try {
            await stripeClient.customers.update(customerId, { coupon: coupon.id } as any)
            applied++
          } catch {
            // Continue with other customers
          }
        }
        result = { couponId: coupon.id, applied }
        success = applied > 0
        break
      }

      case 'send_email': {
        result = {
          template: leak.actionParams.template,
          queued: leak.affectedCount,
          status: 'queued',
        }
        success = true
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${leak.actionType}` }, { status: 400 })
    }

    if (success) {
      const outcomeCategory = 
        leak.category === 'failed_payments' ? 'payment_recovered' :
        leak.category === 'dunning_risk' ? 'churn_prevented' :
        leak.category === 'expansion_ready' ? 'revenue_expanded' :
        'email_sent'

      await recordOutcome(
        userId,
        leak.actionType,
        recovered || leak.estimatedMRRImpact,
        outcomeCategory
      )

      await safeKvSet(`leaks:${userId}`, null)
    }

    return NextResponse.json({
      success,
      result,
      leakId: body.leakId,
      recovered,
      message: success
        ? `Successfully addressed ${leak.title}. ${recovered > 0 ? `Recovered $${recovered.toLocaleString()}.` : ''}`
        : 'Action failed. Please try again.',
    })
  } catch (error: any) {
    console.error('[revenue/leaks] fix error:', error)
    return NextResponse.json(
      { error: 'Failed to fix leak', details: error.message },
      { status: 500 }
    )
  }
}
