import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateActionCards } from '@/lib/recommendations'
import type { StripeMetrics } from '@/types'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = (await req.json().catch(() => null)) as StripeMetrics | null
  if (!metrics || typeof metrics.mrr !== 'number') {
    return NextResponse.json({ error: 'Invalid metrics' }, { status: 400 })
  }

  try {
    const cards = await generateActionCards(metrics)
    return NextResponse.json({ cards })
  } catch (err: any) {
    console.error('[actions/recommendations] error:', err)
    return NextResponse.json({ cards: [] })
  }
}
