import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  getLucrumStripe,
  getUserBillingCustomerId,
  setUserBillingCustomerId,
} from '@/lib/subscription'
import { rememberBillingCustomerOwner, rememberUserEmail } from '@/lib/user-state'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const interval = body?.interval === 'annual' ? 'annual' : 'monthly'
    const priceId = interval === 'annual'
      ? process.env.LUCRUM_PRO_ANNUAL_PRICE_ID
      : process.env.LUCRUM_PRO_PRICE_ID

    if (!priceId) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }

    const stripe = getLucrumStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }
    const user = await currentUser()
    const email = user?.primaryEmailAddress?.emailAddress ?? null

    let customerId = await getUserBillingCustomerId(userId)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await setUserBillingCustomerId(userId, customerId)
      await rememberBillingCustomerOwner(customerId, userId)
    }

    await rememberUserEmail(userId, email)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
      metadata: {
        userId,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          interval,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[billing/checkout] error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
