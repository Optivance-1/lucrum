// ─── Stripe Data ────────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string      // YYYY-MM-DD  (not weekday name — ordered correctly)
  label: string     // "Mon 3", "Tue 4" etc — display label
  revenue: number
}

export interface MonthlyMRR {
  month: string     // "Jan", "Feb" etc
  mrr: number
}

export interface StripeMetrics {
  // Core financials
  mrr: number
  mrrPrevious: number
  mrrGrowth: number          // % change MoM
  revenue30d: number         // total paid charges last 30 days (net)
  revenuePrev30d: number     // total paid charges 31-60 days ago
  revenueGrowth: number      // % change

  // Revenue Reality (Gross vs Net)
  grossRevenue30d: number    // before fees, refunds, disputes
  netRevenue30d: number     // after fees, refunds, disputes
  stripeFees30d: number     // total Stripe fees in period
  effectiveFeeRate: number   // % of gross revenue as fees
  refundTotal30d: number
  disputeTotal30d: number

  // Subscriptions
  activeSubscriptions: number
  newSubscriptions30d: number
  cancelledSubscriptions30d: number
  churnRate: number          // % of subs that cancelled

  // Passive churn (failed payments)
  failedPaymentsCount: number
  failedPaymentsValue: number  // MRR at risk

  // Customers
  totalCustomers: number
  newCustomers30d: number

  // Cash
  availableBalance: number
  pendingBalance: number
  estimatedMonthlyBurn: number  // expenses approximated from payouts + refunds
  runway: number                // days
  payoutSchedule: string        // e.g. "2 business days"

  // Cash flow forecast (30/60/90 days)
  cashFlowForecast: CashFlowPeriod[]

  // Cohort retention (simplified)
  cohortRetention: CohortRetentionRow[]

  // Charts
  dailyRevenue: DailyRevenue[]
  mrrHistory: MonthlyMRR[]
  revenueByPeriod: RevenueByPeriod[]  // 7, 30, 90, 365 day views

  // Activity feed
  recentEvents: StripeEvent[]

  // Leakage
  leakageSummary: LeakageSummary

  // Meta
  currency: string
  fetchedAt: number  // unix timestamp
}

export interface CashFlowPeriod {
  period: string   // "30d" | "60d" | "90d"
  projectedCash: number
  projectedRevenue: number
  projectedPayouts: number
}

export interface CohortRetentionRow {
  cohortMonth: string   // "2025-01"
  customers: number
  retained: number
  retentionRate: number
}

export interface RevenueByPeriod {
  period: string
  gross: number
  net: number
  fees: number
}

export interface LeakageSummary {
  refundTotal: number
  disputeTotal: number
  feeTotal: number
  passiveChurnAtRisk: number
}

export interface StripeEvent {
  id: string
  type: 'payment' | 'subscription' | 'refund' | 'dispute' | 'payout' | 'other'
  amount: number
  currency: string
  description: string
  customerId: string | null
  customerEmail: string | null
  created: number
  status: string
  positive: boolean
}

// ─── AI ─────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'win'

export interface AIInsight {
  id: string
  type: InsightSeverity
  title: string
  body: string
  action: string
  metric?: string   // e.g. "47 days"
  priority: 1 | 2 | 3  // 1 = highest
}

export interface CFOContext {
  mrr: number
  mrrGrowth: number
  revenue30d: number
  revenueGrowth: number
  activeSubscriptions: number
  newSubscriptions30d: number
  churnRate: number
  newCustomers30d: number
  availableBalance: number
  runway: number
  cancelledSubscriptions30d: number
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ─── Simulation ────────────────────────────────────────────────────────────

export interface SimulationPercentiles {
  p10: number
  p50: number
  p90: number
}

export interface SimulateResponse {
  user_id: string | null
  scenario: string
  scenario_summary: string
  iterations: number
  runway_p10: number
  runway_p50: number
  runway_p90: number
  runway_best: number
  runway_worst: number
  cash_at_6_months: SimulationPercentiles
  cash_at_12_months: SimulationPercentiles
  cash_at_18_months: SimulationPercentiles
  confidence: number
  advice: string
  advice_confidence: number
  advice_source: 'gemini' | 'anthropic' | 'fallback'
  baseline: {
    current_mrr: number
    available_cash: number
    monthly_revenue_mean: number
    monthly_revenue_std_dev: number
    monthly_operating_outflow: number
    monthly_churn_rate_pct: number
    monthly_growth_rate_pct: number
  }
  generated_at: string
}
