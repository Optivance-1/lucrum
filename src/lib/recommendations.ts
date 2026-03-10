import type { ActionCard, StripeMetrics } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'

export async function generateActionCards(metrics: StripeMetrics): Promise<ActionCard[]> {
  const cards: ActionCard[] = []

  if (metrics.failedPaymentsCount > 0) {
    cards.push({
      id: 'recover_failed_payments',
      priority: 1,
      severity: 'critical',
      title: 'Recover failed payments',
      context: `${metrics.failedPaymentsCount} payments failed — $${metrics.failedPaymentsValue} MRR at risk.`,
      estimatedImpact: `+$${metrics.failedPaymentsValue}/mo recovered`,
      actionType: 'retry_payment',
      actionLabel: 'Retry all',
      params: {},
      isDestructive: false,
      requiresConfirmText: false,
      affectedCustomerCount: metrics.failedPaymentsCount,
    })
  }

  if (metrics.cancelledSubscriptions30d > 0) {
    const churned = metrics.cancelledSubscriptions30d
    const avgSubValue = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
    const recoveryValue = Math.round(avgSubValue * churned * 0.15)
    cards.push({
      id: 'churn_recovery',
      priority: 1,
      severity: 'warning',
      title: 'Win back churned customers',
      context: `${churned} subs cancelled this month. Send targeted win-back offers.`,
      estimatedImpact: `+$${recoveryValue}/mo if 15% convert`,
      actionType: 'send_email',
      actionLabel: 'Send win-back',
      params: { template: 'churn_recovery' },
      isDestructive: false,
      requiresConfirmText: false,
      affectedCustomerCount: churned,
    })
  }

  if (metrics.activeSubscriptions >= 20 && metrics.churnRate < 5 && metrics.mrrGrowth > 0) {
    const liftPct = 10
    const liftAmount = Math.round(metrics.mrr * (liftPct / 100))
    cards.push({
      id: 'expansion_revenue',
      priority: 2,
      severity: 'opportunity',
      title: 'Test a price increase',
      context: `Low churn (${metrics.churnRate}%) + growth (${metrics.mrrGrowth}% MoM) = safe pricing headroom.`,
      estimatedImpact: `+$${liftAmount}/mo from ${liftPct}% lift`,
      actionType: 'update_price',
      actionLabel: 'Preview impact',
      params: { liftPercent: liftPct },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  const payoutReady = metrics.availableBalance - metrics.pendingBalance
  if (payoutReady > 500) {
    cards.push({
      id: 'trigger_payout',
      priority: 3,
      severity: 'win',
      title: `$${payoutReady.toLocaleString()} ready to pay out`,
      context: 'Available balance exceeds pending obligations.',
      estimatedImpact: `$${payoutReady.toLocaleString()} to your bank`,
      actionType: 'trigger_payout',
      actionLabel: 'Trigger payout',
      params: { amount: payoutReady },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  if (metrics.accountAgeDays < 30 && metrics.activeSubscriptions < 5) {
    cards.push({
      id: 'new_founder_quickstart',
      priority: 2,
      severity: 'opportunity',
      title: 'New founder quick wins',
      context: `Day ${metrics.accountAgeDays}: focus on first 10 customers, not features.`,
      estimatedImpact: 'Faster time-to-revenue',
      actionType: 'send_email',
      actionLabel: 'Get playbook',
      params: { template: 'quickstart' },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  if (cards.length > 0 && cards.length <= 3) {
    try {
      const summary = cards.map(c => `- ${c.title}: ${c.context}`).join('\n')
      const aiEnrichment = await callHeavyAI(
        'You are Lucrum MAX, an AI CFO. Given these recommended actions, add a 1-sentence tactical tip for each. Respond as JSON array of objects with id and tip fields only.',
        summary
      )
      const clean = aiEnrichment.replace(/```json|```/g, '').trim()
      const tips: Array<{ id: string; tip: string }> = JSON.parse(clean)
      for (const t of tips) {
        const card = cards.find(c => c.id === t.id)
        if (card && t.tip) card.context = `${card.context} ${t.tip}`
      }
    } catch {
      // AI enrichment is best-effort
    }
  }

  cards.sort((a, b) => a.priority - b.priority)
  return cards
}
