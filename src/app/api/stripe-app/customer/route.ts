import { NextRequest, NextResponse } from 'next/server'
import { safeKvGet } from '@/lib/kv'
import type { StripeCustomer } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stripeAccountId = searchParams.get('stripeAccountId')
  const customerId = searchParams.get('customerId')

  if (!stripeAccountId || !customerId) {
    return NextResponse.json(
      { error: 'Missing stripeAccountId or customerId' },
      { status: 400 }
    )
  }

  try {
    const userIdKey = `stripe_account_user:${stripeAccountId}`
    const userId = await safeKvGet<string>(userIdKey)

    if (!userId) {
      return NextResponse.json(
        { error: 'Account not connected to Lucrum' },
        { status: 404 }
      )
    }

    const customers = await safeKvGet<StripeCustomer[]>(`customers:${userId}`)
    
    if (!customers) {
      return NextResponse.json(
        { error: 'Customer data not available' },
        { status: 404 }
      )
    }

    const customer = customers.find(c => c.id === customerId)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const recommendedAction = getRecommendedAction(customer)

    return NextResponse.json({
      customerId: customer.id,
      churnRisk: customer.churnRisk,
      mrrContribution: customer.mrr,
      daysAsCustomer: customer.daysSinceCreated,
      recommendedAction,
      lastPaymentStatus: customer.lastPaymentStatus ?? 'unknown',
    })
  } catch (error: any) {
    console.error('[stripe-app/customer] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer insights' },
      { status: 500 }
    )
  }
}

function getRecommendedAction(customer: StripeCustomer): string {
  if (customer.lastPaymentStatus === 'failed') {
    return 'Retry failed payment or reach out to update payment method'
  }

  if (customer.churnRisk === 'high') {
    if (customer.subscriptionStatus === 'past_due') {
      return 'Send payment recovery email with retention offer'
    }
    return 'Schedule personal outreach to understand concerns'
  }

  if (customer.churnRisk === 'medium') {
    if (customer.daysSinceCreated > 180) {
      return 'Offer annual plan discount to lock in retention'
    }
    return 'Send engagement email highlighting new features'
  }

  if (customer.expansionEligible) {
    return 'Send upgrade offer for premium features'
  }

  if (customer.daysSinceCreated > 365) {
    return 'Thank them for loyalty with exclusive benefit'
  }

  return 'No immediate action needed — healthy customer'
}
