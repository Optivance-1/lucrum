import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStripeConnection } from '@/lib/stripe-connection'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ accounts: [] }, { status: 401 })
  }

  const connection = await getStripeConnection(userId)

  if (!connection) {
    return NextResponse.json({ accounts: [] })
  }

  return NextResponse.json({
    accounts: [{
      id: connection.stripeAccountId,
      label: connection.businessName || connection.stripeAccountId,
      active: true,
      scope: connection.scope,
      connectedAt: connection.connectedAt,
    }],
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    error: 'Multi-account management has been replaced with Stripe Connect OAuth. Please use /api/stripe/connect to add accounts.',
    connectUrl: '/api/stripe/connect',
  }, { status: 400 })
}
