import type {
  CashFlowPeriod,
  CohortRetentionRow,
  DailyRevenue,
  LeakageSummary,
  MonthlyMRR,
  RevenueByPeriod,
  StripeEvent,
  StripeMetrics,
} from '@/types'
import type { SimulationBaseline } from '@/lib/simulation'

function isTruthyFlag(value: string | null | undefined): boolean {
  if (!value) return false
  return /^(1|true|yes|on)$/i.test(value.trim())
}

export function isDemoModeEnabled(queryFlag?: string | null): boolean {
  const envFlag =
    process.env.LUCRUM_DEMO_MODE ??
    process.env.NEXT_PUBLIC_DEMO_MODE ??
    ''

  return isTruthyFlag(envFlag) || isTruthyFlag(queryFlag)
}

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

function buildDailyRevenue(): DailyRevenue[] {
  const values = [780, 920, 865, 1120, 980, 1415, 1260]
  return getLastNDays(7).map((date, index) => {
    const d = new Date(date)
    return {
      date,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      revenue: values[index] ?? 0,
    }
  })
}

function buildMrrHistory(): MonthlyMRR[] {
  const values = [18200, 19850, 21420, 23210, 24870, 26740, 28420]
  return Array.from({ length: 7 }, (_, i) => {
    const monthsBack = 6 - i
    const d = new Date()
    d.setMonth(d.getMonth() - monthsBack)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      mrr: values[i] ?? values[values.length - 1],
    }
  })
}

function buildCashFlowForecast(): CashFlowPeriod[] {
  return [
    { period: '30d', projectedCash: 49800, projectedRevenue: 30110, projectedPayouts: 25200 },
    { period: '60d', projectedCash: 55100, projectedRevenue: 61600, projectedPayouts: 51600 },
    { period: '90d', projectedCash: 60700, projectedRevenue: 94200, projectedPayouts: 78600 },
  ]
}

function buildCohortRetention(): CohortRetentionRow[] {
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
  const rows = [
    { customers: 18, retained: 12 },
    { customers: 22, retained: 16 },
    { customers: 24, retained: 18 },
    { customers: 30, retained: 24 },
    { customers: 34, retained: 30 },
    { customers: 39, retained: 36 },
  ]
  return months.map((cohortMonth, i) => ({
    cohortMonth,
    customers: rows[i]?.customers ?? 0,
    retained: rows[i]?.retained ?? 0,
    retentionRate: rows[i] ? Math.round((rows[i].retained / rows[i].customers) * 100) : 0,
  }))
}

function buildRevenueByPeriod(): RevenueByPeriod[] {
  return [
    { period: '7d', gross: 9320, net: 8610, fees: 410 },
    { period: '30d', gross: 33680, net: 30110, fees: 1560 },
    { period: '90d', gross: 94220, net: 84600, fees: 4530 },
    { period: '365d', gross: 321200, net: 288600, fees: 15320 },
  ]
}

function buildRecentEvents(now: number): StripeEvent[] {
  const base = now - 3600
  return [
    {
      id: 'evt_demo_1',
      type: 'payment',
      amount: 299,
      currency: 'USD',
      description: 'Pro plan renewal',
      customerId: 'cus_demo_001',
      customerEmail: 'founder1@demo-saas.com',
      created: base,
      status: 'succeeded',
      positive: true,
    },
    {
      id: 'evt_demo_2',
      type: 'refund',
      amount: 49,
      currency: 'USD',
      description: 'Partial refund - annual downgrade',
      customerId: 'cus_demo_002',
      customerEmail: 'ops@demo-saas.com',
      created: base - 8200,
      status: 'succeeded',
      positive: false,
    },
    {
      id: 'evt_demo_3',
      type: 'subscription',
      amount: 149,
      currency: 'USD',
      description: 'New subscription',
      customerId: 'cus_demo_003',
      customerEmail: 'growth@demo-saas.com',
      created: base - 11200,
      status: 'active',
      positive: true,
    },
    {
      id: 'evt_demo_4',
      type: 'payout',
      amount: 4200,
      currency: 'USD',
      description: 'Weekly payout',
      customerId: null,
      customerEmail: null,
      created: base - 20000,
      status: 'paid',
      positive: false,
    },
    {
      id: 'evt_demo_5',
      type: 'payment',
      amount: 99,
      currency: 'USD',
      description: 'Starter plan renewal',
      customerId: 'cus_demo_004',
      customerEmail: 'finance@demo-saas.com',
      created: base - 28800,
      status: 'succeeded',
      positive: true,
    },
  ]
}

export function createMockStripeMetrics(): StripeMetrics {
  const now = Math.floor(Date.now() / 1000)
  const leakageSummary: LeakageSummary = {
    refundTotal: 820,
    disputeTotal: 230,
    feeTotal: 1560,
    passiveChurnAtRisk: 1420,
  }

  return {
    mrr: 28420,
    mrrPrevious: 26740,
    mrrGrowth: 6.3,
    revenue30d: 30110,
    revenuePrev30d: 27640,
    revenueGrowth: 8.9,
    grossRevenue30d: 33680,
    netRevenue30d: 30110,
    stripeFees30d: 1560,
    effectiveFeeRate: 4.6,
    refundTotal30d: 820,
    disputeTotal30d: 230,
    activeSubscriptions: 196,
    newSubscriptions30d: 31,
    cancelledSubscriptions30d: 12,
    churnRate: 5.8,
    failedPaymentsCount: 9,
    failedPaymentsValue: 1420,
    totalCustomers: 238,
    newCustomers30d: 36,
    availableBalance: 45100,
    pendingBalance: 9700,
    estimatedMonthlyBurn: 25200,
    runway: 333,
    payoutSchedule: '2 days · daily',
    cashFlowForecast: buildCashFlowForecast(),
    cohortRetention: buildCohortRetention(),
    dailyRevenue: buildDailyRevenue(),
    mrrHistory: buildMrrHistory(),
    revenueByPeriod: buildRevenueByPeriod(),
    recentEvents: buildRecentEvents(now),
    leakageSummary,
    currency: 'USD',
    fetchedAt: now,
  }
}

export function createMockSimulationBaseline(): SimulationBaseline {
  return {
    currentMrr: 28420,
    availableCash: 49950,
    monthlyRevenueMean: 30110,
    monthlyRevenueStdDev: 4200,
    monthlyOperatingOutflow: 25200,
    monthlyChurnRate: 0.058,
    expectedMonthlyChurnEvents: 4,
    avgRevenuePerSubscription: 145,
    margin: 0.16,
    monthlyGrowthRate: 0.035,
    monthlyGrowthVolatility: 0.03,
  }
}
