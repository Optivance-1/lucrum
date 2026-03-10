import { randomUUID } from 'node:crypto'
import { safeKvGet, safeKvSet } from '@/lib/kv'

export interface AuditEntry {
  id: string
  userId: string
  actionType: string
  category: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  errorMessage?: string
  revenueImpact?: number
  affectedCustomers: string[]
  maxRecommended: boolean
  executedAt: string
  stripeRequestId?: string
  status: 'pending' | 'success' | 'failed'
}

const MAX_INDEX_SIZE = 200

export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'status'> & { status?: AuditEntry['status'] }
): Promise<AuditEntry> {
  const withId: AuditEntry = {
    ...entry,
    id: randomUUID(),
    status: entry.status ?? (entry.success ? 'success' : 'failed'),
  }

  const entryKey = `audit:${entry.userId}:${withId.id}`
  await safeKvSet(entryKey, withId, 90 * 86400)

  const indexKey = `audit_index:${entry.userId}`
  const existing = await safeKvGet<string[]>(indexKey) ?? []
  const updated = [entryKey, ...existing].slice(0, MAX_INDEX_SIZE)
  await safeKvSet(indexKey, updated)

  return withId
}

export async function readAuditLog(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuditEntry[]> {
  const indexKey = `audit_index:${userId}`
  const keys = await safeKvGet<string[]>(indexKey)
  if (!keys?.length) return []

  const slice = keys.slice(offset, offset + limit)
  const entries: AuditEntry[] = []

  for (const key of slice) {
    const entry = await safeKvGet<AuditEntry>(key)
    if (entry) entries.push(entry)
  }

  return entries
}

export async function updateAuditEntry(
  userId: string,
  id: string,
  updates: Partial<AuditEntry>
): Promise<void> {
  const entryKey = `audit:${userId}:${id}`
  const existing = await safeKvGet<AuditEntry>(entryKey)
  if (!existing) return

  const merged = { ...existing, ...updates }
  await safeKvSet(entryKey, merged, 90 * 86400)
}
