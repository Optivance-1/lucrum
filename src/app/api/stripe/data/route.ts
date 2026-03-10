import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import { calculateChurnRate, calculateMRRGrowth, calculateRunway, getLastNDays } from '@/lib/utils'
import { createMockStripeMetrics, isDemoModeEnabled } from '@/lib/mockData'
import { saveSnapshot } from '@/lib/snapshots'
import {
  rememberStripeAccountOwner,
  rememberStripeCustomerOwner,
  rememberStripeSubscriptionOwner,
} from '@/lib/user-state'
import { isNewFounder, benchmarksForMetrics } from '@/lib/comp-engine'
import type { StripeMetrics, DailyRevenue, StripeEvent, CashFlowPeriod, CohortRetentionRow, RevenueByPeriod, LeakageSummary } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secretKey = getStripeKeyFromCookies(req.cookies, userId)
    if (!secretKey) {
      if (isDemoModeEnabled(req.nextUrl.searchParams.get('demo'))) {
        return NextResponse.json(createMockStripeMetrics(), {
          headers: {
            'Cache-Control': 'no-store',
          },
        })
      }
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const stripe = createStripeClient(secretKey)
    const now = Math.floor(Date.now() / 1000)
    const d30 = now - 30 * 86400
    const d60 = now - 60 * 86400
    const d90 = now - 90 * 86400
    const d365 = now - 365 * 86400
    const d7  = now - 7  * 86400

    // ── Pagination helpers (caps to avoid timeouts) ──────────────────────────
    async function fetchAll<T extends { id: string }>(
      fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
      maxItems = 500
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

    async function fetchBalanceTx(created: { gte: number; lte?: number }, maxItems = 2000) {
      return fetchAll(
        (startingAfter) =>
          stripe.balanceTransactions.list({
            created,
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        maxItems
      )
    }

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [
      activeSubsData,
      newSubs30dData,
      cancelledSubsRecentData,
      charges30dData,
      charges7dData,
      customersNew30dData,
      customersAllData,
      balance,
      payouts30dData,
      pastDueSubsData,
      balanceTx30dData,
      balanceTxPrev30dData,
      balanceTx7dData,
      balanceTx90dData,
      balanceTx365dData,
      account,
    ] = await Promise.all([
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'active', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      // cancellations: fetch wider (last year), then filter by canceled_at locally
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'canceled', created: { gte: d365 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      fetchAll<any>((startingAfter) => stripe.charges.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.charges.list({ created: { gte: d7 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.customers.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      fetchAll<any>((startingAfter) => stripe.customers.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      stripe.balance.retrieve(),
      fetchAll<any>((startingAfter) => stripe.payouts.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'past_due', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      fetchBalanceTx({ gte: d30 }, 2000),
      fetchBalanceTx({ gte: d60, lte: d30 }, 2000),
      fetchBalanceTx({ gte: d7 }, 500),
      fetchBalanceTx({ gte: d90 }, 4000),
      fetchBalanceTx({ gte: d365 }, 8000),
      stripe.accounts.retrieve(),
    ])

    const allActiveSubs = { data: activeSubsData }
    const newSubs30d = { data: newSubs30dData }
    const cancelledSubsAll = { data: cancelledSubsRecentData }
    const pastDueSubs = { data: pastDueSubsData }
    const charges30d = { data: charges30dData }
    const charges7d = { data: charges7dData }
    const newCustomers30d = { data: customersNew30dData }
    const allCustomers = { data: customersAllData }

    const cancelledSubs30dData = cancelledSubsAll.data.filter((s: any) => (s.canceled_at ?? 0) >= d30)
    const cancelledSubs30d = { data: cancelledSubs30dData }

    // ── MRR: sum from active subscriptions only (not one-time charges) ──────
    function subToMonthlyAmount(sub: typeof allActiveSubs.data[0]): number {
      return sub.items.data.reduce((sum: number, item: any) => {
        const price = item.price
        const qty = item.quantity ?? 1
        const unit = price.unit_amount ?? 0
        if (price.recurring?.interval === 'month') return sum + unit * qty
        if (price.recurring?.interval === 'year')  return sum + (unit * qty) / 12
        if (price.recurring?.interval === 'week')  return sum + unit * qty * 4.33
        return sum
      }, 0) / 100
    }

    const mrr = allActiveSubs.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)

    // Approximate previous MRR by removing new subs and adding back cancelled ones
    const newSubsMRR = newSubs30d.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
    const cancelledMRR = cancelledSubs30d.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
    const mrrPrevious = Math.max(0, mrr - newSubsMRR + cancelledMRR)
    const mrrGrowth = calculateMRRGrowth(mrr, mrrPrevious)

    // ── Revenue Reality: compute from balance transactions (more accurate) ──
    type BT = {
      amount: number
      fee: number
      net: number
      type: string
      created: number
    }
    const bt30 = balanceTx30dData as unknown as BT[]
    const btPrev30 = balanceTxPrev30dData as unknown as BT[]
    const bt7 = balanceTx7dData as unknown as BT[]
    const bt90 = balanceTx90dData as unknown as BT[]
    const bt365 = balanceTx365dData as unknown as BT[]

    const chargeTypes = new Set(['charge', 'payment'])
    const refundTypes = new Set(['refund'])
    const disputeTypes = new Set(['dispute', 'dispute_reversal'])

    function sumBT(list: BT[], pred: (t: BT) => boolean, field: keyof BT) {
      return list.filter(pred).reduce((s, t) => s + (t[field] as number), 0) / 100
    }

    const grossRevenue30d = sumBT(bt30, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const stripeFees30d = sumBT(bt30, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refundTotal30d = Math.abs(sumBT(bt30, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputeTotal30d = Math.abs(sumBT(bt30, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const netRevenue30d = grossRevenue30d - stripeFees30d - refundTotal30d - disputeTotal30d

    const grossRevenuePrev30d = sumBT(btPrev30, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const stripeFeesPrev30d = sumBT(btPrev30, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refundPrev30d = Math.abs(sumBT(btPrev30, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputePrev30d = Math.abs(sumBT(btPrev30, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const netRevenuePrev30d = grossRevenuePrev30d - stripeFeesPrev30d - refundPrev30d - disputePrev30d

    const revenue30d = netRevenue30d
    const revenuePrev30d = netRevenuePrev30d
    const revenueGrowth = calculateMRRGrowth(revenue30d, revenuePrev30d)
    const effectiveFeeRate = grossRevenue30d > 0 ? (stripeFees30d / grossRevenue30d) * 100 : 0

    // ── Passive churn: past-due subscriptions (failed payments) ──────────────
    const pastDue = pastDueSubs.data ?? []
    const failedPaymentsValue = pastDue.reduce((sum: number, sub: any) => sum + subToMonthlyAmount(sub), 0)
    const failedPaymentsCount = pastDue.length

    // ── Churn rate ───────────────────────────────────────────────────────────
    const activeAtStart = allActiveSubs.data.length + cancelledSubs30d.data.length
    const churnRate = calculateChurnRate(cancelledSubs30d.data.length, activeAtStart)

    // ── Cash & runway ────────────────────────────────────────────────────────
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100
    const pendingBalance   = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100

    // Estimate monthly burn from payouts (what went out the door)
    const payoutTotal = payouts30dData.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0) / 100
    const estimatedMonthlyBurn = payoutTotal + refundTotal30d
    const runway = calculateRunway(availableBalance, estimatedMonthlyBurn - mrr)

    // ── Daily revenue for chart (last 7 days, properly date-ordered) ─────────
    const last7Days = getLastNDays(7)
    const dailyMap: Record<string, number> = {}
    last7Days.forEach(d => { dailyMap[d] = 0 })

    bt7
      .filter((t) => chargeTypes.has(t.type) && t.amount > 0)
      .forEach((t) => {
        const date = new Date(t.created * 1000).toISOString().split('T')[0]
        if (date in dailyMap) dailyMap[date] += t.amount / 100
      })

    const dailyRevenue: DailyRevenue[] = last7Days.map(date => {
      const d = new Date(date)
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
      return { date, label, revenue: Math.round(dailyMap[date]) }
    })

    // ── MRR history (build from current + derive backwards — Phase 1 approx) ─
    // For Phase 1 we build a 6-month synthetic history based on growth rate
    // Phase 2 will store snapshots in DB
    const growthFactor = mrrGrowth / 100
    const mrrHistory = Array.from({ length: 7 }, (_, i) => {
      const monthsBack = 6 - i
      const historicalMrr = mrr / Math.pow(1 + growthFactor, monthsBack)
      const d = new Date()
      d.setMonth(d.getMonth() - monthsBack)
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        mrr: Math.round(Math.max(0, historicalMrr)),
      }
    })

    // ── Recent events feed ───────────────────────────────────────────────────
    const recentEvents: StripeEvent[] = charges30d.data.slice(0, 15).map(charge => {
      const isRefund = !!charge.refunded
      return {
        id: charge.id,
        type: isRefund ? 'refund' : 'payment',
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        description: charge.description || charge.billing_details?.name || 'Payment',
        customerId: typeof charge.customer === 'string' ? charge.customer : null,
        customerEmail: charge.billing_details?.email ?? null,
        created: charge.created,
        status: charge.status,
        positive: charge.paid && !charge.refunded,
      }
    })

    // ── Add subscription events ──────────────────────────────────────────────
    newSubs30d.data.slice(0, 5).forEach(sub => {
      recentEvents.push({
        id: sub.id,
        type: 'subscription',
        amount: subToMonthlyAmount(sub),
        currency: sub.currency?.toUpperCase() ?? 'USD',
        description: 'New subscription',
        customerId: typeof sub.customer === 'string' ? sub.customer : null,
        customerEmail: null,
        created: sub.created,
        status: 'active',
        positive: true,
      })
    })

    // Sort all events by most recent
    recentEvents.sort((a, b) => b.created - a.created)

    // ── Revenue by period (7, 30, 90, 365 days) ───────────────────────────────
    const gross7d = sumBT(bt7, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees7d = sumBT(bt7, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const gross90d = sumBT(bt90, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees90d = sumBT(bt90, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refunds90d = Math.abs(sumBT(bt90, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputes90d = Math.abs(sumBT(bt90, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))

    const gross365d = sumBT(bt365, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees365d = sumBT(bt365, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refunds365d = Math.abs(sumBT(bt365, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputes365d = Math.abs(sumBT(bt365, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const revenueByPeriod: RevenueByPeriod[] = [
      { period: '7d', gross: Math.round(gross7d), net: Math.round(gross7d - fees7d), fees: Math.round(fees7d) },
      { period: '30d', gross: Math.round(grossRevenue30d), net: Math.round(netRevenue30d), fees: Math.round(stripeFees30d) },
      { period: '90d', gross: Math.round(gross90d), net: Math.round(gross90d - fees90d - refunds90d - disputes90d), fees: Math.round(fees90d) },
      { period: '365d', gross: Math.round(gross365d), net: Math.round(gross365d - fees365d - refunds365d - disputes365d), fees: Math.round(fees365d) },
    ]

    // ── Cash flow forecast (30/60/90 days) ───────────────────────────────────
    const cashFlowForecast: CashFlowPeriod[] = [
      { period: '30d', projectedCash: Math.round(availableBalance + pendingBalance + mrr - estimatedMonthlyBurn), projectedRevenue: Math.round(mrr), projectedPayouts: Math.round(estimatedMonthlyBurn) },
      { period: '60d', projectedCash: Math.round(availableBalance + pendingBalance + mrr * 2 - estimatedMonthlyBurn * 2), projectedRevenue: Math.round(mrr * 2), projectedPayouts: Math.round(estimatedMonthlyBurn * 2) },
      { period: '90d', projectedCash: Math.round(availableBalance + pendingBalance + mrr * 3 - estimatedMonthlyBurn * 3), projectedRevenue: Math.round(mrr * 3), projectedPayouts: Math.round(estimatedMonthlyBurn * 3) },
    ]

    // ── Cohort retention (simplified from subscription creation months) ────────
    const cohortMap: Record<string, { total: number; retained: number }> = {}
    allActiveSubs.data.forEach(sub => {
      const month = new Date(sub.created * 1000).toISOString().slice(0, 7)
      if (!cohortMap[month]) cohortMap[month] = { total: 0, retained: 0 }
      cohortMap[month].total++
      cohortMap[month].retained++
    })
    cancelledSubs30d.data.forEach(sub => {
      const month = new Date(sub.created * 1000).toISOString().slice(0, 7)
      if (!cohortMap[month]) cohortMap[month] = { total: 0, retained: 0 }
      cohortMap[month].total++
    })
    const cohortRetention: CohortRetentionRow[] = Object.entries(cohortMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([cohortMonth, { total, retained }]) => ({
        cohortMonth,
        customers: total,
        retained,
        retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
      }))

    // ── Leakage summary ──────────────────────────────────────────────────────
    const leakageSummary: LeakageSummary = {
      refundTotal: Math.round(refundTotal30d),
      disputeTotal: Math.round(disputeTotal30d),
      feeTotal: Math.round(stripeFees30d),
      passiveChurnAtRisk: Math.round(failedPaymentsValue),
    }

    const accountCreatedAt = (account as any).created as number | undefined
    const accountAgeDays = accountCreatedAt
      ? Math.max(0, Math.floor((now - accountCreatedAt) / 86400))
      : 365

    const metrics: StripeMetrics = {
      mrr: Math.round(mrr),
      mrrPrevious: Math.round(mrrPrevious),
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      revenue30d: Math.round(revenue30d),
      revenuePrev30d: Math.round(revenuePrev30d),
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      grossRevenue30d: Math.round(grossRevenue30d),
      netRevenue30d: Math.round(netRevenue30d),
      stripeFees30d: Math.round(stripeFees30d),
      effectiveFeeRate: Math.round(effectiveFeeRate * 10) / 10,
      refundTotal30d: Math.round(refundTotal30d),
      disputeTotal30d: Math.round(disputeTotal30d),
      activeSubscriptions: allActiveSubs.data.length,
      newSubscriptions30d: newSubs30d.data.length,
      cancelledSubscriptions30d: cancelledSubs30d.data.length,
      churnRate: Math.round(churnRate * 10) / 10,
      failedPaymentsCount,
      failedPaymentsValue: Math.round(failedPaymentsValue),
      totalCustomers: allCustomers.data.length,
      newCustomers30d: newCustomers30d.data.length,
      availableBalance: Math.round(availableBalance),
      pendingBalance: Math.round(pendingBalance),
      estimatedMonthlyBurn: Math.round(estimatedMonthlyBurn),
      runway,
      payoutSchedule: (() => {
        const sched: any = (account as any)?.settings?.payouts?.schedule
        if (!sched) return 'unknown'
        const delayDays = sched.delay_days != null ? `${sched.delay_days} days` : null
        const interval = sched.interval ? String(sched.interval).replace('_', ' ') : null
        return [delayDays, interval].filter(Boolean).join(' · ') || 'unknown'
      })(),
      cashFlowForecast,
      cohortRetention,
      dailyRevenue,
      mrrHistory,
      revenueByPeriod,
      recentEvents: recentEvents.slice(0, 20),
      leakageSummary,
      accountAgeDays,
      currency: balance.available[0]?.currency?.toUpperCase() ?? 'USD',
      fetchedAt: now,
    }

    if (isNewFounder(accountAgeDays)) {
      try {
        const benchmarks = await benchmarksForMetrics(metrics)
        if (benchmarks) metrics.benchmarks = benchmarks
      } catch {
        // Benchmarks are best-effort
      }
    }

    await Promise.all([
      saveSnapshot(userId, metrics),
      rememberStripeAccountOwner(account.id, userId),
      ...allCustomers.data
        .filter((customer: any) => typeof customer.id === 'string')
        .map((customer: any) => rememberStripeCustomerOwner(customer.id, userId)),
      ...Array.from(
        new Set(
          [
            ...allActiveSubs.data,
            ...newSubs30d.data,
            ...cancelledSubs30d.data,
            ...pastDueSubs.data,
          ]
            .map((sub: any) => sub.id)
            .filter(Boolean)
        )
      ).map((subscriptionId: string) => rememberStripeSubscriptionOwner(subscriptionId, userId)),
    ])

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[stripe/data] error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch Stripe data' },
      { status: error.statusCode ?? 500 }
    )
  }
}
