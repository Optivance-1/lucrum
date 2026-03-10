import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLucrumStripe, getUserBillingCustomerId } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = await getUserBillingCustomerId(userId)
    if (!customerId) {
      return NextResponse.json({ error: 'No billing customer found' }, { status: 404 })
    }

    const stripe = getLucrumStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[billing/portal] error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create billing portal session' }, { status: 500 })
  }
}
