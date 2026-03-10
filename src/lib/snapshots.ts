import type { StripeMetrics } from '@/types'
import { safeKvGet, safeKvSet, safeKvDel } from '@/lib/kv'

export interface MetricSnapshot {
  userId: string
  timestamp: number
  mrr: number
  mrrGrowth: number
  churnRate: number
  runway: number
  activeSubscriptions: number
  newCustomers30d: number
  availableBalance: number
  revenue30d: number
}

function formatSnapshotDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function snapshotKey(userId: string, day: string): string {
  return `snapshots:${userId}:${day}`
}

export async function saveSnapshot(userId: string, metrics: StripeMetrics): Promise<void> {
  const timestamp = Date.now()
  const day = formatSnapshotDate(timestamp)
  const key = snapshotKey(userId, day)
  const existing = await safeKvGet<MetricSnapshot>(key)
  if (existing) return

  const snapshot: MetricSnapshot = {
    userId,
    timestamp: Math.floor(timestamp / 1000),
    mrr: metrics.mrr,
    mrrGrowth: metrics.mrrGrowth,
    churnRate: metrics.churnRate,
    runway: metrics.runway,
    activeSubscriptions: metrics.activeSubscriptions,
    newCustomers30d: metrics.newCustomers30d,
    availableBalance: metrics.availableBalance,
    revenue30d: metrics.revenue30d,
  }

  await safeKvSet(key, snapshot)

  const pruneDate = new Date(timestamp)
  pruneDate.setDate(pruneDate.getDate() - 366)
  await safeKvDel(snapshotKey(userId, formatSnapshotDate(pruneDate.getTime())))
}

export async function getSnapshots(userId: string, days = 90): Promise<MetricSnapshot[]> {
  const promises: Promise<MetricSnapshot | null>[] = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    promises.push(safeKvGet<MetricSnapshot>(snapshotKey(userId, formatSnapshotDate(date.getTime()))))
  }

  const snapshots = await Promise.all(promises)
  return snapshots.filter((snapshot): snapshot is MetricSnapshot => Boolean(snapshot))
}
