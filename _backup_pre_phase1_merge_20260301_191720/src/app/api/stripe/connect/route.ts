import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const { secretKey } = await req.json()

    if (!secretKey || !secretKey.startsWith('sk_')) {
      return NextResponse.json({ success: false, error: 'Invalid Stripe key format' }, { status: 400 })
    }

    // Validate the key by fetching account info
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })
    const account = await stripe.accounts.retrieve()

    // In production: encrypt and store key in DB, associate with user session
    // For Phase 1: store in session/cookie (demo)
    const response = NextResponse.json({
      success: true,
      account: {
        id: account.id,
        business_profile: account.business_profile,
        country: account.country,
      },
    })

    // Set encrypted key in httpOnly cookie (demo — use proper encryption in prod)
    response.cookies.set('stripe_key', secretKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Stripe connect error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Connection failed' },
      { status: 400 }
    )
  }
}
