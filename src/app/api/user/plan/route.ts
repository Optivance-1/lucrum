import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  getDemoQuestionsUsed,
  canUseCFOChat,
  canUseFiveMoves,
  canUseActionExecution,
  canUseMultiAccount,
  canUseAPI,
  usesPriorityAI,
  canUseWebhookAlerts,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getUserSubscription(userId)
    const plan = sub.plan
    const demoUsed = plan === 'demo' ? await getDemoQuestionsUsed(userId) : 0

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
      demoQuestionsUsed: demoUsed,
      demoQuestionsRemaining: plan === 'demo' ? Math.max(0, 1 - demoUsed) : undefined,
    })
  } catch (error: any) {
    console.error('[user/plan] error:', error)
    return NextResponse.json({ plan: 'demo', features: {} }, { status: 500 })
  }
}
