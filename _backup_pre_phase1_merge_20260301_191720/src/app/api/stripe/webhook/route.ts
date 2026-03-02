import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('💰 Payment succeeded:', paymentIntent.amount / 100, paymentIntent.currency)
      // TODO: Update DB, trigger AI re-analysis
      break
    }

    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      console.log('🎉 New subscription:', sub.id)
      // TODO: Update customer metrics, trigger AI insight generation
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      console.log('😬 Subscription cancelled:', sub.id)
      // TODO: Log churn event, update churn metrics, trigger AI churn alert
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('⚠️ Payment failed:', invoice.id)
      // TODO: Flag customer as at-risk
      break
    }

    default:
      console.log('Unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}
