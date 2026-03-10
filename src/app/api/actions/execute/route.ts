import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import { writeAuditEntry } from '@/lib/audit-log'
import { callHeavyAI } from '@/lib/ai-client'

const DESTRUCTIVE_ACTIONS = new Set(['cancel_subscription', 'update_price'])

type ExecuteBody = {
  actionType: string
  params: Record<string, any>
  userConfirmed: boolean
  confirmText?: string
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as ExecuteBody
  const { actionType, params, userConfirmed, confirmText } = body

  if (!actionType || !userConfirmed) {
    return NextResponse.json({ error: 'Action type and confirmation required' }, { status: 400 })
  }

  if (DESTRUCTIVE_ACTIONS.has(actionType) && confirmText !== 'CONFIRM') {
    return NextResponse.json({ error: 'Destructive actions require typing CONFIRM' }, { status: 400 })
  }

  const stripeKey = getStripeKeyFromCookies(req.cookies, userId)
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not connected' }, { status: 401 })
  }

  const stripe = createStripeClient(stripeKey)
  const executedAt = new Date().toISOString()
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
        const { customerId, couponId, percentOff, duration } = params
        let activeCouponId = couponId
        if (!activeCouponId && percentOff) {
          const coupon = await stripe.coupons.create({
            percent_off: percentOff,
            duration: duration || 'once',
          })
          activeCouponId = coupon.id
        }
        if (customerId && activeCouponId) {
          await stripe.customers.update(customerId, {
            coupon: activeCouponId,
          } as any)
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
        const { subscriptionId } = params
        const sub = await stripe.subscriptions.cancel(subscriptionId)
        result = { subscriptionId: sub.id, status: sub.status }
        if (typeof sub.customer === 'string') affectedCustomers = [sub.customer]
        success = true
        break
      }

      case 'create_coupon': {
        const { percentOff, amountOff, currency, duration, name } = params
        const coupon = await stripe.coupons.create({
          ...(percentOff ? { percent_off: percentOff } : {}),
          ...(amountOff ? { amount_off: amountOff, currency: currency || 'usd' } : {}),
          duration: duration || 'once',
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
            } catch {
              // Skip individual failures
            }
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
        const payout = await stripe.payouts.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
        })
        result = { payoutId: payout.id, status: payout.status, amount: payout.amount / 100 }
        success = true
        break
      }

      case 'update_price': {
        const { priceId, newAmount } = params
        const oldPrice = await stripe.prices.retrieve(priceId)
        const newPrice = await stripe.prices.create({
          product: typeof oldPrice.product === 'string' ? oldPrice.product : (oldPrice.product as any).id,
          unit_amount: Math.round(newAmount * 100),
          currency: oldPrice.currency,
          recurring: oldPrice.recurring ? { interval: oldPrice.recurring.interval } : undefined,
        })
        await stripe.prices.update(priceId, { active: false })
        result = { oldPriceId: priceId, newPriceId: newPrice.id, newAmount }
        success = true
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 })
    }
  } catch (err: any) {
    result = { error: err.message, stripeRequestId: err.requestId }
    success = false
  }

  await writeAuditEntry({
    userId,
    actionType,
    category: actionType.split('_')[0] ?? 'action',
    params,
    result,
    success,
    revenueImpact,
    affectedCustomers,
    maxRecommended: true,
    executedAt,
    stripeRequestId: result.stripeRequestId,
  })

  return NextResponse.json({ success, result, revenueImpact, affectedCustomers })
}
