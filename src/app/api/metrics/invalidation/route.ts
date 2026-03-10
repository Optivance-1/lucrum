import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getMetricsInvalidatedAt } from '@/lib/user-state'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invalidatedAt = await getMetricsInvalidatedAt(userId)
  return NextResponse.json({ invalidatedAt })
}
