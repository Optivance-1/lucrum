import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPlan, getUserSubscriptionRecord } from '@/lib/subscription'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [plan, record] = await Promise.all([
    getUserPlan(userId),
    getUserSubscriptionRecord(userId),
  ])

  return NextResponse.json({
    plan,
    currentPeriodEnd: record?.currentPeriodEnd ?? null,
    status: record?.status ?? null,
  })
}
