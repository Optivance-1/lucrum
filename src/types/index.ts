// ─── Plan & Billing ────────────────────────────────────────────────────────

export type Plan = 'demo' | 'solo' | 'enterprise'
export type BillingInterval = 'month' | 'year'

export interface Subscription {
  plan: Plan
  interval?: BillingInterval
  activatedAt?: number
  expiresAt?: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  teamMembers?: string[]
  connectedAccounts?: string[]
  apiKey?: string
}

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

  // Account age (for new-founder experience)
  accountAgeDays: number
  benchmarks?: BenchmarkReport

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

  // Simulation (attached after compute)
  simulation?: SimulationResult
  topDecisions?: DecisionScore[]
  customers?: StripeCustomer[]

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

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'win' | 'affiliate'

export interface AIInsight {
  id: string
  type: InsightSeverity
  title: string
  body: string
  action: string
  affiliateUrl?: string
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
  accountAgeDays?: number
  benchmarks?: BenchmarkReport
  simulation?: SimulationResult
  topMove?: Move
  estimatedMonthlyBurn?: number
  failedPaymentsValue?: number
  failedPaymentsCount?: number
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ─── Stripe Customers ──────────────────────────────────────────────────────

export interface StripeCustomer {
  id: string
  email: string
  name: string
  created: number
  subscriptionId?: string
  subscriptionStatus?: string
  plan?: string
  mrr: number
  totalRevenue: number
  lastPaymentStatus?: string
  lastPaymentDate?: number
  churnRisk: 'low' | 'medium' | 'high'
  expansionEligible: boolean
  daysSinceCreated: number
}

// ─── Decision Scorer ───────────────────────────────────────────────────────

export interface DecisionScoreBreakdown {
  revenueImpact: number
  timeToRevenue: number
  confidence: number
  reversibility: number
  burnImpact: number
  churnImpact: number
}

export interface DecisionScore {
  actionType: string
  label: string
  params: Record<string, any>
  scores: DecisionScoreBreakdown
  compositeScore: number
  riskTier: 1 | 2 | 3 | 4 | 5
  estimatedDollarImpact: number
  worstCaseImpact: number
  successProbability: number
  timeToImpact: 'immediate' | 'days' | 'weeks' | 'months'
}

// ─── Monte Carlo Simulation ────────────────────────────────────────────────

export interface RunwayDistribution {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  mean: number
  probabilityOf60Days: number
  probabilityOf90Days: number
  probabilityOf180Days: number
  probabilityOf365Days: number
  probabilityOf730Days: number
}

export interface ForecastPoint {
  p25: number
  p50: number
  p75: number
}

export interface MRRForecast {
  month3: ForecastPoint
  month6: ForecastPoint
  month12: ForecastPoint
  month24: ForecastPoint
}

export interface SimScenario {
  probability: number
  runway: number
  mrr3mo: number
  mrr12mo: number
  description: string
}

export interface SimulationResult {
  runway: RunwayDistribution
  mrrForecast: MRRForecast
  scenarios: { bear: SimScenario; base: SimScenario; bull: SimScenario }
  riskScore: number
  volatilityScore: number
  breakEvenProbability: number
  baselineRunwayP50: number
  decisionLiftP50: number
  nSimulations: number
  computedAt: number
  horizonMonths: number
}

export interface SimulationConfig {
  currentMRR: number
  currentBalance: number
  monthlyBurn: number
  mrrGrowthRate: number
  churnRate: number
  appliedDecision?: {
    actionType: string
    successProbability: number
  } | null
}

// ─── Five Moves ────────────────────────────────────────────────────────────

export type MoveRisk = 'cutthroat' | 'aggressive' | 'balanced' | 'conservative' | 'safe'

export interface Move {
  rank: 1 | 2 | 3 | 4 | 5
  risk: MoveRisk
  riskLabel: string
  riskColor: string
  title: string
  summary: string
  rationale: string
  tradeoff: string
  actions: DecisionScore[]
  simulation: SimulationResult
  metrics: {
    expectedRunwayGain: number
    expectedMRRAt90d: number
    expectedMRRAt365d: number
    survivalProbability: number
    expectedDollarImpact: number
    riskOfBackfire: number
    compositeScore: number
  }
  maxStatement: string
  timeToExecute: string
}

export interface FiveMovesResult {
  moves: Move[]
  baselineSimulation: SimulationResult
  generatedAt: number
  dataQuality: 'high' | 'medium' | 'low'
}

// ─── Legacy Simulation (kept for forecasts page) ───────────────────────────

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
  advice_source: 'groq' | 'gemini' | 'fallback'
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

// ─── Comp Benchmarks ────────────────────────────────────────────────────────

export type CompSource = 'indiehackers' | 'twitter' | 'producthunt' | 'microacquire'
export type CompCategory = 'SaaS' | 'API' | 'tool' | 'marketplace' | 'other'

export interface CompDataPoint {
  id: string
  source: CompSource
  mrr: number
  monthsOld: number
  category: CompCategory
  churnRate?: number
  growthRateMoM?: number
  teamSize?: number
  notes?: string
  scrapedAt: number
}

export interface BenchmarkReport {
  compCount: number
  medianMRR: number
  p25MRR: number
  p75MRR: number
  medianGrowthRate?: number
  medianChurnRate?: number
  topPerformerMRR: number
  similarBusinesses: CompDataPoint[]
  dataFreshness: number
  sources: string[]
}

// ─── Action Engine ──────────────────────────────────────────────────────────

export interface ActionCard {
  id: string
  priority: 1 | 2 | 3
  severity: 'critical' | 'warning' | 'opportunity' | 'win'
  title: string
  context: string
  estimatedImpact: string
  actionType: string
  actionLabel: string
  params: Record<string, any>
  isDestructive: boolean
  requiresConfirmText: boolean
  affectedCustomerCount?: number
}

// ─── Affiliates ─────────────────────────────────────────────────────────────

export interface AffiliateProduct {
  id: string
  name: string
  category: 'financing' | 'credit' | 'accounting' | 'saas_lending'
  tagline: string
  description: string
  ctaText: string
  affiliateUrl: string
  affiliateCode?: string
  triggerConditions: {
    minMRR?: number
    maxMRR?: number
    minRunway?: number
    maxRunway?: number
    minChurn?: number
    accountAgeDays?: number
    requiresRevenue?: boolean
  }
  maxRecommendationContext: string
  priority: number
}
