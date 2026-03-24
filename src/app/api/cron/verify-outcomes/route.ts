import { NextRequest, NextResponse } from 'next/server'
import { safeKvGet } from '@/lib/kv'
import { verifyOutcome, updatePlatformTotals } from '@/lib/outcome-tracker'
import { getStripeClient } from '@/lib/stripe-connection'
import type { OutcomeRecord } from '@/types'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('cron:verify-outcomes', 'Unauthorized cron attempt', { authHeaderPresent: !!authHeader })
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
        const refRaw = await safeKvGet<string>(`outcome_stripe_ref:${userId}`)
        if (!refRaw) continue

        const stripe = await getStripeClient(userId)
        if (!stripe) continue

        await verifyOutcome(userId, outcomeId, stripe)
        verified++
      } catch (err) {
        logger.error('cron:verify-outcomes', `Verification failed for ${outcomeId}`, err)
        failed++
      }
    }
  }

  try {
    await updatePlatformTotals()
  } catch (err) {
    logger.error('cron:verify-outcomes', 'Platform totals update failed', err)
  }

  return NextResponse.json({
    verified,
    failed,
    timestamp: new Date().toISOString(),
  })
}
