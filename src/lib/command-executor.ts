import type Stripe from 'stripe'
import type {
  ParsedCommand,
  CommandResult,
  StripeMetrics,
  StripeCustomer,
  SimulationResult,
  SimulationConfig,
} from '@/types'
import { runSimulation } from '@/lib/monte-carlo'
import { callHeavyAI } from '@/lib/ai-client'
import { recordOutcome } from '@/lib/outcome-tracker'
import { formatCommandHelp } from '@/lib/command-parser'
import { generateHoldToken, validateHoldToken, consumeHoldToken } from '@/lib/hold-tokens'

const MAX_ACTION_IMPACT_USD = 10_000

function buildSimConfig(
  metrics: StripeMetrics,
  priceChangePercent?: number
): SimulationConfig {
  const adjustedGrowth = priceChangePercent
    ? metrics.mrrGrowth + (priceChangePercent * 0.6)
    : metrics.mrrGrowth
  const adjustedChurn = priceChangePercent
    ? metrics.churnRate + (priceChangePercent * 0.15)
    : metrics.churnRate

  return {
    currentMRR: metrics.mrr,
    currentBalance: metrics.availableBalance,
    monthlyBurn: metrics.estimatedMonthlyBurn,
    mrrGrowthRate: adjustedGrowth,
    churnRate: adjustedChurn,
    appliedDecision: priceChangePercent
      ? { actionType: 'raise_price', successProbability: 0.45 }
      : null,
  }
}

export async function executeCommand(
  command: ParsedCommand,
  metrics: StripeMetrics,
  customers: StripeCustomer[],
  userId: string,
  stripeClient: Stripe,
  options?: { holdToken?: string }
): Promise<CommandResult> {
  const actionsLog: string[] = []

  if (process.env.LUCRUM_READ_SUGGEST_ONLY === '1') {
    return {
      success: false,
      message:
        'Lucrum is in read-only mode (LUCRUM_READ_SUGGEST_ONLY): simulations and suggestions only. Stripe actions are disabled.',
      actionsLog: ['read_only_mode'],
    }
  }

  switch (command.intent) {
    case 'price_change':
      return handlePriceChange(command, metrics, actionsLog)

    case 'recover_payments':
      return handleRecoverPayments(stripeClient, userId, actionsLog, command, options?.holdToken)

    case 'churn_recovery':
      return handleChurnRecovery(metrics, customers, stripeClient, userId, actionsLog)

    case 'runway_forecast':
      return handleRunwayForecast(metrics, actionsLog)

    case 'apply_discount':
      return handleApplyDiscount(command, metrics, stripeClient, actionsLog)

    case 'analyze_segment':
      return handleAnalyzeSegment(command, customers, actionsLog)

    case 'cancel_customer':
      return handleCancelCustomer(command, stripeClient, userId, actionsLog)

    case 'pause_customer':
      return handlePauseCustomer(command, stripeClient, userId, actionsLog)

    case 'expand_customer':
      return handleExpandCustomer(customers, actionsLog)

    case 'unknown':
    default:
      return {
        success: false,
        message: formatCommandHelp('unknown'),
        actionsLog: ['Command not recognized'],
        requiresUserConfirmation: false,
      }
  }
}

async function handlePriceChange(
  command: ParsedCommand,
  metrics: StripeMetrics,
  actionsLog: string[]
): Promise<CommandResult> {
  const percent = command.params.percent ?? 10
  const simulate = command.params.simulate || command.requiresSimulation

  actionsLog.push(`Parsed price change: ${percent}%`)

  const baseline = runSimulation(buildSimConfig(metrics))
  const withChange = runSimulation(buildSimConfig(metrics, percent))

  const mrrImpact = Math.round(withChange.mrrForecast.month12.p50 - baseline.mrrForecast.month12.p50)
  const runwayDelta = Math.round(withChange.runway.p50 - baseline.runway.p50)
  const churnRiskDelta = ((1 - withChange.runway.probabilityOf180Days) - (1 - baseline.runway.probabilityOf180Days)) * 100

  actionsLog.push(`Simulation complete: 50,000 runs`)
  actionsLog.push(`12-month MRR impact: ${mrrImpact >= 0 ? '+' : ''}$${mrrImpact}`)
  actionsLog.push(`Runway impact: ${runwayDelta >= 0 ? '+' : ''}${runwayDelta} days`)
  actionsLog.push(`Churn risk delta: ${churnRiskDelta >= 0 ? '+' : ''}${churnRiskDelta.toFixed(1)}%`)

  const message = `**Price Change Simulation: ${percent}% increase**

50,000 Monte Carlo simulations show:
• 12-month MRR impact: ${mrrImpact >= 0 ? '+' : ''}$${mrrImpact.toLocaleString()}
• Runway change: ${runwayDelta >= 0 ? '+' : ''}${runwayDelta} days
• Churn risk change: ${churnRiskDelta >= 0 ? '+' : ''}${churnRiskDelta.toFixed(1)}%
• 180-day survival: ${(withChange.runway.probabilityOf180Days * 100).toFixed(0)}%

${mrrImpact > 0 ? '✅ Simulations support this move.' : '⚠️ Proceed with caution.'}`

  return {
    success: true,
    simulationResult: withChange,
    estimatedImpact: mrrImpact,
    message,
    actionsLog,
    requiresUserConfirmation: true,
    confirmationPrompt: `Deploy ${percent}% price increase? Type CONFIRM to proceed.`,
  }
}

async function handleRecoverPayments(
  stripeClient: Stripe,
  userId: string,
  actionsLog: string[],
  command: ParsedCommand,
  holdToken?: string
): Promise<CommandResult> {
  actionsLog.push('Fetching open invoices...')

  try {
    const openInvoices = await stripeClient.invoices.list({ status: 'open', limit: 50 })
    const retryableInvoices = openInvoices.data.filter(inv => {
      const createdDaysAgo = (Date.now() - (inv.created * 1000)) / (1000 * 60 * 60 * 24)
      return createdDaysAgo < 30 && (inv.attempt_count ?? 0) < 4
    })

    if (retryableInvoices.length === 0) {
      return {
        success: true,
        affectedCount: 0,
        estimatedImpact: 0,
        message: '✅ No failed payments to recover. All invoices are current.',
        actionsLog: [...actionsLog, 'No retryable invoices found'],
        requiresUserConfirmation: false,
      }
    }

    const totalAtRisk = retryableInvoices.reduce((sum, inv) => sum + ((inv.amount_due ?? 0) / 100), 0)
    actionsLog.push(`Found ${retryableInvoices.length} retryable invoices worth $${totalAtRisk.toLocaleString()}`)

    if (totalAtRisk > MAX_ACTION_IMPACT_USD) {
      const ok = await validateHoldToken(userId, holdToken, command)
      if (!ok) {
        return {
          success: false,
          status: 'hold_required',
          holdUntil: Date.now() + 48 * 3600 * 1000,
          holdToken: await generateHoldToken(userId, command),
          message: `Action estimated at $${totalAtRisk.toLocaleString()}. Reconfirm after 48 hours.`,
          actionsLog,
        }
      }
      await consumeHoldToken(userId, holdToken)
    }

    let recovered = 0
    let recoveredCount = 0
    const affectedCustomers: string[] = []

    for (const inv of retryableInvoices) {
      try {
        const paid = await stripeClient.invoices.pay(inv.id)
        if (paid.status === 'paid') {
          recovered += (paid.amount_paid ?? 0) / 100
          recoveredCount++
          if (typeof paid.customer === 'string') {
            affectedCustomers.push(paid.customer)
          }
          actionsLog.push(`Recovered $${((paid.amount_paid ?? 0) / 100).toFixed(2)} from invoice ${inv.id}`)
        }
      } catch (err: any) {
        actionsLog.push(`Failed to retry ${inv.id}: ${err.message}`)
      }
    }

    await recordOutcome(
      userId,
      'retry_payment',
      recovered,
      'payment_recovered',
      undefined,
      'invoice'
    )

    const successRate = retryableInvoices.length > 0 
      ? Math.round((recoveredCount / retryableInvoices.length) * 100)
      : 0

    return {
      success: true,
      executionResult: { recovered, recoveredCount, attemptCount: retryableInvoices.length },
      affectedCount: recoveredCount,
      estimatedImpact: recovered,
      message: `💰 **Payment Recovery Complete**

• Attempted: ${retryableInvoices.length} invoices
• Recovered: ${recoveredCount} payments
• Amount: $${recovered.toLocaleString()}
• Success rate: ${successRate}%

${recovered > 0 ? 'This revenue was already yours — MAX just collected it.' : 'All retry attempts failed. Consider sending payment update emails.'}`,
      actionsLog,
      requiresUserConfirmation: false,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to recover payments: ${err.message}`,
      actionsLog: [...actionsLog, `Error: ${err.message}`],
      requiresUserConfirmation: false,
    }
  }
}

async function handleChurnRecovery(
  metrics: StripeMetrics,
  customers: StripeCustomer[],
  stripeClient: Stripe,
  userId: string,
  actionsLog: string[]
): Promise<CommandResult> {
  actionsLog.push('Identifying at-risk customers...')

  const atRiskCustomers = customers.filter(c => 
    c.churnRisk === 'high' || 
    c.lastPaymentStatus === 'failed' ||
    c.subscriptionStatus === 'past_due'
  )

  if (atRiskCustomers.length === 0) {
    return {
      success: true,
      affectedCount: 0,
      estimatedImpact: 0,
      message: '✅ No at-risk customers detected. Retention looks healthy.',
      actionsLog: [...actionsLog, 'No at-risk customers found'],
      requiresUserConfirmation: false,
    }
  }

  const atRiskMRR = atRiskCustomers.reduce((sum, c) => sum + c.mrr, 0)
  const expectedRecovery = atRiskMRR * 0.32 * 12

  actionsLog.push(`Found ${atRiskCustomers.length} at-risk customers ($${atRiskMRR} MRR)`)
  actionsLog.push(`Generating personalized recovery strategy...`)

  const topAtRisk = atRiskCustomers.slice(0, 5)
  const customerSummary = topAtRisk.map(c => 
    `• ${c.email}: $${c.mrr}/mo MRR, ${c.subscriptionStatus ?? 'unknown'} status, ${c.churnRisk} risk`
  ).join('\n')

  return {
    success: true,
    affectedCount: atRiskCustomers.length,
    estimatedImpact: expectedRecovery,
    message: `🚨 **Churn Recovery Analysis**

**${atRiskCustomers.length} customers at risk** — $${atRiskMRR.toLocaleString()} MRR

Top at-risk customers:
${customerSummary}

**Recommended actions:**
1. Send retention offers (20% off for 3 months)
2. Personal outreach to top 5 by MRR
3. Update payment methods for past_due accounts

Expected recovery if acted on: ~$${Math.round(expectedRecovery).toLocaleString()} (32% save rate typical)`,
    actionsLog,
    requiresUserConfirmation: true,
    confirmationPrompt: `Send recovery emails to ${atRiskCustomers.length} customers? Type CONFIRM`,
  }
}

async function handleRunwayForecast(
  metrics: StripeMetrics,
  actionsLog: string[]
): Promise<CommandResult> {
  actionsLog.push('Running 50,000 Monte Carlo simulations...')

  const simulation = runSimulation(buildSimConfig(metrics))

  actionsLog.push(`Simulation complete`)
  actionsLog.push(`Median runway: ${Math.round(simulation.runway.p50)} days`)
  actionsLog.push(`180-day survival: ${(simulation.runway.probabilityOf180Days * 100).toFixed(0)}%`)

  const scenarioText = simulation.runway.p50 < 90
    ? '⚠️ Runway is tight. Prioritize burn reduction or revenue acceleration.'
    : simulation.runway.p50 < 180
    ? '📊 Runway is moderate. Focus on sustainable growth.'
    : '✅ Runway is healthy. You have time to experiment.'

  return {
    success: true,
    simulationResult: simulation,
    estimatedImpact: 0,
    message: `📈 **Runway Forecast** (50,000 simulations)

**Median runway: ${Math.round(simulation.runway.p50)} days**

Distribution:
• Worst 10%: ${Math.round(simulation.runway.p10)} days
• Best 25%: ${Math.round(simulation.runway.p75)}+ days
• Best 10%: ${Math.round(simulation.runway.p90)}+ days

**Survival probabilities:**
• 90 days: ${(simulation.runway.probabilityOf90Days * 100).toFixed(0)}%
• 180 days: ${(simulation.runway.probabilityOf180Days * 100).toFixed(0)}%
• 365 days: ${(simulation.runway.probabilityOf365Days * 100).toFixed(0)}%

**12-month MRR forecast:** $${Math.round(simulation.mrrForecast.month12.p50).toLocaleString()} (median)

${scenarioText}`,
    actionsLog,
    requiresUserConfirmation: false,
  }
}

async function handleApplyDiscount(
  command: ParsedCommand,
  metrics: StripeMetrics,
  stripeClient: Stripe,
  actionsLog: string[]
): Promise<CommandResult> {
  const percent = command.params.percent ?? 20
  const months = command.params.months ?? 3

  actionsLog.push(`Simulating ${percent}% discount for ${months} months...`)

  const avgCustomerMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const discountCost = avgCustomerMRR * (percent / 100) * months * metrics.activeSubscriptions
  const expectedRetention = metrics.activeSubscriptions * 0.55
  const retainedLTV = expectedRetention * avgCustomerMRR * 12

  const netImpact = retainedLTV - discountCost

  return {
    success: true,
    estimatedImpact: netImpact,
    message: `💸 **Discount Simulation: ${percent}% for ${months} months**

**Cost analysis:**
• Discount cost: $${Math.round(discountCost).toLocaleString()}
• Expected customers retained: ${Math.round(expectedRetention)}
• Retained annual value: $${Math.round(retainedLTV).toLocaleString()}
• Net impact: ${netImpact >= 0 ? '+' : ''}$${Math.round(netImpact).toLocaleString()}

${netImpact > 0 ? '✅ ROI is positive. Retention value exceeds discount cost.' : '⚠️ ROI is negative. Consider a smaller discount or shorter duration.'}`,
    actionsLog,
    requiresUserConfirmation: true,
    confirmationPrompt: `Create and apply ${percent}% discount coupon for ${months} months? Type CONFIRM`,
  }
}

async function handleAnalyzeSegment(
  command: ParsedCommand,
  customers: StripeCustomer[],
  actionsLog: string[]
): Promise<CommandResult> {
  const segment = command.params.segment ?? 'churn_risk'
  actionsLog.push(`Analyzing segment: ${segment}`)

  if (segment === 'churn_risk') {
    const atRisk = customers
      .filter(c => c.churnRisk === 'high' || c.churnRisk === 'medium')
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10)

    if (atRisk.length === 0) {
      return {
        success: true,
        affectedCount: 0,
        message: '✅ No high-risk customers detected. Retention looks healthy.',
        actionsLog,
        requiresUserConfirmation: false,
      }
    }

    const totalAtRiskMRR = atRisk.reduce((sum, c) => sum + c.mrr, 0)
    const customerList = atRisk.map((c, i) => 
      `${i + 1}. ${c.email} — $${c.mrr}/mo, ${c.churnRisk} risk, ${c.daysSinceCreated}d tenure`
    ).join('\n')

    return {
      success: true,
      affectedCount: atRisk.length,
      estimatedImpact: totalAtRiskMRR * 12,
      message: `🚨 **Top ${atRisk.length} Churn Risk Customers**

Total at-risk MRR: $${totalAtRiskMRR.toLocaleString()}/mo ($${(totalAtRiskMRR * 12).toLocaleString()} ARR)

${customerList}

**Suggested actions:**
• Send personalized retention offers
• Schedule 1:1 calls with top 3 by MRR
• Review recent support tickets`,
      actionsLog,
      requiresUserConfirmation: false,
    }
  }

  if (segment === 'expansion') {
    const expandable = customers
      .filter(c => c.expansionEligible && c.subscriptionStatus === 'active')
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10)

    if (expandable.length === 0) {
      return {
        success: true,
        affectedCount: 0,
        message: '📊 No expansion-ready customers detected. Consider adding usage limits or tiers.',
        actionsLog,
        requiresUserConfirmation: false,
      }
    }

    const customerList = expandable.map((c, i) =>
      `${i + 1}. ${c.email} — $${c.mrr}/mo, ${c.daysSinceCreated}d tenure`
    ).join('\n')

    const potentialExpansion = expandable.length * 50 * 0.18

    return {
      success: true,
      affectedCount: expandable.length,
      estimatedImpact: potentialExpansion * 12,
      message: `📈 **Top ${expandable.length} Expansion Candidates**

${customerList}

**Expansion potential:** ~$${Math.round(potentialExpansion)}/mo additional MRR (18% conversion rate)

**Suggested actions:**
• Send upgrade nudge emails
• Offer exclusive annual plan discounts
• Schedule demo of premium features`,
      actionsLog,
      requiresUserConfirmation: false,
    }
  }

  return {
    success: false,
    message: `Unknown segment: ${segment}. Try "churn_risk" or "expansion".`,
    actionsLog,
    requiresUserConfirmation: false,
  }
}

async function handleCancelCustomer(
  command: ParsedCommand,
  stripeClient: Stripe,
  userId: string,
  actionsLog: string[]
): Promise<CommandResult> {
  const subscriptionId = command.params.subscriptionId
  const customerId = command.params.customerId

  if (!subscriptionId && !customerId) {
    return {
      success: false,
      message: 'Please specify a subscription ID or customer email to cancel.',
      actionsLog: ['Missing subscription or customer identifier'],
      requiresUserConfirmation: false,
    }
  }

  return {
    success: true,
    message: `⚠️ **Cancellation requires CONFIRM**

Subscription: ${subscriptionId || customerId}
This action will:
• Cancel the subscription at period end
• Customer will retain access until billing period ends

Type CONFIRM to proceed.`,
    actionsLog: [...actionsLog, 'Awaiting confirmation for cancellation'],
    requiresUserConfirmation: true,
    confirmationPrompt: 'Type CONFIRM to cancel this subscription.',
  }
}

async function handlePauseCustomer(
  command: ParsedCommand,
  stripeClient: Stripe,
  userId: string,
  actionsLog: string[]
): Promise<CommandResult> {
  const subscriptionId = command.params.subscriptionId

  if (!subscriptionId) {
    return {
      success: false,
      message: 'Please specify a subscription ID to pause.',
      actionsLog: ['Missing subscription identifier'],
      requiresUserConfirmation: false,
    }
  }

  return {
    success: true,
    message: `⏸️ **Pause requires CONFIRM**

Subscription: ${subscriptionId}
This action will:
• Pause billing for the subscription
• Customer retains access but won't be charged

Type CONFIRM to proceed.`,
    actionsLog: [...actionsLog, 'Awaiting confirmation for pause'],
    requiresUserConfirmation: true,
    confirmationPrompt: 'Type CONFIRM to pause this subscription.',
  }
}

async function handleExpandCustomer(
  customers: StripeCustomer[],
  actionsLog: string[]
): Promise<CommandResult> {
  const expandable = customers
    .filter(c => c.expansionEligible && c.subscriptionStatus === 'active')
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)

  if (expandable.length === 0) {
    return {
      success: true,
      affectedCount: 0,
      message: '📊 No expansion-ready customers found. Consider adding usage tiers.',
      actionsLog,
      requiresUserConfirmation: false,
    }
  }

  const customerList = expandable.map((c, i) =>
    `${i + 1}. ${c.email} — $${c.mrr}/mo MRR, $${c.totalRevenue.toLocaleString()} LTV, ${c.daysSinceCreated}d tenure`
  ).join('\n')

  return {
    success: true,
    affectedCount: expandable.length,
    message: `📈 **Top ${expandable.length} Expansion Opportunities**

${customerList}

These customers are expansion-ready based on:
• Tenure > 90 days
• Never upgraded
• Consistent payment history

**Next step:** Send upgrade campaign? Type CONFIRM`,
    actionsLog,
    requiresUserConfirmation: true,
    confirmationPrompt: `Send expansion emails to ${expandable.length} customers? Type CONFIRM`,
  }
}
