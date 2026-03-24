import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStripeClient, canExecuteActions, needsScopeUpgrade, getStripeConnection } from '@/lib/stripe-connection'
import { writeAuditEntry, updateAuditEntry } from '@/lib/audit-log'
import { recordOutcome } from '@/lib/outcome-tracker'
import { callHeavyAI } from '@/lib/ai-client'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { getUserPlan, canUseActionExecution } from '@/lib/subscription'
import { recordDataPoint } from '@/lib/benchmark-dataset'
import type { OutcomeCategory, CFOContext, StripeMetrics } from '@/types'

const stripeObjectIdFromResult = (r: Record<string, unknown>): string | null => {
  if (typeof r.id === 'string') return r.id
  const keys = ['invoiceId', 'payoutId', 'subscriptionId', 'couponId'] as const
  for (const k of keys) {
    const v = r[k]
    if (typeof v === 'string') return v
  }
  return null
}

const DESTRUCTIVE_ACTIONS = new Set(['cancel_subscription', 'pause_subscription', 'trigger_payout', 'update_price'])

type ExecuteBody = {
  actionType: string
  params: Record<string, any>
  userConfirmed: boolean
  confirmText?: string
}

async function checkRateLimit(userId: string, actionType: string): Promise<string | null> {
  const hour = new Date().toISOString().slice(0, 13)
  const day = new Date().toISOString().slice(0, 10)

  if (actionType === 'send_email') {
    const key = `rate:email:${userId}:${hour}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 50) return 'Email rate limit: max 50/hour. Try again later.'
    await safeKvSet(key, count + 1, 7200)
  }

  if (['cancel_subscription', 'pause_subscription', 'update_price', 'apply_coupon'].includes(actionType)) {
    const key = `rate:sub:${userId}:${hour}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 10) return 'Subscription action rate limit: max 10/hour.'
    await safeKvSet(key, count + 1, 7200)
  }

  if (actionType === 'trigger_payout') {
    const key = `rate:payout:${userId}:${day}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 3) return 'Payout rate limit: max 3/day.'
    await safeKvSet(key, count + 1, 172800)
  }

  return null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId)
  if (!canUseActionExecution(plan)) {
    return NextResponse.json({
      error: 'Action Execution requires a Growth or Enterprise plan',
      paywallRequired: true,
      requiredPlan: 'growth',
    }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as ExecuteBody
  const { actionType, params, userConfirmed, confirmText } = body

  if (!actionType || !userConfirmed) {
    return NextResponse.json({ error: 'Action type and confirmation required' }, { status: 400 })
  }

  if (DESTRUCTIVE_ACTIONS.has(actionType) && confirmText !== 'CONFIRM') {
    return NextResponse.json({ error: 'Destructive actions require typing CONFIRM' }, { status: 400 })
  }

  const rateLimitMsg = await checkRateLimit(userId, actionType)
  if (rateLimitMsg) {
    return NextResponse.json({ error: rateLimitMsg }, { status: 429 })
  }

  const canExecute = await canExecuteActions(userId)
  if (!canExecute) {
    const needsUpgrade = await needsScopeUpgrade(userId)
    if (needsUpgrade) {
      return NextResponse.json({
        error: 'scope_upgrade_required',
        message: 'Please reconnect Stripe to enable action execution.',
        reconnectUrl: '/api/stripe/connect?plan=enterprise&upgrade=true'
      }, { status: 403 })
    }
  }

  const stripe = await getStripeClient(userId)
  if (!stripe) {
    return NextResponse.json({ 
      error: 'Stripe not connected',
      action: 'connect',
      connectUrl: '/api/stripe/connect'
    }, { status: 401 })
  }
  const executedAt = new Date().toISOString()

  const pendingEntry = await writeAuditEntry({
    userId,
    actionType,
    category: actionType.split('_')[0] ?? 'action',
    params,
    result: {},
    success: false,
    affectedCustomers: [],
    maxRecommended: true,
    executedAt,
    status: 'pending',
  })

  let result: Record<string, any> = {}
  let success = false
  let revenueImpact: number | undefined
  let affectedCustomers: string[] = []

  try {
    switch (actionType) {
      case 'send_email': {
        const { customerId, subject, template } = params
        let emailBody = params.body ?? ''
        if (!emailBody && template) {
          emailBody = await callHeavyAI(
            'You are Lucrum MAX. Write a short, professional email for this template scenario. Keep it under 100 words.',
            `Template: ${template}. Customer: ${customerId || 'batch'}.`
          )
        }
        result = { emailBody, template, customerId, status: 'queued' }
        if (customerId) affectedCustomers = [customerId]
        success = true
        break
      }

      case 'apply_coupon': {
        const { customerId, couponId, percentOff, duration, durationMonths } = params
        let activeCouponId = couponId
        if (!activeCouponId && percentOff) {
          const coupon = await stripe.coupons.create({
            percent_off: percentOff,
            duration: duration || 'repeating',
            ...(durationMonths ? { duration_in_months: durationMonths } : {}),
          })
          activeCouponId = coupon.id
        }
        if (customerId && activeCouponId) {
          await stripe.customers.update(customerId, { coupon: activeCouponId } as any)
          affectedCustomers = [customerId]
        }
        result = { couponId: activeCouponId, customerId }
        success = true
        break
      }

      case 'pause_subscription': {
        const { subscriptionId } = params
        const sub = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: { behavior: 'void' },
        })
        result = { subscriptionId: sub.id, status: sub.status }
        if (typeof sub.customer === 'string') affectedCustomers = [sub.customer]
        success = true
        break
      }

      case 'cancel_subscription': {
        const { subscriptionId, immediately } = params
        const sub = immediately
          ? await stripe.subscriptions.cancel(subscriptionId)
          : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
        result = { subscriptionId: sub.id, status: sub.status }
        if (typeof sub.customer === 'string') affectedCustomers = [sub.customer]
        success = true
        break
      }

      case 'create_coupon': {
        const { percentOff, amountOff, currency, duration, name, durationMonths } = params
        const coupon = await stripe.coupons.create({
          ...(percentOff ? { percent_off: percentOff } : {}),
          ...(amountOff ? { amount_off: amountOff, currency: currency || 'usd' } : {}),
          duration: duration || 'once',
          ...(durationMonths ? { duration_in_months: durationMonths } : {}),
          ...(name ? { name } : {}),
        })
        result = { couponId: coupon.id }
        success = true
        break
      }

      case 'retry_payment': {
        const { invoiceId } = params
        if (invoiceId) {
          const invoice = await stripe.invoices.pay(invoiceId)
          result = { invoiceId: invoice.id, status: invoice.status, amount: invoice.amount_paid }
          revenueImpact = (invoice.amount_paid ?? 0) / 100
          if (typeof invoice.customer === 'string') affectedCustomers = [invoice.customer]
        } else {
          const openInvoices = await stripe.invoices.list({ status: 'open', limit: 20 })
          let recovered = 0
          for (const inv of openInvoices.data) {
            try {
              const paid = await stripe.invoices.pay(inv.id)
              recovered += (paid.amount_paid ?? 0) / 100
              if (typeof paid.customer === 'string') affectedCustomers.push(paid.customer)
            } catch { /* skip individual failures */ }
          }
          result = { retried: openInvoices.data.length, recovered }
          revenueImpact = recovered
        }
        success = true
        break
      }

      case 'create_invoice': {
        const { customerId, amount, description } = params
        const invoice = await stripe.invoices.create({ customer: customerId })
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round(amount * 100),
          currency: 'usd',
          description: description || 'Invoice from Lucrum',
        })
        const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
        result = { invoiceId: finalized.id, status: finalized.status }
        revenueImpact = amount
        affectedCustomers = [customerId]
        success = true
        break
      }

      case 'trigger_payout': {
        const { amount } = params
        const balance = await stripe.balance.retrieve()
        const available = balance.available.reduce((s, b) => s + b.amount, 0) / 100
        if (available < amount) {
          throw new Error(`Insufficient balance: $${available} available, $${amount} requested`)
        }
        const payout = await stripe.payouts.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
        })
        result = { payoutId: payout.id, status: payout.status, amount: payout.amount / 100 }
        success = true
        break
      }

      case 'update_price': {
        const { priceId, newAmount, productId, interval } = params
        if (priceId) {
          const oldPrice = await stripe.prices.retrieve(priceId)
          const newPrice = await stripe.prices.create({
            product: typeof oldPrice.product === 'string' ? oldPrice.product : (oldPrice.product as any).id,
            unit_amount: Math.round(newAmount * 100),
            currency: oldPrice.currency,
            recurring: oldPrice.recurring ? { interval: oldPrice.recurring.interval } : undefined,
          })
          await stripe.prices.update(priceId, { active: false })
          result = { oldPriceId: priceId, newPriceId: newPrice.id, newAmount }
        } else if (productId) {
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(newAmount * 100),
            currency: 'usd',
            recurring: interval ? { interval } : undefined,
          })
          result = { newPriceId: newPrice.id, newAmount }
        }
        success = true
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 })
    }
  } catch (err: any) {
    result = { error: err.message }
    success = false
  }

  await updateAuditEntry(userId, pendingEntry.id, {
    result,
    success,
    revenueImpact,
    affectedCustomers,
    status: success ? 'success' : 'failed',
    stripeRequestId: result.stripeRequestId,
    errorMessage: success ? undefined : result.error,
  })

  if (success) {
    try {
      let expectedImpact = 0
      let category: OutcomeCategory = 'email_sent'
      let stripeObjectId: string | undefined
      let stripeObjectType: string | undefined

      switch (actionType) {
        case 'retry_payment':
          expectedImpact = revenueImpact ?? 0
          category = 'payment_recovered'
          stripeObjectId = result.invoiceId ?? params.invoiceId
          stripeObjectType = 'invoice'
          break
        case 'send_email':
          expectedImpact = (params.customerMRR ?? 50) * 12 * 0.32
          category = 'churn_prevented'
          stripeObjectId = params.customerId
          stripeObjectType = 'customer'
          break
        case 'apply_coupon':
          expectedImpact = (params.customerMRR ?? 50) * 12 * 0.55
          category = 'churn_prevented'
          stripeObjectId = result.couponId
          stripeObjectType = 'subscription'
          break
        case 'cancel_subscription':
          expectedImpact = -(params.subscriptionMRR ?? 0) * 12
          category = 'churn_prevented'
          stripeObjectId = params.subscriptionId
          stripeObjectType = 'subscription'
          break
        case 'trigger_payout':
          expectedImpact = params.amount ?? 0
          category = 'runway_extended'
          stripeObjectId = result.payoutId
          stripeObjectType = 'payout'
          break
        case 'create_invoice':
          expectedImpact = params.amount ?? 0
          category = 'invoice_collected'
          stripeObjectId = result.invoiceId
          stripeObjectType = 'invoice'
          break
      }

      const outcomeRecord = await recordOutcome(userId, actionType, expectedImpact, category, stripeObjectId, stripeObjectType)

      const stripeConnection = await getStripeConnection(userId)
      if (stripeConnection) {
        await safeKvSet(
          `outcome_stripe_ref:${userId}`,
          JSON.stringify({
            accountId: stripeConnection.stripeAccountId,
            actionType,
            actionId: pendingEntry.id,
            executedAt: Date.now(),
            stripeObjectId: stripeObjectIdFromResult(result as Record<string, unknown>) ?? stripeObjectId ?? null,
          }),
          { ex: 60 * 60 * 24 * 45 },
        )
      }

      // Record anonymized data point for benchmark dataset (fire and forget)
      const metricsCache = await safeKvGet<StripeMetrics>(`metrics:${userId}`)
      if (metricsCache) {
        const contextAtDecision: Partial<CFOContext> = {
          mrr: metricsCache.mrr,
          mrrGrowth: metricsCache.mrrGrowth,
          churnRate: metricsCache.churnRate,
          runway: metricsCache.runway,
          availableBalance: metricsCache.availableBalance,
          activeSubscriptions: metricsCache.activeSubscriptions,
          accountAgeDays: metricsCache.accountAgeDays,
          estimatedMonthlyBurn: metricsCache.estimatedMonthlyBurn,
        }
        
        recordDataPoint(
          userId,
          actionType,
          contextAtDecision,
          metricsCache.simulation ?? null,
          outcomeRecord
        ).catch(err => console.error('[actions/execute] dataset recording failed:', err))
      }
    } catch (err) {
      console.error('[actions/execute] outcome recording failed:', err)
    }
  }

  return NextResponse.json({ success, result, revenueImpact, affectedCustomers })
}
