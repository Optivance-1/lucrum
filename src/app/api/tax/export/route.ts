import { NextRequest, NextResponse } from 'next/server'
import { getStripeKeyFromCookies } from '@/lib/stripe'
import { estimateTax } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secretKey = getStripeKeyFromCookies(req.cookies)
    if (!secretKey) {
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const mrr = parseFloat(searchParams.get('mrr') || '0')
    const revenue30d = parseFloat(searchParams.get('revenue30d') || '0')

    const annualRevenue = mrr > 0 ? mrr * 12 : revenue30d * 12
    const tax = estimateTax(annualRevenue)

    const quarterlyEstimated = Math.round(tax.total / 4)
    const report = {
      annualRevenue: Math.round(annualRevenue),
      federal: tax.federal,
      selfEmployment: tax.selfEmployment,
      total: tax.total,
      quarterlyEstimated,
      generatedAt: new Date().toISOString(),
      note: 'Estimate only. Consult a CPA for tax filing.',
    }

    if (format === 'csv') {
      const csv = [
        'Lucrum Tax Prep Export',
        `Generated,${report.generatedAt}`,
        '',
        'Annual Revenue (est),$' + report.annualRevenue.toLocaleString(),
        'Federal (est),$' + report.federal.toLocaleString(),
        'Self-Employment Tax (est),$' + report.selfEmployment.toLocaleString(),
        'Total (est),$' + report.total.toLocaleString(),
        'Quarterly Estimated Payment,$' + report.quarterlyEstimated.toLocaleString(),
        '',
        report.note,
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="lucrum-tax-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('[tax/export] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
