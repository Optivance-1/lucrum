import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

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
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        console.log(`[webhook] 💰 Payment succeeded: $${pi.amount / 100} ${pi.currency.toUpperCase()}`)
        // Phase 2: store in DB, invalidate metrics cache, push real-time update
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`[webhook] ✅ Charge succeeded: $${charge.amount / 100}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`[webhook] 🔄 Charge refunded: $${(charge.amount_refunded ?? 0) / 100}`)
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] 🎉 New subscription: ${sub.id}`)
        // Phase 2: trigger AI insight regeneration
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] 📝 Subscription updated: ${sub.id} → ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] ❌ Subscription cancelled: ${sub.id}`)
        // Phase 2: log churn event, update metrics, trigger churn alert
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhook] ⚠️ Payment failed for invoice: ${invoice.id}`)
        // Phase 2: flag customer as at-risk, trigger dunning flow
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhook] ✅ Invoice paid: $${(invoice.amount_paid ?? 0) / 100}`)
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
