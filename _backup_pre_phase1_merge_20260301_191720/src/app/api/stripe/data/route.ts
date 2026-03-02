import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secretKey = req.cookies.get('stripe_key')?.value

    if (!secretKey) {
      return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })

    // Fetch data in parallel
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60

    const [
      currentCharges,
      previousCharges,
      subscriptions,
      customers,
      balance,
    ] = await Promise.all([
      stripe.charges.list({ created: { gte: thirtyDaysAgo }, limit: 100 }),
      stripe.charges.list({ created: { gte: sixtyDaysAgo, lte: thirtyDaysAgo }, limit: 100 }),
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
      stripe.customers.list({ created: { gte: thirtyDaysAgo }, limit: 100 }),
      stripe.balance.retrieve(),
    ])

    // Calculate MRR
    const mrr = subscriptions.data.reduce((sum, sub) => {
      const amount = sub.items.data.reduce((s, item) => {
        const price = item.price
        if (price.recurring?.interval === 'month') return s + (price.unit_amount || 0) * item.quantity!
        if (price.recurring?.interval === 'year') return s + ((price.unit_amount || 0) * item.quantity!) / 12
        return s
      }, 0)
      return sum + amount
    }, 0) / 100

    // Revenue this period vs last
    const currentRevenue = currentCharges.data
      .filter(c => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0) / 100

    const previousRevenue = previousCharges.data
      .filter(c => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0) / 100

    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0

    // Available balance
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100

    // Daily revenue for chart (last 7 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60
    const recentCharges = await stripe.charges.list({ created: { gte: sevenDaysAgo }, limit: 100 })

    const dailyRevenue: Record<string, number> = {}
    recentCharges.data.forEach(charge => {
      if (!charge.paid || charge.refunded) return
      const date = new Date(charge.created * 1000).toLocaleDateString('en-US', { weekday: 'short' })
      dailyRevenue[date] = (dailyRevenue[date] || 0) + charge.amount / 100
    })

    // Recent events
    const recentEvents = currentCharges.data.slice(0, 10).map(charge => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      description: charge.description || 'Payment',
      customer: charge.customer,
      created: charge.created,
      status: charge.status,
      paid: charge.paid,
    }))

    return NextResponse.json({
      mrr: Math.round(mrr),
      revenue: Math.round(currentRevenue),
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      activeSubscriptions: subscriptions.data.length,
      newCustomers: customers.data.length,
      availableBalance: Math.round(availableBalance),
      dailyRevenue: Object.entries(dailyRevenue).map(([day, revenue]) => ({ day, revenue: Math.round(revenue) })),
      recentEvents,
    })
  } catch (error: any) {
    console.error('Stripe data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
