import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  STRIPE_ACCOUNTS_COOKIE,
  createStripeClient,
  isValidStripeKey,
  parseStripeAccountsCookie,
  serializeStripeAccountsCookie,
} from '@/lib/stripe'
import { rememberStripeAccountOwner, rememberUserEmail } from '@/lib/user-state'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ accounts: [] }, { status: 401 })
  }

  const raw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
  const payload = raw ? parseStripeAccountsCookie(raw) : null
  const scoped = payload?.userId && payload.userId !== userId ? null : payload

  return NextResponse.json({
    accounts: (scoped?.accounts ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      active: scoped?.activeId === a.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const action = body?.action as 'add' | 'switch' | 'remove'
    const user = await currentUser()

    const raw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
    const existing =
      (raw ? parseStripeAccountsCookie(raw) : null) ?? ({ v: 1 as const, userId, activeId: null, accounts: [] as any[] })
    const scopedExisting = existing.userId && existing.userId !== userId
      ? { v: 1 as const, userId, activeId: null, accounts: [] as any[] }
      : existing

    if (action === 'switch') {
      const id = String(body?.id ?? '')
      const next = { ...scopedExisting, userId, activeId: id }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })
      const res = NextResponse.json({ success: true })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    if (action === 'remove') {
      const id = String(body?.id ?? '')
      const accounts = scopedExisting.accounts.filter((a: any) => a.id !== id)
      const activeId = scopedExisting.activeId === id ? (accounts[0]?.id ?? null) : scopedExisting.activeId
      const next = { v: 1 as const, userId, activeId, accounts }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })
      const res = NextResponse.json({ success: true })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    if (action === 'add') {
      const secretKey = typeof body?.secretKey === 'string' ? body.secretKey.trim() : ''
      const label = typeof body?.label === 'string' ? body.label.trim() : ''
      if (!secretKey || !isValidStripeKey(secretKey)) {
        return NextResponse.json({ error: 'Invalid Stripe key format' }, { status: 400 })
      }

      const stripe = createStripeClient(secretKey)
      const account = await stripe.accounts.retrieve()
      const id = account.id
      const nextAccounts = scopedExisting.accounts.filter((a: any) => a.id !== id)
      nextAccounts.unshift({ id, label: label || account.business_profile?.name || id, secretKey })
      const next = { v: 1 as const, userId, activeId: id, accounts: nextAccounts.slice(0, 3) }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })

      await rememberStripeAccountOwner(id, userId)
      await rememberUserEmail(userId, user?.primaryEmailAddress?.emailAddress)

      const res = NextResponse.json({ success: true, id })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[stripe/accounts] error:', error)
    return NextResponse.json({ error: error.message ?? 'Request failed' }, { status: 500 })
  }
}

