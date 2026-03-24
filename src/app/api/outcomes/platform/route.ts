import { NextResponse } from 'next/server'
import { getPlatformTotals } from '@/lib/outcome-tracker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const totals = await getPlatformTotals()
  return NextResponse.json(totals, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
  })
}
