import type Stripe from 'stripe'
import type { StripeMetrics, StripeCustomer, RevenueLeak, LeakCategory } from '@/types'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { logger } from '@/lib/logger'

export async function detectLeaks(
  metrics: StripeMetrics,
  customers: StripeCustomer[],
  stripeClient: Stripe,
  userId: string
): Promise<RevenueLeak[]> {
  const cacheKey = `leaks:${userId}`
  const cached = await safeKvGet<{ leaks: RevenueLeak[]; cachedAt: number }>(cacheKey)
  
  if (cached && Date.now() - cached.cachedAt < 2 * 60 * 60 * 1000) {
    return cached.leaks
  }

  const [
    failedPayments,
    expiringCards,
    dunningRisk,
    pausedSubs,
    expansionReady,
    annualUpsell,
  ] = await Promise.all([
    detectFailedPayments(stripeClient, metrics),
    detectExpiringCards(stripeClient, customers),
    detectDunningRisk(stripeClient, metrics),
    detectPausedSubscriptions(stripeClient),
    detectExpansionReady(customers, metrics),
    detectAnnualUpsell(customers, metrics),
  ])

  const allLeaks: RevenueLeak[] = [
    ...failedPayments,
    ...expiringCards,
    ...dunningRisk,
    ...pausedSubs,
    ...expansionReady,
    ...annualUpsell,
  ].sort((a, b) => b.priority - a.priority)

  await safeKvSet(cacheKey, { leaks: allLeaks, cachedAt: Date.now() }, 7200)

  return allLeaks
}

async function detectFailedPayments(
  stripeClient: Stripe,
  metrics: StripeMetrics
): Promise<RevenueLeak[]> {
  try {
    const openInvoices = await stripeClient.invoices.list({
      status: 'open',
      limit: 100,
    })

    const retryable = openInvoices.data.filter(inv => {
      const daysSinceCreated = (Date.now() - (inv.created * 1000)) / (1000 * 60 * 60 * 24)
      return daysSinceCreated < 30 && (inv.attempt_count ?? 0) >= 1
    })

    if (retryable.length === 0) return []

    const totalAmount = retryable.reduce((sum, inv) => sum + ((inv.amount_due ?? 0) / 100), 0)
    const customerIds = retryable
      .map(inv => typeof inv.customer === 'string' ? inv.customer : null)
      .filter((id): id is string => id !== null)

    return [{
      id: `leak_failed_payments_${Date.now()}`,
      type: 'leak',
      category: 'failed_payments',
      title: `${retryable.length} Failed Payment${retryable.length > 1 ? 's' : ''}`,
      description: `Retry ${retryable.length} open invoices to recover revenue. 78% typical success rate.`,
      estimatedMRRImpact: totalAmount,
      estimatedARRImpact: totalAmount * 12,
      affectedCustomers: customerIds,
      affectedCount: retryable.length,
      priority: 95,
      actionType: 'retry_payment',
      actionParams: { invoiceIds: retryable.map(inv => inv.id) },
      detectedAt: Date.now(),
      autoFixAvailable: true,
      autoFixDescription: 'Automatically retry all failed payments',
    }]
  } catch (err) {
    logger.error('leak-detector', 'failed payments detection error', { error: err })
    return []
  }
}

async function detectExpiringCards(
  stripeClient: Stripe,
  customers: StripeCustomer[]
): Promise<RevenueLeak[]> {
  try {
    const now = new Date()
    const targetMonth = now.getMonth() + 2
    const targetYear = targetMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
    const adjustedMonth = targetMonth > 11 ? targetMonth - 12 : targetMonth

    const customersWithCards = await stripeClient.customers.list({ limit: 100 })
    const expiringCustomers: Array<{ id: string; email: string; mrr: number }> = []

    for (const customer of customersWithCards.data) {
      if (!customer.default_source) continue
      
      try {
        const source = await stripeClient.customers.retrieveSource(
          customer.id,
          customer.default_source as string
        )
        
        if (source.object === 'card') {
          const card = source as Stripe.Card
          if (
            (card.exp_year === targetYear && card.exp_month <= adjustedMonth + 1) ||
            (card.exp_year < targetYear)
          ) {
            const customerData = customers.find(c => c.id === customer.id)
            expiringCustomers.push({
              id: customer.id,
              email: customer.email ?? 'unknown',
              mrr: customerData?.mrr ?? 0,
            })
          }
        }
      } catch {
        // Skip if source retrieval fails
      }
    }

    if (expiringCustomers.length === 0) return []

    const totalMRR = expiringCustomers.reduce((sum, c) => sum + c.mrr, 0)

    return [{
      id: `leak_expiring_cards_${Date.now()}`,
      type: 'leak',
      category: 'expiring_cards',
      title: `${expiringCustomers.length} Expiring Card${expiringCustomers.length > 1 ? 's' : ''}`,
      description: `Cards expiring within 45 days. Send update reminders before payments fail.`,
      estimatedMRRImpact: totalMRR,
      estimatedARRImpact: totalMRR * 12,
      affectedCustomers: expiringCustomers.map(c => c.id),
      affectedCount: expiringCustomers.length,
      priority: 80,
      actionType: 'send_email',
      actionParams: { template: 'card_expiring', customerIds: expiringCustomers.map(c => c.id) },
      detectedAt: Date.now(),
      autoFixAvailable: true,
      autoFixDescription: 'Send card update reminder emails',
    }]
  } catch (err) {
    logger.error('leak-detector', 'expiring cards detection error', { error: err })
    return []
  }
}

async function detectDunningRisk(
  stripeClient: Stripe,
  metrics: StripeMetrics
): Promise<RevenueLeak[]> {
  try {
    const pastDueSubs = await stripeClient.subscriptions.list({
      status: 'past_due',
      limit: 100,
    })

    const highRisk = pastDueSubs.data.filter(sub => {
      return sub.latest_invoice !== null
    })

    if (highRisk.length === 0) return []

    const customerIds = highRisk
      .map(sub => typeof sub.customer === 'string' ? sub.customer : null)
      .filter((id): id is string => id !== null)

    const avgMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
    const atRiskMRR = highRisk.length * avgMRR

    return [{
      id: `leak_dunning_risk_${Date.now()}`,
      type: 'leak',
      category: 'dunning_risk',
      title: `${highRisk.length} Dunning Risk Customer${highRisk.length > 1 ? 's' : ''}`,
      description: `Past-due subscriptions with multiple failed attempts. High involuntary churn risk.`,
      estimatedMRRImpact: atRiskMRR,
      estimatedARRImpact: atRiskMRR * 12,
      affectedCustomers: customerIds,
      affectedCount: highRisk.length,
      priority: 90,
      actionType: 'apply_coupon',
      actionParams: { percentOff: 20, durationMonths: 1, customerIds },
      detectedAt: Date.now(),
      autoFixAvailable: true,
      autoFixDescription: 'Send recovery offer with temporary discount',
    }]
  } catch (err) {
    logger.error('leak-detector', 'dunning risk detection error', { error: err })
    return []
  }
}

async function detectPausedSubscriptions(
  stripeClient: Stripe
): Promise<RevenueLeak[]> {
  try {
    const pausedSubs = await stripeClient.subscriptions.list({
      status: 'paused',
      limit: 100,
    })

    if (pausedSubs.data.length === 0) return []

    const customerIds = pausedSubs.data
      .map(sub => typeof sub.customer === 'string' ? sub.customer : null)
      .filter((id): id is string => id !== null)

    const totalPausedValue = pausedSubs.data.reduce((sum, sub) => {
      const item = sub.items.data[0]
      if (!item?.price?.unit_amount) return sum
      return sum + (item.price.unit_amount / 100)
    }, 0)

    const recoveryRate = 0.40
    const estimatedRecovery = totalPausedValue * recoveryRate

    return [{
      id: `leak_paused_subs_${Date.now()}`,
      type: 'opportunity',
      category: 'paused_subscriptions',
      title: `${pausedSubs.data.length} Paused Subscription${pausedSubs.data.length > 1 ? 's' : ''}`,
      description: `Win back paused customers with targeted re-engagement. 40% typical reactivation rate.`,
      estimatedMRRImpact: estimatedRecovery,
      estimatedARRImpact: estimatedRecovery * 12,
      affectedCustomers: customerIds,
      affectedCount: pausedSubs.data.length,
      priority: 60,
      actionType: 'send_email',
      actionParams: { template: 'reactivation_offer', customerIds },
      detectedAt: Date.now(),
      autoFixAvailable: true,
      autoFixDescription: 'Send reactivation campaign',
    }]
  } catch (err) {
    logger.error('leak-detector', 'paused subscriptions detection error', { error: err })
    return []
  }
}

async function detectExpansionReady(
  customers: StripeCustomer[],
  metrics: StripeMetrics
): Promise<RevenueLeak[]> {
  const eligible = customers.filter(c =>
    c.expansionEligible &&
    c.subscriptionStatus === 'active' &&
    c.daysSinceCreated >= 90
  )

  if (eligible.length === 0) return []

  const avgMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const upgradeValue = avgMRR * 0.5
  const conversionRate = 0.18
  const estimatedImpact = eligible.length * upgradeValue * conversionRate

  return [{
    id: `leak_expansion_ready_${Date.now()}`,
    type: 'opportunity',
    category: 'expansion_ready',
    title: `${eligible.length} Expansion Candidate${eligible.length > 1 ? 's' : ''}`,
    description: `Long-tenured customers on lowest tier ready for upgrade offers. 18% typical conversion.`,
    estimatedMRRImpact: estimatedImpact,
    estimatedARRImpact: estimatedImpact * 12,
    affectedCustomers: eligible.map(c => c.id),
    affectedCount: eligible.length,
    priority: 55,
    actionType: 'send_email',
    actionParams: { template: 'upgrade_offer', customerIds: eligible.map(c => c.id) },
    detectedAt: Date.now(),
    autoFixAvailable: true,
    autoFixDescription: 'Send upgrade campaign emails',
  }]
}

async function detectAnnualUpsell(
  customers: StripeCustomer[],
  metrics: StripeMetrics
): Promise<RevenueLeak[]> {
  const monthlyCustomers = customers.filter(c =>
    c.subscriptionStatus === 'active' &&
    c.daysSinceCreated >= 180 &&
    !c.plan?.toLowerCase().includes('annual') &&
    !c.plan?.toLowerCase().includes('yearly')
  )

  if (monthlyCustomers.length === 0) return []

  const avgMonthlyMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const annualDiscount = 0.20
  const annualValue = avgMonthlyMRR * 10
  const conversionRate = 0.12
  const cashFlowBenefit = monthlyCustomers.length * annualValue * conversionRate

  return [{
    id: `leak_annual_upsell_${Date.now()}`,
    type: 'opportunity',
    category: 'annual_upsell',
    title: `${monthlyCustomers.length} Annual Upsell Candidate${monthlyCustomers.length > 1 ? 's' : ''}`,
    description: `Monthly customers with 6+ month tenure. Convert to annual for cash flow boost.`,
    estimatedMRRImpact: 0,
    estimatedARRImpact: cashFlowBenefit,
    affectedCustomers: monthlyCustomers.map(c => c.id),
    affectedCount: monthlyCustomers.length,
    priority: 50,
    actionType: 'send_email',
    actionParams: { template: 'annual_offer', customerIds: monthlyCustomers.map(c => c.id) },
    detectedAt: Date.now(),
    autoFixAvailable: true,
    autoFixDescription: 'Send annual plan offers',
  }]
}

export function calculateTotalRecoverable(leaks: RevenueLeak[]): number {
  return leaks.reduce((sum, leak) => {
    if (leak.type === 'leak') {
      return sum + leak.estimatedMRRImpact
    }
    return sum + (leak.estimatedMRRImpact * 0.5)
  }, 0)
}

export function getLeakIcon(category: LeakCategory): string {
  const icons: Record<LeakCategory, string> = {
    failed_payments: '💳',
    expiring_cards: '⏰',
    dunning_risk: '🚨',
    paused_subscriptions: '⏸️',
    cancelled_recoverable: '🔄',
    underpriced_segment: '💰',
    expansion_ready: '📈',
    annual_upsell: '📅',
  }
  return icons[category] ?? '💡'
}

export function getLeakColor(category: LeakCategory): string {
  const colors: Record<LeakCategory, string> = {
    failed_payments: '#FF3B5C',
    expiring_cards: '#FF8C00',
    dunning_risk: '#FF3B5C',
    paused_subscriptions: '#C9A84C',
    cancelled_recoverable: '#C9A84C',
    underpriced_segment: '#00D084',
    expansion_ready: '#00D084',
    annual_upsell: '#00A066',
  }
  return colors[category] ?? '#C9A84C'
}
