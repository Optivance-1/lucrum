import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callHeavyAI } from '@/lib/ai-client'
import { getStripeKeyFromCookies, createStripeClient } from '@/lib/stripe'

type PreviewBody = {
  actionType: string
  params: Record<string, any>
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as PreviewBody
  const { actionType, params } = body

  if (!actionType) {
    return NextResponse.json({ error: 'actionType required' }, { status: 400 })
  }

  const stripeKey = getStripeKeyFromCookies(req.cookies, userId)
  const stripe = stripeKey ? createStripeClient(stripeKey) : null

  let preview: Record<string, any> = {}

  try {
    switch (actionType) {
      case 'send_email': {
        const emailBody = await callHeavyAI(
          'You are Lucrum MAX. Generate a professional, empathetic email for this scenario. Keep it under 150 words. Return just the email text.',
          `Template: ${params.template || 'custom'}. Context: ${JSON.stringify(params)}`
        )
        preview = {
          subject: params.subject || `Re: ${params.template || 'your account'}`,
          body: emailBody,
          recipientCount: params.customerId ? 1 : (params.customerCount ?? 'batch'),
        }
        break
      }

      case 'apply_coupon': {
        preview = {
          percentOff: params.percentOff || 0,
          duration: params.duration || 'once',
          estimatedMRRImpact: params.percentOff
            ? `-${params.percentOff}% on next invoice`
            : 'No impact calculated',
        }
        break
      }

      case 'retry_payment': {
        if (stripe) {
          const openInvoices = await stripe.invoices.list({ status: 'open', limit: 20 })
          const totalAtRisk = openInvoices.data.reduce(
            (sum, inv) => sum + (inv.amount_due ?? 0) / 100, 0
          )
          preview = {
            invoiceCount: openInvoices.data.length,
            totalAtRisk,
            estimatedRecovery: Math.round(totalAtRisk * 0.4),
          }
        } else {
          preview = { message: 'Connect Stripe to preview' }
        }
        break
      }

      case 'update_price': {
        const liftPct = params.liftPercent || 10
        preview = {
          liftPercent: liftPct,
          note: `New subscribers will see a ${liftPct}% price increase. Existing subs are unaffected until renewal.`,
        }
        break
      }

      case 'trigger_payout': {
        if (stripe) {
          const balance = await stripe.balance.retrieve()
          const available = balance.available.reduce((s, b) => s + b.amount, 0) / 100
          preview = {
            availableBalance: available,
            requestedAmount: params.amount,
            willSucceed: available >= (params.amount || 0),
          }
        } else {
          preview = { message: 'Connect Stripe to preview' }
        }
        break
      }

      case 'cancel_subscription':
      case 'pause_subscription': {
        if (stripe && params.subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(params.subscriptionId)
          const monthlyValue = sub.items.data.reduce((sum: number, item: any) => {
            const price = item.price
            const qty = item.quantity ?? 1
            const unit = price.unit_amount ?? 0
            if (price.recurring?.interval === 'month') return sum + unit * qty
            if (price.recurring?.interval === 'year') return sum + (unit * qty) / 12
            return sum
          }, 0) / 100
          preview = {
            subscriptionId: sub.id,
            status: sub.status,
            monthlyValue,
            action: actionType === 'cancel_subscription' ? 'Will cancel immediately' : 'Will pause billing',
          }
        } else {
          preview = { message: 'Provide subscription ID to preview' }
        }
        break
      }

      default:
        preview = { message: `No preview available for ${actionType}` }
    }
  } catch (err: any) {
    preview = { error: err.message }
  }

  return NextResponse.json({ actionType, preview })
}
