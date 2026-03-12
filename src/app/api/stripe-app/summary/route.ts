import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { safeKvGet } from '@/lib/kv'
import type { StripeMetrics, FiveMovesResult, RevenueLeak } from '@/types'

const CACHE_SECONDS = 300

function verifyStripeSignature(req: NextRequest): boolean {
  const signingSecret = process.env.STRIPE_APP_SIGNING_SECRET
  if (!signingSecret) {
    console.warn('[stripe-app/summary] No STRIPE_APP_SIGNING_SECRET configured')
    return true
  }

  const signature = req.headers.get('x-stripe-signature')
  if (!signature) return false

  try {
    const timestamp = signature.split(',')[0]?.split('=')[1]
    const sig = signature.split(',')[1]?.split('=')[1]
    
    if (!timestamp || !sig) return false

    const payload = `${timestamp}.${req.url}`
    const expectedSig = crypto
      .createHmac('sha256', signingSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSig)
    )
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stripeAccountId = searchParams.get('stripeAccountId')

  if (!stripeAccountId) {
    return NextResponse.json(
      { connected: false, connectUrl: 'https://lucrumcfo.vercel.app/connect' },
      { status: 200 }
    )
  }

  try {
    const userIdKey = `stripe_account_user:${stripeAccountId}`
    const userId = await safeKvGet<string>(userIdKey)

    if (!userId) {
      return NextResponse.json({
        connected: false,
        connectUrl: 'https://lucrumcfo.vercel.app/connect',
      })
    }

    const cacheKey = `stripe_app_summary:${userId}`
    const cached = await safeKvGet<any>(cacheKey)
    if (cached && Date.now() - cached.cachedAt < CACHE_SECONDS * 1000) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}` },
      })
    }

    const metrics = await safeKvGet<StripeMetrics>(`metrics:${userId}`)
    const fiveMoves = await safeKvGet<FiveMovesResult>(`fivemoves:${userId}`)
    const leaksData = await safeKvGet<{ leaks: RevenueLeak[] }>(`leaks:${userId}`)

    if (!metrics) {
      return NextResponse.json({
        connected: true,
        connectUrl: 'https://lucrumcfo.vercel.app/connect',
        mrr: 0,
        runway: 0,
        churnRate: 0,
      })
    }

    const topMove = fiveMoves?.moves?.[0]
    const leaks = leaksData?.leaks ?? []
    const leakCount = leaks.length
    const leakValue = leaks.reduce((sum, l) => sum + l.estimatedMRRImpact, 0)

    const response = {
      connected: true,
      mrr: metrics.mrr,
      runway: metrics.runway,
      churnRate: metrics.churnRate,
      topMove: topMove
        ? {
            title: topMove.title,
            summary: topMove.summary,
            risk: topMove.risk,
            riskColor: topMove.riskColor,
          }
        : undefined,
      leakCount: leakCount > 0 ? leakCount : undefined,
      leakValue: leakValue > 0 ? leakValue : undefined,
      connectUrl: 'https://lucrumcfo.vercel.app/connect',
    }

    await safeKvGet(cacheKey) // just to check if set works
    
    return NextResponse.json(response, {
      headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}` },
    })
  } catch (error: any) {
    console.error('[stripe-app/summary] error:', error)
    return NextResponse.json(
      { connected: false, connectUrl: 'https://lucrumcfo.vercel.app/connect' },
      { status: 200 }
    )
  }
}
