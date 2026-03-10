// ── STRIPE SETUP INSTRUCTIONS ──────────────────────────
// Run these commands once to create products and prices:
//
// stripe products create --name="Lucrum Solo Dev"
// stripe prices create \
//   --product=[solo_product_id] \
//   --unit-amount=1200 \
//   --currency=usd \
//   --recurring[interval]=month
// stripe prices create \
//   --product=[solo_product_id] \
//   --unit-amount=12000 \
//   --currency=usd \
//   --recurring[interval]=year
//
// stripe products create --name="Lucrum Enterprise"
// stripe prices create \
//   --product=[enterprise_product_id] \
//   --unit-amount=9900 \
//   --currency=usd \
//   --recurring[interval]=month
// stripe prices create \
//   --product=[enterprise_product_id] \
//   --unit-amount=99000 \
//   --currency=usd \
//   --recurring[interval]=year
//
// Copy the 4 price IDs into env vars above.
// ───────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  getLucrumStripe,
  getUserBillingCustomerId,
  setUserBillingCustomerId,
  getValidPriceIds,
} from '@/lib/subscription'
import { rememberBillingCustomerOwner, rememberUserEmail } from '@/lib/user-state'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { priceId } = body as { priceId?: string }

    if (!priceId) {
      return NextResponse.json({ error: 'priceId required' }, { status: 400 })
    }

    const validIds = getValidPriceIds()
    if (!validIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
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
      ui_mode: 'embedded',
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${appUrl}/dashboard?upgraded=true`,
      allow_promotion_codes: true,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error: any) {
    console.error('[billing/checkout] error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
