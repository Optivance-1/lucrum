import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { safeKvSet } from '@/lib/kv'
import { getOAuthUrl } from '@/lib/stripe-connection'
import { getUserPlan } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in?redirect_url=/connect')
  }

  const { searchParams } = new URL(req.url)
  const planParam = searchParams.get('plan')
  const upgrade = searchParams.get('upgrade') === 'true'

  const currentPlan = await getUserPlan(userId)
  const plan = planParam || currentPlan || 'solo'

  const state = crypto.randomBytes(32).toString('hex')

  await safeKvSet(
    `oauth_state:${state}`,
    { userId, plan, upgrade },
    600
  )

  const oauthUrl = getOAuthUrl(plan, state)

  redirect(oauthUrl)
}
