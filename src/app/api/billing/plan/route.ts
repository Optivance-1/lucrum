import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  canUseCFOChat,
  canUseFiveMoves,
  canUseActionExecution,
  canUseMultiAccount,
  canUseAPI,
  usesPriorityAI,
  canUseWebhookAlerts,
} from '@/lib/subscription'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sub = await getUserSubscription(userId)
  const plan = sub.plan

  return NextResponse.json({
    plan,
    interval: sub.interval,
    currentPeriodEnd: null,
    status: plan === 'demo' ? null : 'active',
    features: {
      cfoChatUnlimited: canUseCFOChat(plan),
      fiveMoves: canUseFiveMoves(plan),
      actionExecution: canUseActionExecution(plan),
      multiAccount: canUseMultiAccount(plan),
      teamSeats: canUseMultiAccount(plan),
      apiAccess: canUseAPI(plan),
      priorityAI: usesPriorityAI(plan),
      webhookAlerts: canUseWebhookAlerts(plan),
    },
  })
}
