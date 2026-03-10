import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { safeKvSet, safeKvGet } from '@/lib/kv'
import { getAffiliateById } from '@/lib/affiliates'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product')
  if (!productId) {
    return NextResponse.json({ error: 'product param required' }, { status: 400 })
  }

  const product = getAffiliateById(productId)
  if (!product) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 404 })
  }

  const { userId } = await auth()
  if (userId) {
    const date = new Date().toISOString().split('T')[0]
    const key = `affiliate_clicks:${userId}:${productId}:${date}`
    const current = (await safeKvGet<number>(key)) ?? 0
    await safeKvSet(key, current + 1, { ex: 60 * 60 * 24 * 90 })
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
