import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDecisionEngineReadiness } from '@/lib/decision-engine'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const readiness = await getDecisionEngineReadiness(userId)
  return NextResponse.json(readiness)
}
