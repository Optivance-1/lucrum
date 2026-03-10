import { NextResponse } from 'next/server'
import { STRIPE_ACCOUNTS_COOKIE, STRIPE_KEY_COOKIE } from '@/lib/stripe'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STRIPE_KEY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  })
  response.cookies.set(STRIPE_ACCOUNTS_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  })

  return response
}
