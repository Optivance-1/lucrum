import { NextRequest, NextResponse } from 'next/server'
import { safeKvSet, safeKvGet } from '@/lib/kv'

export async function GET() {
  const stored = await safeKvGet<string>('operator:last_heartbeat')
  const now = Date.now()

  if (!stored) {
    return NextResponse.json({ status: 'no_heartbeat_yet', alert: null })
  }

  const last = parseInt(String(stored), 10)
  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24))
  const stale = daysSince > 14

  return NextResponse.json({
    status: stale ? 'stale' : 'ok',
    daysSince,
    alert: stale ? `Operator last checked in ${daysSince} days ago.` : null,
  })
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET must be set to record heartbeat in production' },
      { status: 503 },
    )
  }
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}` && auth !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  await safeKvSet('operator:last_heartbeat', Date.now().toString())
  return NextResponse.json({ status: 'recorded' })
}
