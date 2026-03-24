import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { safeKvGet, safeKvDel, safeKvSet } from '@/lib/kv'
import {
  exchangeCodeForToken,
  saveStripeConnection,
  getStripeConnection,
} from '@/lib/stripe-connection'
import { rememberStripeAccountOwner, rememberUserEmail } from '@/lib/user-state'
import { scheduleWelcomeSequence } from '@/lib/email-sequences'
import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('[stripe/callback] OAuth error:', error, errorDescription)
    redirect('/connect?error=denied')
  }

  if (!code || !state) {
    redirect('/connect?error=invalid')
  }

  const stateData = await safeKvGet<{ userId: string; plan: string; upgrade: boolean }>(`oauth_state:${state}`)
  
  if (!stateData) {
    redirect('/connect?error=expired')
  }

  const { userId, plan, upgrade } = stateData

  await safeKvDel(`oauth_state:${state}`)

  const tokenData = await exchangeCodeForToken(code)

  if (!tokenData) {
    redirect('/connect?error=token_exchange_failed')
  }

  const { access_token, stripe_user_id, scope } = tokenData
  const normalizedScope = scope === 'read_write' ? 'read_write' : 'read_only'

  let businessName: string | undefined
  try {
    const stripe = new Stripe(access_token, { apiVersion: STRIPE_API_VERSION })
    const account = await stripe.accounts.retrieve()
    businessName = account.business_profile?.name || account.settings?.dashboard?.display_name || undefined
  } catch (err) {
    console.warn('[stripe/callback] Failed to fetch account details:', err)
  }

  const existingConnection = await getStripeConnection(userId)
  const isFirstConnection = !existingConnection

  await saveStripeConnection(
    userId,
    access_token,
    stripe_user_id,
    normalizedScope,
    plan,
    businessName
  )

  await rememberStripeAccountOwner(stripe_user_id, userId)
  await safeKvSet(
    `lucrum:stripe-account-owner:${stripe_user_id}`,
    userId,
    { ex: 60 * 60 * 24 * 365 },
  )

  if (isFirstConnection) {
    try {
      const { currentUser } = await import('@clerk/nextjs/server')
      const user = await currentUser()
      const email = user?.primaryEmailAddress?.emailAddress
      
      if (email) {
        await rememberUserEmail(userId, email)
        scheduleWelcomeSequence(userId, email).catch(err => {
          console.error('[stripe/callback] Failed to schedule welcome sequence:', err)
        })
      }
    } catch (err) {
      console.warn('[stripe/callback] Failed to get user email:', err)
    }
  }

  if (isFirstConnection) {
    redirect('/onboarding')
  } else if (upgrade) {
    redirect('/dashboard?upgraded=true')
  } else {
    redirect('/dashboard')
  }
}
