import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import type {
  OutcomeRecord,
  OutcomeCategory,
  OutcomeSummary,
  AggregateOutcomes,
} from '@/types'

const MAX_INDEX_SIZE = 500

function dateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function quarterKey(): string {
  const d = new Date()
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `${d.getFullYear()}-Q${q}`
}

export async function recordOutcome(
  userId: string,
  actionType: string,
  expectedImpact: number,
  category: OutcomeCategory,
  stripeObjectId?: string,
  stripeObjectType?: string
): Promise<OutcomeRecord> {
  const record: OutcomeRecord = {
    id: randomUUID(),
    userId,
    actionType,
    executedAt: Date.now(),
    expectedImpact,
    outcome: 'pending',
    stripeObjectId,
    stripeObjectType,
    category,
    anonymizedForBenchmarks: true,
  }

  await safeKvSet(`outcome:${userId}:${record.id}`, record, 365 * 86400)

  const indexKey = `outcome_index:${userId}`
  const existing = (await safeKvGet<string[]>(indexKey)) ?? []
  const updated = [record.id, ...existing].slice(0, MAX_INDEX_SIZE)
  await safeKvSet(indexKey, updated)

  const platformKey = `outcome_platform:${dateKey()}`
  const platformIndex = (await safeKvGet<string[]>(platformKey)) ?? []
  platformIndex.push(`${userId}:${record.id}`)
  await safeKvSet(platformKey, platformIndex, 90 * 86400)

  return record
}

export async function verifyOutcome(
  userId: string,
  outcomeId: string,
  stripe: Stripe
): Promise<OutcomeRecord | null> {
  const key = `outcome:${userId}:${outcomeId}`
  const record = await safeKvGet<OutcomeRecord>(key)
  if (!record) return null

  try {
    if (record.stripeObjectType === 'invoice' && record.stripeObjectId) {
      const invoice = await stripe.invoices.retrieve(record.stripeObjectId)
      if (invoice.status === 'paid') {
        record.outcome = 'success'
        record.actualImpact = (invoice.amount_paid ?? 0) / 100
      } else if (invoice.status === 'open') {
        record.outcome = 'pending'
      } else {
        record.outcome = 'failed'
        record.actualImpact = 0
      }
    } else if (record.stripeObjectType === 'subscription' && record.stripeObjectId) {
      const sub = await stripe.subscriptions.retrieve(record.stripeObjectId)
      if (sub.status === 'active') {
        record.outcome = 'success'
        record.actualImpact = record.expectedImpact
      } else if (sub.status === 'canceled') {
        record.outcome = 'failed'
        record.actualImpact = 0
      }
    } else if (record.stripeObjectType === 'payout' && record.stripeObjectId) {
      const payout = await stripe.payouts.retrieve(record.stripeObjectId)
      if (payout.status === 'paid') {
        record.outcome = 'success'
        record.actualImpact = payout.amount / 100
      } else if (payout.status === 'failed') {
        record.outcome = 'failed'
        record.actualImpact = 0
      }
    } else if (record.stripeObjectType === 'customer') {
      record.outcome = 'pending'
    }

    record.confirmedAt = Date.now()
    record.stripeVerifiedAt = Date.now()
    await safeKvSet(key, record, 365 * 86400)
  } catch (err) {
    console.error(`[outcome-tracker] verify failed for ${outcomeId}:`, err)
  }

  return record
}

export async function getUserOutcomes(
  userId: string,
  days = 30
): Promise<OutcomeRecord[]> {
  const indexKey = `outcome_index:${userId}`
  const ids = await safeKvGet<string[]>(indexKey)
  if (!ids?.length) return []

  const cutoff = Date.now() - days * 86400 * 1000
  const records: OutcomeRecord[] = []

  for (const id of ids) {
    const record = await safeKvGet<OutcomeRecord>(`outcome:${userId}:${id}`)
    if (record && record.executedAt >= cutoff) {
      records.push(record)
    }
  }

  return records.sort((a, b) => b.executedAt - a.executedAt)
}

function buildSummary(records: OutcomeRecord[]): OutcomeSummary {
  let paymentRecovered = 0
  let churnPrevented = 0
  let revenueExpanded = 0
  let totalImpact = 0

  for (const r of records) {
    const impact = r.outcome === 'success' ? (r.actualImpact ?? r.expectedImpact) : 0
    if (r.category === 'payment_recovered') paymentRecovered += impact
    else if (r.category === 'churn_prevented') churnPrevented += impact
    else if (r.category === 'revenue_expanded') revenueExpanded += impact
    totalImpact += impact
  }

  return {
    paymentRecovered,
    churnPrevented,
    revenueExpanded,
    actionsExecuted: records.length,
    totalImpact,
  }
}

export async function getAggregateOutcomes(
  userId: string
): Promise<AggregateOutcomes> {
  const cacheKey = `outcomes_agg:${userId}`
  const cached = await safeKvGet<AggregateOutcomes>(cacheKey)
  if (cached && Date.now() - cached.computedAt < 3600_000) return cached

  const allRecords = await getUserOutcomes(userId, 365)
  const now = Date.now()
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const thisQuarterMonth = Math.floor(new Date().getMonth() / 3) * 3
  const thisQuarterStart = new Date(new Date().getFullYear(), thisQuarterMonth, 1).getTime()

  const monthRecords = allRecords.filter(r => r.executedAt >= thisMonthStart)
  const quarterRecords = allRecords.filter(r => r.executedAt >= thisQuarterStart)

  const thisMonth = buildSummary(monthRecords)
  const thisQuarter = buildSummary(quarterRecords)
  const allTime = buildSummary(allRecords)

  const platform = await getPlatformTotals()

  const result: AggregateOutcomes = {
    totalPaymentRecovered: platform.paymentRecovered,
    totalChurnPrevented: platform.churnPrevented,
    totalRunwayExtended: 0,
    totalRevenueExpanded: platform.revenueExpanded,
    activeUsersThisMonth: 0,
    actionsExecutedThisMonth: platform.actionsExecuted,

    userPaymentRecovered: allTime.paymentRecovered,
    userChurnPrevented: allTime.churnPrevented,
    userRunwayExtended: 0,
    userRevenueExpanded: allTime.revenueExpanded,
    userActionsExecuted: allTime.actionsExecuted,
    userValueGenerated: allTime.totalImpact,

    thisMonth,
    thisQuarter,
    allTime,

    computedAt: now,
  }

  await safeKvSet(cacheKey, result, 3600)
  return result
}

export async function getPlatformTotals(): Promise<OutcomeSummary> {
  const cached = await safeKvGet<OutcomeSummary>('platform_totals')
  if (cached) return cached
  return {
    paymentRecovered: 0,
    churnPrevented: 0,
    revenueExpanded: 0,
    actionsExecuted: 0,
    totalImpact: 0,
  }
}

export async function updatePlatformTotals(): Promise<void> {
  let paymentRecovered = 0
  let churnPrevented = 0
  let revenueExpanded = 0
  let actionsExecuted = 0
  let totalImpact = 0

  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `outcome_platform:${d.toISOString().slice(0, 10)}`
    const entries = await safeKvGet<string[]>(key)
    if (!entries?.length) continue

    for (const ref of entries) {
      const [uid, oid] = ref.split(':')
      const record = await safeKvGet<OutcomeRecord>(`outcome:${uid}:${oid}`)
      if (!record || record.outcome !== 'success') continue

      const impact = record.actualImpact ?? record.expectedImpact
      actionsExecuted++
      totalImpact += impact
      if (record.category === 'payment_recovered') paymentRecovered += impact
      else if (record.category === 'churn_prevented') churnPrevented += impact
      else if (record.category === 'revenue_expanded') revenueExpanded += impact
    }
  }

  await safeKvSet('platform_totals', {
    paymentRecovered,
    churnPrevented,
    revenueExpanded,
    actionsExecuted,
    totalImpact,
  } satisfies OutcomeSummary)
}
