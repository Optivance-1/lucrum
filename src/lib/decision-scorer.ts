import type { DecisionScore, StripeMetrics, StripeCustomer } from '@/types'

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function composite(s: DecisionScore['scores']): number {
  return (
    s.revenueImpact * 0.35 +
    s.timeToRevenue * 0.20 +
    s.confidence * 0.20 +
    s.reversibility * 0.10 +
    s.burnImpact * 0.10 +
    s.churnImpact * 0.05
  )
}

function scoreRetryPayment(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.failedPaymentsCount <= 0) return null
  const failedAmount = metrics.failedPaymentsValue
  const scores = {
    revenueImpact: clamp((failedAmount / Math.max(1, metrics.mrr)) * 200, 0, 100),
    timeToRevenue: 95,
    confidence: 78,
    reversibility: 100,
    burnImpact: 0,
    churnImpact: 60,
  }
  return {
    actionType: 'retry_payment',
    label: 'Retry failed payments',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 5,
    estimatedDollarImpact: failedAmount * 0.78,
    worstCaseImpact: 0,
    successProbability: 0.78,
    timeToImpact: 'immediate',
  }
}

function scoreChurnRecovery(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.churnRate <= 2 && metrics.failedPaymentsCount === 0) return null
  const atRiskMRR = metrics.failedPaymentsValue + (metrics.cancelledSubscriptions30d * (metrics.mrr / Math.max(1, metrics.activeSubscriptions)))
  const scores = {
    revenueImpact: clamp((atRiskMRR / Math.max(1, metrics.mrr)) * 150, 0, 100),
    timeToRevenue: 50,
    confidence: 32,
    reversibility: 100,
    burnImpact: 0,
    churnImpact: 85,
  }
  return {
    actionType: 'send_churn_recovery_email',
    label: 'Send churn recovery emails',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 5,
    estimatedDollarImpact: atRiskMRR * 0.32 * 12,
    worstCaseImpact: 0,
    successProbability: 0.32,
    timeToImpact: 'days',
  }
}

function scoreApplyCoupon(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.failedPaymentsValue <= 0 && metrics.cancelledSubscriptions30d <= 0) return null
  const avgCustomerMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const discountCost = avgCustomerMRR * 0.20 * 3
  const scores = {
    revenueImpact: clamp(((avgCustomerMRR * 12 * 0.55) - discountCost) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 70,
    confidence: 55,
    reversibility: 40,
    burnImpact: -20,
    churnImpact: 90,
  }
  return {
    actionType: 'apply_coupon',
    label: 'Offer retention coupons',
    params: { discountPercent: 20, durationMonths: 3 },
    scores,
    compositeScore: composite(scores),
    riskTier: 3,
    estimatedDollarImpact: (avgCustomerMRR * 12 * 0.55) - discountCost,
    worstCaseImpact: -discountCost,
    successProbability: 0.55,
    timeToImpact: 'days',
  }
}

function scoreRaisePrice(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.mrr <= 0) return null
  const projectedChurn = metrics.activeSubscriptions * 0.08
  const avgSub = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const scores = {
    revenueImpact: clamp((metrics.mrr * 0.15 - projectedChurn * avgSub) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 30,
    confidence: 45,
    reversibility: 20,
    burnImpact: 0,
    churnImpact: -40,
  }
  return {
    actionType: 'raise_price',
    label: 'Raise prices 15%',
    params: { percentIncrease: 15 },
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.mrr * 0.15 * 0.92,
    worstCaseImpact: -(projectedChurn * avgSub * 12),
    successProbability: 0.45,
    timeToImpact: 'weeks',
  }
}

function scoreExpansionCampaign(metrics: StripeMetrics, customers: StripeCustomer[]): DecisionScore | null {
  const eligible = customers.filter(c => c.expansionEligible)
  if (!eligible.length) return null
  const avgCustomerMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const upgradeValue = avgCustomerMRR * 0.5
  const scores = {
    revenueImpact: clamp((eligible.length * upgradeValue * 0.18) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 35,
    confidence: 18,
    reversibility: 100,
    burnImpact: -10,
    churnImpact: 10,
  }
  return {
    actionType: 'launch_expansion_campaign',
    label: 'Launch expansion campaign',
    params: { eligibleCount: eligible.length },
    scores,
    compositeScore: composite(scores),
    riskTier: 4,
    estimatedDollarImpact: eligible.length * upgradeValue * 0.18,
    worstCaseImpact: 0,
    successProbability: 0.18,
    timeToImpact: 'weeks',
  }
}

function scoreCutBurn(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.runway >= 120) return null
  const scores = {
    revenueImpact: 0,
    timeToRevenue: 95,
    confidence: 80,
    reversibility: 30,
    burnImpact: 100,
    churnImpact: 0,
  }
  return {
    actionType: 'cut_burn_aggressively',
    label: 'Cut burn 30%',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.estimatedMonthlyBurn * 0.30,
    worstCaseImpact: metrics.estimatedMonthlyBurn * 0.30 * -0.5,
    successProbability: 0.80,
    timeToImpact: 'immediate',
  }
}

function scoreRaiseCapital(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.mrr <= 1000) return null
  const qualifyMultiplier = metrics.mrr > 10000 ? 0.70 : 0.30
  const scores = {
    revenueImpact: 70,
    timeToRevenue: 40,
    confidence: qualifyMultiplier * 100,
    reversibility: 20,
    burnImpact: 90,
    churnImpact: 0,
  }
  return {
    actionType: 'raise_external_capital',
    label: 'Raise external capital',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.mrr * 12 * 0.5,
    worstCaseImpact: -(metrics.mrr * 12 * 0.5 * 1.06),
    successProbability: qualifyMultiplier,
    timeToImpact: 'months',
  }
}

function scoreDoNothing(metrics: StripeMetrics): DecisionScore {
  return {
    actionType: 'do_nothing',
    label: 'Do nothing',
    params: {},
    scores: {
      revenueImpact: 0,
      timeToRevenue: 0,
      confidence: 0,
      reversibility: 0,
      burnImpact: 0,
      churnImpact: 0,
    },
    compositeScore: 0,
    riskTier: 5,
    estimatedDollarImpact: 0,
    worstCaseImpact: -(metrics.availableBalance),
    successProbability: 1.0,
    timeToImpact: 'immediate',
  }
}

export function scoreDecisions(
  metrics: StripeMetrics,
  customers: StripeCustomer[]
): DecisionScore[] {
  const all: (DecisionScore | null)[] = [
    scoreRetryPayment(metrics),
    scoreChurnRecovery(metrics),
    scoreApplyCoupon(metrics),
    scoreRaisePrice(metrics),
    scoreExpansionCampaign(metrics, customers),
    scoreCutBurn(metrics),
    scoreRaiseCapital(metrics),
    scoreDoNothing(metrics),
  ]

  return all
    .filter((d): d is DecisionScore => d !== null)
    .sort((a, b) => b.compositeScore - a.compositeScore)
}
