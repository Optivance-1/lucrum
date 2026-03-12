import { NextRequest, NextResponse } from 'next/server'
import { getAllReports, getLatestReport } from '@/lib/report-generator'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const latest = searchParams.get('latest') === 'true'

  try {
    if (latest) {
      const report = await getLatestReport()
      return NextResponse.json({ report }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
      })
    }

    const reports = await getAllReports()
    return NextResponse.json({ reports }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch (error: any) {
    console.error('[reports] error:', error)
    return NextResponse.json({ reports: [], error: 'Failed to fetch reports' })
  }
}
