import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { disconnectStripe, getStripeConnection } from '@/lib/stripe-connection'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const connection = await getStripeConnection(userId)
    
    if (!connection) {
      return NextResponse.json({ error: 'No Stripe connection found' }, { status: 404 })
    }

    const success = await disconnectStripe(userId)

    if (!success) {
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe account disconnected. You can reconnect anytime.',
    })
  } catch (error: any) {
    console.error('[stripe/disconnect] error:', error)
    return NextResponse.json(
      { error: error.message || 'Disconnect failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await getStripeConnection(userId)

  if (!connection) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    stripeAccountId: connection.stripeAccountId,
    scope: connection.scope,
    connectedAt: connection.connectedAt,
    businessName: connection.businessName,
  })
}
