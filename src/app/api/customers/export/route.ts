import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secretKey = getStripeKeyFromCookies(req.cookies)
    if (!secretKey) {
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const stripe = createStripeClient(secretKey)
    const now = Math.floor(Date.now() / 1000)
    const d30 = now - 30 * 86400
    const d365 = now - 365 * 86400

    async function fetchAll<T extends { id: string }>(
      fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
      maxItems = 2000
    ): Promise<T[]> {
      const out: T[] = []
      let startingAfter: string | undefined
      for (;;) {
        const page = await fetchPage(startingAfter)
        out.push(...page.data)
        if (!page.has_more) break
        if (out.length >= maxItems) break
        startingAfter = page.data[page.data.length - 1]?.id
        if (!startingAfter) break
      }
      return out.slice(0, maxItems)
    }

    const [pastDueSubs, cancelledSubs] = await Promise.all([
      fetchAll(
        (startingAfter) =>
          stripe.subscriptions.list({
            status: 'past_due',
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        2000
      ).catch(() => []),
      fetchAll(
        (startingAfter) =>
          stripe.subscriptions.list({
            status: 'canceled',
            created: { gte: d365 },
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        3000
      ).catch(() => []),
    ])

    const cancelledLast30 = (cancelledSubs as any[]).filter((s) => (s.canceled_at ?? 0) >= d30)

    const rows: string[] = []
    const generatedAt = new Date().toISOString()

    rows.push('Lucrum Customers Export')
    rows.push(`Generated,${generatedAt}`)
    rows.push('')
    rows.push('Past-due subscriptions (failed payments)')
    rows.push('subscription_id,customer_id,status,created,current_period_end,mrr_at_risk,currency')
    ;(pastDueSubs as any[]).forEach((sub) => {
      const mrrAtRisk = (sub.items?.data ?? []).reduce((sum: number, item: any) => {
        const price = item.price
        const qty = item.quantity ?? 1
        const unit = price?.unit_amount ?? 0
        if (price?.recurring?.interval === 'month') return sum + unit * qty
        if (price?.recurring?.interval === 'year') return sum + (unit * qty) / 12
        if (price?.recurring?.interval === 'week') return sum + unit * qty * 4.33
        return sum
      }, 0) / 100
      rows.push([
        sub.id,
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? '',
        sub.status ?? '',
        sub.created ?? '',
        sub.current_period_end ?? '',
        mrrAtRisk,
        String(sub.currency ?? 'usd').toUpperCase(),
      ].join(','))
    })

    rows.push('')
    rows.push('Cancelled subscriptions (last 30 days)')
    rows.push('subscription_id,customer_id,status,created,canceled_at,current_period_end')
    cancelledLast30.forEach((sub) => {
      rows.push([
        sub.id,
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? '',
        sub.status ?? '',
        sub.created ?? '',
        sub.canceled_at ?? '',
        sub.current_period_end ?? '',
      ].join(','))
    })

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="lucrum-customers-${generatedAt.slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[customers/export] error:', error)
    return NextResponse.json({ error: error.message ?? 'Export failed' }, { status: 500 })
  }
}

