import { NextRequest, NextResponse } from 'next/server'
import { safeKvGet, safeKvSet } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid email' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const waitlist = await safeKvGet<string[]>('report_waitlist') ?? []
    
    if (!waitlist.includes(normalizedEmail)) {
      waitlist.push(normalizedEmail)
      await safeKvSet('report_waitlist', waitlist)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[reports/waitlist] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const waitlist = await safeKvGet<string[]>('report_waitlist') ?? []
  
  return NextResponse.json({ count: waitlist.length })
}
