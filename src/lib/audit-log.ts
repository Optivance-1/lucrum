import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

// NOTE: Phase 1 storage uses local filesystem under /tmp.
// Phase 2 will migrate this to Postgres without changing the public API.

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
}

function getAuditFilePath(userId: string): string {
  // Use a stable, user-specific file name under /tmp.
  // On Vercel and most Linux hosts /tmp is writable per deployment.
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join('/tmp', `lucrum-audit-${safeUserId}.jsonl`)
}

export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'id'>
): Promise<AuditEntry> {
  const withId: AuditEntry = {
    ...entry,
    id: randomUUID(),
  }

  const line = JSON.stringify(withId)
  const file = getAuditFilePath(entry.userId)

  try {
    await fs.appendFile(file, `${line}\n`, 'utf8')
  } catch {
    // Best-effort logging only — do not break the main flow.
  }

  return withId
}

export async function readAuditLog(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuditEntry[]> {
  const file = getAuditFilePath(userId)

  let data: string
  try {
    data = await fs.readFile(file, 'utf8')
  } catch (err: any) {
    if (err && err.code === 'ENOENT') return []
    return []
  }

  const lines = data
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const entries: AuditEntry[] = []
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as AuditEntry
      entries.push(parsed)
    } catch {
      // Skip malformed lines
    }
  }

  // Newest first (executedAt descending), then id as tie-breaker
  entries.sort((a, b) => {
    if (a.executedAt === b.executedAt) {
      return a.id < b.id ? 1 : -1
    }
    return a.executedAt < b.executedAt ? 1 : -1
  })

  const start = offset
  const end = offset + limit
  return entries.slice(start, end)
}

