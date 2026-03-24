import { NextRequest, NextResponse } from 'next/server'
import { callHeavyAI } from '@/lib/ai-client'
import { saveCompDataPoints } from '@/lib/comp-engine'
import type { CompDataPoint, CompSource } from '@/types'

const SCRAPE_HEADERS = {
  'User-Agent': 'LucrumBot/1.0 (benchmarking; +https://lucrum.dev)',
  Accept: 'text/html,application/xhtml+xml',
}

const EXTRACTION_PROMPT = `Extract SaaS business data from this HTML. Return ONLY a JSON array of objects with these fields:
- id: unique slug from the source
- mrr: monthly recurring revenue in USD (number)
- monthsOld: how many months since launch (number)
- category: one of "SaaS", "API", "tool", "marketplace", "other"
- churnRate: monthly churn percentage if mentioned (number or null)
- growthRateMoM: month-over-month growth percentage if mentioned (number or null)
- teamSize: number of people if mentioned (number or null)
- notes: one-line summary

If you cannot extract any data, return an empty array [].
Respond ONLY with valid JSON, no markdown, no preamble.`

async function scrapeSource(
  source: CompSource,
  url: string,
  maxChars = 30_000
): Promise<Partial<CompDataPoint>[]> {
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const trimmed = html.slice(0, maxChars)
    const raw = await callHeavyAI(EXTRACTION_PROMPT, `Source: ${source}\nURL: ${url}\n\nHTML:\n${trimmed}`)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error(`[comps/scrape] ${source} failed:`, err)
    return []
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected && secret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { saved: number; total: number }> = {}

  const sources: Array<{ source: CompSource; url: string }> = [
    { source: 'indiehackers', url: 'https://www.indiehackers.com/products?sorting=newest-first' },
    { source: 'producthunt', url: 'https://www.producthunt.com/topics/saas' },
    { source: 'microacquire', url: 'https://acquire.com/marketplace/' },
  ]

  const scraped = await Promise.allSettled(
    sources.map(async ({ source, url }) => {
      const points = await scrapeSource(source, url)
      const result = await saveCompDataPoints(source, points)
      results[source] = result
    })
  )

  console.warn('[comps] Synthetic data source removed. Real ingestion only.')
  const twitterResult = await saveCompDataPoints('twitter', [])
  results.twitter = twitterResult

  return NextResponse.json({
    ok: true,
    results,
    scrapedAt: new Date().toISOString(),
  })
}
