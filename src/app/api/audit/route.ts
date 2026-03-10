import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { readAuditLog, writeAuditEntry } from '@/lib/audit-log'
import type { AuditEntry } from '@/lib/audit-log'
import type { ApiResponse } from '@/types'

type GetQuery = {
  limit?: string
  offset?: string
  actionType?: string
  dateFrom?: string
  dateTo?: string
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json<ApiResponse<AuditEntry[]>>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const params = Object.fromEntries(req.nextUrl.searchParams) as GetQuery
  const limit = Math.min(Number(params.limit ?? 50) || 50, 200)
  const offset = Number(params.offset ?? 0) || 0

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : null
  const dateTo = params.dateTo ? new Date(params.dateTo) : null

  const all = await readAuditLog(userId, limit + offset, 0)

  const filtered = all.filter(entry => {
    if (params.actionType && entry.actionType !== params.actionType) return false
    const ts = new Date(entry.executedAt).getTime()
    if (Number.isNaN(ts)) return false
    if (dateFrom && ts < dateFrom.getTime()) return false
    if (dateTo && ts > dateTo.getTime()) return false
    return true
  })

  const slice = filtered.slice(offset, offset + limit)

  return NextResponse.json<ApiResponse<AuditEntry[]>>({
    data: slice,
  })
}

type PostBody = {
  actionType: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  revenueImpact?: number
  affectedCustomers?: string[]
  maxRecommended: boolean
  executedAt: string
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json<ApiResponse<AuditEntry>>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as PostBody

  if (!body.actionType || typeof body.actionType !== 'string') {
    return NextResponse.json<ApiResponse<AuditEntry>>(
      { error: 'actionType is required' },
      { status: 400 }
    )
  }

  const nowIso = new Date().toISOString()

  const entry = await writeAuditEntry({
    userId,
    actionType: body.actionType,
    category: body.actionType.split('.')[0] ?? 'unknown',
    params: body.params ?? {},
    result: body.result ?? {},
    success: !!body.success,
    errorMessage: body.success ? undefined : (body.result?.error as string | undefined),
    revenueImpact: body.revenueImpact,
    affectedCustomers: body.affectedCustomers ?? [],
    maxRecommended: !!body.maxRecommended,
    executedAt: body.executedAt || nowIso,
    stripeRequestId: body.result?.stripeRequestId as string | undefined,
  })

  return NextResponse.json<ApiResponse<AuditEntry>>({
    data: entry,
  })
}

