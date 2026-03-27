import { safeKvGet, safeKvSet } from '@/lib/kv'
import { logger } from '@/lib/logger'

interface MRRSnapshot {
  month: string // YYYY-MM format
  mrr: number
  recordedAt: number
}

/**
 * Store monthly MRR snapshots for historical tracking
 * Call this after fetching current MRR to build accurate history over time
 */
export async function saveMRRSnapshot(userId: string, mrr: number): Promise<void> {
  if (!userId || mrr < 0) return

  const month = new Date().toISOString().slice(0, 7) // 2024-03
  const key = `mrr_history:${userId}:${month}`

  try {
    await safeKvSet(key, { mrr, recordedAt: Date.now() })
    logger.debug('mrr-history', `Saved MRR snapshot for ${month}`, { userId, mrr })
  } catch (error) {
    logger.error('mrr-history', 'Failed to save MRR snapshot', { userId, month, error })
  }
}

/**
 * Retrieve last N months of actual MRR data
 * Returns empty values for months with no data (honest, not extrapolated)
 */
export async function getMRRHistory(
  userId: string,
  months: number = 6
): Promise<{ month: string; mrr: number }[]> {
  if (!userId) return []

  const results: { month: string; mrr: number }[] = []
  const now = new Date()

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = d.toISOString().slice(0, 7)
    const key = `mrr_history:${userId}:${monthStr}`

    try {
      const snapshot = await safeKvGet<{ mrr: number; recordedAt: number }>(key)
      results.unshift({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        mrr: snapshot?.mrr ?? 0,
      })
    } catch (error) {
      logger.warn('mrr-history', 'Failed to fetch MRR snapshot', { userId, month: monthStr })
      results.unshift({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        mrr: 0,
      })
    }
  }

  return results
}

/**
 * Get cohort-based churn data
 * Returns churn rate per signup cohort
 */
export async function getCohortChurnData(
  userId: string
): Promise<{ cohortMonth: string; churned: number; retained: number; rate: number }[]> {
  const key = `cohort_churn:${userId}`
 type CohortChurnData = { cohortMonth: string; churned: number; retained: number; rate: number }
  const cached = await safeKvGet<{ data: CohortChurnData[]; cachedAt: number }>(key)

  if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
    return cached.data
  }

  // This will be computed in the data route and cached here
  // For now, return empty array - actual calculation happens in stripe/data/route.ts
  return []
}

/**
 * Save cohort churn data after calculation
 */
export async function saveCohortChurnData(
  userId: string,
  data: { cohortMonth: string; churned: number; retained: number; rate: number }[]
): Promise<void> {
  const key = `cohort_churn:${userId}`
  await safeKvSet(key, { data, cachedAt: Date.now() }, 86400) // 24h TTL
}
