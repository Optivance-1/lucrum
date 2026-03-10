import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  createStripeClient,
  encryptStripeKey,
  isValidStripeKey,
  parseStripeAccountsCookie,
  serializeStripeAccountsCookie,
  STRIPE_ACCOUNTS_COOKIE,
  STRIPE_KEY_COOKIE,
} from '@/lib/stripe'
import { rememberStripeAccountOwner, rememberUserEmail } from '@/lib/user-state'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { secretKey } = await req.json()
    const normalizedKey = typeof secretKey === 'string' ? secretKey.trim() : ''

    if (!normalizedKey || !isValidStripeKey(normalizedKey)) {
      return NextResponse.json({ success: false, error: 'Invalid Stripe key format' }, { status: 400 })
    }

    // Validate the key by fetching account info
    const stripe = createStripeClient(normalizedKey)
    const account = await stripe.accounts.retrieve()
    const encryptedCookie = encryptStripeKey(normalizedKey)
    const user = await currentUser()

    if (!encryptedCookie && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Server security configuration missing' },
        { status: 500 }
      )
    }

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

    // Also maintain a multi-account cookie (encrypted in production).
    const existingRaw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
    const existing = existingRaw ? parseStripeAccountsCookie(existingRaw) : null
    const scopedExisting = existing?.userId && existing.userId !== userId ? null : existing
    const accounts = (scopedExisting?.accounts ?? []).filter(a => a.id !== account.id)
    accounts.unshift({ id: account.id, label: account.business_profile?.name || account.id, secretKey: normalizedKey })
    const payload = { v: 1 as const, userId, activeId: account.id, accounts: accounts.slice(0, 3) }
    const accountsCookie = serializeStripeAccountsCookie(payload)
    if (accountsCookie) {
      response.cookies.set(STRIPE_ACCOUNTS_COOKIE, accountsCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    await rememberStripeAccountOwner(account.id, userId)
    await rememberUserEmail(userId, user?.primaryEmailAddress?.emailAddress)

    response.cookies.set(STRIPE_KEY_COOKIE, encryptedCookie ?? secretKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Stripe connect error:', error)
    return NextResponse.json(
      { success: false, error: 'Connection failed' },
      { status: 400 }
    )
  }
}
