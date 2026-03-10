import type { BenchmarkReport, CompDataPoint, CompSource, StripeMetrics } from '@/types'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const COMP_INDEX_KEY = 'lucrum:comps:v1:index'

type CompIndexEntry = { key: string; source: CompSource; scrapedAt: number }

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * clamp(q, 0, 1)
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] == null) return sorted[base]
  return sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function median(sorted: number[]): number {
  return quantile(sorted, 0.5)
}

function normalizeDataPoint(p: Partial<CompDataPoint>): CompDataPoint | null {
  const id = typeof p.id === 'string' ? p.id : null
  const source = (p.source as CompSource) || null
  const mrr = typeof p.mrr === 'number' && Number.isFinite(p.mrr) ? p.mrr : null
  const monthsOld =
    typeof p.monthsOld === 'number' && Number.isFinite(p.monthsOld) ? p.monthsOld : null
  const category = (p.category as any) || 'other'
  if (!id || !source || mrr == null || monthsOld == null) return null

  return {
    id,
    source,
    mrr: Math.max(0, Math.round(mrr)),
    monthsOld: Math.max(0, Math.round(monthsOld)),
    category,
    churnRate: typeof p.churnRate === 'number' ? p.churnRate : undefined,
    growthRateMoM: typeof p.growthRateMoM === 'number' ? p.growthRateMoM : undefined,
    teamSize: typeof p.teamSize === 'number' ? p.teamSize : undefined,
    notes: typeof p.notes === 'string' ? p.notes : undefined,
    scrapedAt: typeof p.scrapedAt === 'number' ? p.scrapedAt : Date.now(),
  }
}

async function loadIndex(): Promise<CompIndexEntry[]> {
  const idx = await safeKvGet<CompIndexEntry[]>(COMP_INDEX_KEY)
  return Array.isArray(idx) ? idx : []
}

async function saveIndex(entries: CompIndexEntry[]): Promise<void> {
  const pruned = entries
    .sort((a, b) => b.scrapedAt - a.scrapedAt)
    .slice(0, 5000)
  await safeKvSet(COMP_INDEX_KEY, pruned)
}

export async function saveCompDataPoints(
  source: CompSource,
  points: Array<Partial<CompDataPoint>>
): Promise<{ saved: number; total: number }> {
  const now = Date.now()
  const normalized = points
    .map(p => normalizeDataPoint({ ...p, source, scrapedAt: p.scrapedAt ?? now }))
    .filter(Boolean) as CompDataPoint[]

  if (!normalized.length) return { saved: 0, total: points.length }

  const existingIndex = await loadIndex()
  const nextIndex = [...existingIndex]

  let saved = 0
  for (const p of normalized) {
    const key = `lucrum:comps:v1:${source}:${p.id}`
    const ok = await safeKvSet(key, p, { ex: 60 * 60 * 24 * 60 })
    if (ok) {
      saved += 1
      nextIndex.push({ key, source, scrapedAt: p.scrapedAt })
    }
  }

  await saveIndex(nextIndex)
  return { saved, total: points.length }
}

export function isNewFounder(accountAgeDays: number | null | undefined): boolean {
  if (accountAgeDays == null) return false
  return accountAgeDays >= 0 && accountAgeDays < 60
}

export async function getBenchmarks(input: {
  mrr: number
  accountAgeDays: number
  category?: string | null
}): Promise<BenchmarkReport | null> {
  const idx = await loadIndex()
  if (!idx.length) return null

  const keys = idx
    .sort((a, b) => b.scrapedAt - a.scrapedAt)
    .slice(0, 800)
    .map(e => e.key)

  const points: CompDataPoint[] = []
  await Promise.all(
    keys.map(async key => {
      const p = await safeKvGet<CompDataPoint>(key)
      if (p && typeof p.mrr === 'number' && typeof p.monthsOld === 'number') points.push(p)
    })
  )

  if (!points.length) return null

  const maxMonthsOld = clamp(Math.ceil(input.accountAgeDays / 30) + 2, 1, 18)

  const filtered = points
    .filter(p => p.mrr > 0 && p.monthsOld >= 0 && p.monthsOld <= maxMonthsOld)
    .filter(p => (input.category ? String(p.category) === String(input.category) : true))

  const population = filtered.length >= 25 ? filtered : points

  const mrrs = population.map(p => p.mrr).sort((a, b) => a - b)
  const p25MRR = quantile(mrrs, 0.25)
  const medianMRR = median(mrrs)
  const p75MRR = quantile(mrrs, 0.75)
  const topPerformerMRR = mrrs[mrrs.length - 1] ?? 0

  const churns = population
    .map(p => p.churnRate)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)

  const growths = population
    .map(p => p.growthRateMoM)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)

  const targetMRR = Math.max(0, input.mrr || 0)
  const minMRR = Math.max(1, targetMRR / 3)
  const maxMRR = Math.max(minMRR + 1, targetMRR * 3)
  const similar = population
    .filter(p => p.mrr >= minMRR && p.mrr <= maxMRR)
    .sort((a, b) => a.mrr - b.mrr)
    .slice(0, 6)

  const freshness = population.reduce((max, p) => Math.max(max, p.scrapedAt || 0), 0)
  const sources = Array.from(new Set(population.map(p => p.source))).sort()

  return {
    compCount: population.length,
    medianMRR,
    p25MRR,
    p75MRR,
    medianGrowthRate: growths.length ? median(growths) : undefined,
    medianChurnRate: churns.length ? median(churns) : undefined,
    topPerformerMRR,
    similarBusinesses: similar,
    dataFreshness: freshness,
    sources,
  }
}

export function benchmarksForMetrics(metrics: StripeMetrics): Promise<BenchmarkReport | null> {
  return getBenchmarks({
    mrr: metrics.mrr,
    accountAgeDays: metrics.accountAgeDays,
    category: null,
  })
}
