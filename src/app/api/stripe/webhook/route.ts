import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import { callHeavyAI } from '@/lib/ai-client'
import { writeAuditEntry } from '@/lib/audit-log'
import { sendEmailToUserId } from '@/lib/email'
import {
  markCustomerAtRisk,
  markMetricsInvalidated,
  resolveUserIdFromStripeEventObject,
} from '@/lib/user-state'

function formatCurrency(amount = 0, currency = 'usd'): string {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
}

async function buildAnalysis(prompt: string): Promise<string> {
  const text = await callHeavyAI(
    'You are MAX, Lucrum\'s revenue operator. Be concrete, concise, and action-oriented.',
    prompt
  )

  return text || 'MAX could not generate a tailored analysis right now. Reach out to the customer immediately and review recent payment or subscription changes.'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  try {
    const object = event.data.object as Record<string, any>
    const userId = await resolveUserIdFromStripeEventObject(object, event.account ?? null)

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        if (userId) {
          await markMetricsInvalidated(userId)
          await writeAuditEntry({
            userId,
            actionType: 'stripe.payment_intent.succeeded',
            category: 'stripe',
            params: { paymentIntentId: pi.id, customerId: pi.customer },
            result: { amount: pi.amount, currency: pi.currency, status: pi.status },
            success: true,
            affectedCustomers: typeof pi.customer === 'string' ? [pi.customer] : [],
            maxRecommended: false,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'charge.succeeded': {
        break
      }

      case 'charge.refunded': {
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        if (userId) {
          const analysis = await buildAnalysis(
            `A new subscription was created.\nSubscription ID: ${sub.id}\nCustomer: ${String(sub.customer)}\nStatus: ${sub.status}\nCreate a short fit analysis and one onboarding action.`
          )
          await sendEmailToUserId(
            userId,
            'New subscriber: here is what MAX sees',
            analysis
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.customer.subscription.created',
            category: 'stripe',
            params: { subscriptionId: sub.id, customerId: sub.customer },
            result: { analysis },
            success: true,
            affectedCustomers: typeof sub.customer === 'string' ? [sub.customer] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (userId) {
          const analysis = await buildAnalysis(
            `A subscriber churned.\nSubscription ID: ${sub.id}\nCustomer: ${String(sub.customer)}\nStatus: ${sub.status}\nWrite a personalized churn analysis and the single best recovery action.`
          )
          await sendEmailToUserId(
            userId,
            'You just lost a subscriber',
            analysis
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.customer.subscription.deleted',
            category: 'stripe',
            params: { subscriptionId: sub.id, customerId: sub.customer },
            result: { analysis },
            success: true,
            affectedCustomers: typeof sub.customer === 'string' ? [sub.customer] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : ''
        const analysis = await buildAnalysis(
          `A payment failed.\nInvoice ID: ${invoice.id}\nCustomer: ${customerId}\nAmount due: ${formatCurrency(invoice.amount_due ?? 0, invoice.currency ?? 'usd')}\nWrite the best recovery message to send right now.`
        )

        if (customerId) {
          await markCustomerAtRisk({
            customerId,
            invoiceId: invoice.id,
            amountDue: invoice.amount_due ?? 0,
            customerName: invoice.customer_name ?? null,
            updatedAt: new Date().toISOString(),
          })
        }

        if (userId) {
          await sendEmailToUserId(
            userId,
            'Failed payment: action needed',
            `Customer: ${invoice.customer_name || customerId || 'Unknown'}\nAmount due: ${formatCurrency(invoice.amount_due ?? 0, invoice.currency ?? 'usd')}\n\n${analysis}`
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.invoice.payment_failed',
            category: 'stripe',
            params: { invoiceId: invoice.id, customerId },
            result: { analysis, amountDue: invoice.amount_due ?? 0 },
            success: true,
            affectedCustomers: customerId ? [customerId] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        break
      }

      default:
        // Not an error — just log unhandled events
        break
    }
  } catch (handlerErr) {
    console.error('[webhook] Handler error:', handlerErr)
    // Still return 200 so Stripe doesn't retry
  }

  return NextResponse.json({ received: true })
}
