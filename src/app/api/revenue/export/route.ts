import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasStripeConnected } from '@/lib/stripe-connection'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const connected = await hasStripeConnected(userId)
  if (!connected) {
    return NextResponse.json({ 
      error: 'Stripe not connected',
      action: 'connect',
      connectUrl: '/api/stripe/connect'
    }, { status: 401 })
  }

  // This export is derived from the already-computed dashboard metrics.
  // The client passes them in to avoid duplicating heavy Stripe API calls.
  const { searchParams } = new URL(req.url)
  const grossRevenue30d = searchParams.get('grossRevenue30d') ?? '0'
  const netRevenue30d = searchParams.get('netRevenue30d') ?? '0'
  const stripeFees30d = searchParams.get('stripeFees30d') ?? '0'
  const refundTotal30d = searchParams.get('refundTotal30d') ?? '0'
  const disputeTotal30d = searchParams.get('disputeTotal30d') ?? '0'
  const effectiveFeeRate = searchParams.get('effectiveFeeRate') ?? '0'
  const payoutSchedule = searchParams.get('payoutSchedule') ?? 'unknown'
  const generatedAt = new Date().toISOString()

  const rows: string[] = []
  rows.push('Lucrum Revenue Reality Export')
  rows.push(`Generated,${generatedAt}`)
  rows.push('')
  rows.push(`Gross Revenue (30d),${grossRevenue30d}`)
  rows.push(`Net Revenue (30d),${netRevenue30d}`)
  rows.push(`Stripe Fees (30d),${stripeFees30d}`)
  rows.push(`Refunds (30d),${refundTotal30d}`)
  rows.push(`Disputes (30d),${disputeTotal30d}`)
  rows.push(`Effective Fee Rate (%),${effectiveFeeRate}`)
  rows.push(`Payout Schedule,${payoutSchedule}`)

  const csv = rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lucrum-revenue-${generatedAt.slice(0, 10)}.csv"`,
    },
  })
}

