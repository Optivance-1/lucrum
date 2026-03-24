import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAggregateOutcomes, getPlatformTotals } from '@/lib/outcome-tracker'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  if (searchParams.get('scope') === 'platform') {
    const totals = await getPlatformTotals()
    return NextResponse.json(totals, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const outcomes = await getAggregateOutcomes(userId)
  return NextResponse.json(outcomes)
}
