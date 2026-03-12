import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { safeKvGet } from '@/lib/kv'
import { verifyOutcome, updatePlatformTotals } from '@/lib/outcome-tracker'
import { STRIPE_API_VERSION } from '@/lib/stripe'
import type { OutcomeRecord } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = Date.now() - 30 * 60 * 1000
  let verified = 0
  let failed = 0

  const today = new Date()
  for (let i = 0; i < 2; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `outcome_platform:${d.toISOString().slice(0, 10)}`
    const entries = await safeKvGet<string[]>(key)
    if (!entries?.length) continue

    for (const ref of entries) {
      const [userId, outcomeId] = ref.split(':')
      if (!userId || !outcomeId) continue

      const record = await safeKvGet<OutcomeRecord>(`outcome:${userId}:${outcomeId}`)
      if (!record) continue
      if (record.outcome !== 'pending') continue
      if (record.executedAt > cutoff) continue

      try {
        const stripeKey = await safeKvGet<string>(`outcome_stripe_ref:${userId}`)
        if (!stripeKey) continue

        const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
        await verifyOutcome(userId, outcomeId, stripe)
        verified++
      } catch (err) {
        console.error(`[verify-outcomes] failed for ${outcomeId}:`, err)
        failed++
      }
    }
  }

  try {
    await updatePlatformTotals()
  } catch (err) {
    console.error('[verify-outcomes] platform totals update failed:', err)
  }

  return NextResponse.json({
    verified,
    failed,
    timestamp: new Date().toISOString(),
  })
}
