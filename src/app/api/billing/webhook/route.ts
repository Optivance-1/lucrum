import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { sendEmailToUserId } from '@/lib/email'
import {
  getLucrumStripe,
  setUserSubscription,
  resolvePlanFromPriceId,
  resolveIntervalFromPriceId,
} from '@/lib/subscription'
import {
  getBillingCustomerOwner,
  getBillingSubscriptionOwner,
  rememberBillingCustomerOwner,
  rememberBillingSubscriptionOwner,
} from '@/lib/user-state'

async function resolveBillingUserId(object: Record<string, any>): Promise<string | null> {
  if (typeof object.metadata?.userId === 'string') return object.metadata.userId

  const customerId =
    typeof object.customer === 'string' ? object.customer
    : typeof object.customer?.id === 'string' ? object.customer.id
    : null

  if (customerId) {
    const byCustomer = await getBillingCustomerOwner(customerId)
    if (byCustomer) return byCustomer
  }

  const subscriptionId =
    typeof object.subscription === 'string' ? object.subscription
    : object.object === 'subscription' && typeof object.id === 'string' ? object.id
    : null

  if (subscriptionId) {
    const bySubscription = await getBillingSubscriptionOwner(subscriptionId)
    if (bySubscription) return bySubscription
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  if (!process.env.LUCRUM_STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Billing webhook secret not configured' }, { status: 500 })

  const stripe = getLucrumStripe()
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.LUCRUM_STRIPE_WEBHOOK_SECRET)
  } catch (error: any) {
    return NextResponse.json({ error: `Invalid signature: ${error.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = await resolveBillingUserId(session as Record<string, any>)
        if (!userId) break

        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null

        if (customerId) await rememberBillingCustomerOwner(customerId, userId)
        if (subscriptionId) await rememberBillingSubscriptionOwner(subscriptionId, userId)

        const priceId = subscription?.items.data[0]?.price.id ?? null
        const plan = resolvePlanFromPriceId(priceId) ?? 'solo'
        const interval = resolveIntervalFromPriceId(priceId)

        await setUserSubscription(userId, {
          plan,
          interval,
          activatedAt: Date.now(),
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
        })

        if (plan === 'enterprise') {
          await sendEmailToUserId(userId, 'Welcome to Lucrum Enterprise', 'You now have full access to Action Execution, Multi-account, Team Seats, API access, and Priority AI (GLM-5). Connect your Stripe and try the Action Engine today.')
        } else if (plan === 'growth') {
          await sendEmailToUserId(userId, 'Welcome to Lucrum Growth', 'You now have full access to Action Execution, 2 team seats, and Outcome Tracking. Connect your Stripe and execute your first action.')
        } else {
          await sendEmailToUserId(userId, 'Welcome to Lucrum Solo Dev', 'You now have full access to MAX CFO, Five Moves Engine, and Metric History. Connect your Stripe and ask MAX your first question.')
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveBillingUserId(subscription as Record<string, any>)
        if (!userId) break

        await rememberBillingSubscriptionOwner(subscription.id, userId)
        if (typeof subscription.customer === 'string') {
          await rememberBillingCustomerOwner(subscription.customer, userId)
        }

        const priceId = subscription.items.data[0]?.price.id ?? null
        const plan = resolvePlanFromPriceId(priceId) ?? 'solo'
        const interval = resolveIntervalFromPriceId(priceId)

        await setUserSubscription(userId, {
          plan,
          interval,
          activatedAt: Date.now(),
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined,
          stripeSubscriptionId: subscription.id,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveBillingUserId(subscription as Record<string, any>)
        if (!userId) break

        await setUserSubscription(userId, { plan: 'demo' })
        await sendEmailToUserId(userId, 'Lucrum subscription cancelled', 'Your Lucrum subscription has been cancelled. Your metric history will be retained for 90 days. You can resubscribe anytime at lucrum.vercel.app/pricing')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = await resolveBillingUserId(invoice as Record<string, any>)
        if (!userId) break
        await sendEmailToUserId(userId, 'Lucrum subscription payment failed', `Your Lucrum subscription payment failed for ${(invoice.amount_due ?? 0) / 100} ${String(invoice.currency || 'usd').toUpperCase()}. Update your billing method to keep access active.`)
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error('[billing/webhook] handler error:', error)
  }

  return NextResponse.json({ received: true })
}
