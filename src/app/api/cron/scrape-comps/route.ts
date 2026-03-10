import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  try {
    const res = await fetch(`${appUrl}/api/comps/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-cron-secret': secret } : {}),
      },
    })
    const data = await res.json()
    return NextResponse.json({ ok: true, scrapeResult: data })
  } catch (err: any) {
    console.error('[cron/scrape-comps] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
