import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSnapshots } from '@/lib/snapshots'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 90) || 90, 365)
  const snapshots = await getSnapshots(userId, days)

  return NextResponse.json({ snapshots })
}
