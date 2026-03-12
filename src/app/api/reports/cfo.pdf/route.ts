import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { auth } from '@clerk/nextjs/server'
import { hasStripeConnected } from '@/lib/stripe-connection'
import { estimateTax } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function money(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const connected = await hasStripeConnected(userId)
  if (!connected) {
    return NextResponse.json({ 
      error: 'Stripe not connected',
      action: 'connect',
      connectUrl: '/api/stripe/connect'
    }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const currency = (searchParams.get('currency') ?? 'USD').toUpperCase()
  const mrr = Number(searchParams.get('mrr') ?? 0)
  const revenue30d = Number(searchParams.get('revenue30d') ?? 0)
  const grossRevenue30d = Number(searchParams.get('grossRevenue30d') ?? 0)
  const netRevenue30d = Number(searchParams.get('netRevenue30d') ?? 0)
  const stripeFees30d = Number(searchParams.get('stripeFees30d') ?? 0)
  const refundTotal30d = Number(searchParams.get('refundTotal30d') ?? 0)
  const disputeTotal30d = Number(searchParams.get('disputeTotal30d') ?? 0)
  const churnRate = Number(searchParams.get('churnRate') ?? 0)
  const activeSubscriptions = Number(searchParams.get('activeSubscriptions') ?? 0)
  const failedPaymentsValue = Number(searchParams.get('failedPaymentsValue') ?? 0)
  const availableBalance = Number(searchParams.get('availableBalance') ?? 0)
  const pendingBalance = Number(searchParams.get('pendingBalance') ?? 0)
  const runway = Number(searchParams.get('runway') ?? 0)

  const annualRevenue = mrr > 0 ? mrr * 12 : revenue30d * 12
  const tax = estimateTax(annualRevenue)

  const doc = new PDFDocument({ size: 'LETTER', margin: 54 })

  const chunks: Buffer[] = []
  doc.on('data', (d) => chunks.push(d))

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Header
  doc.fontSize(22).fillColor('#111827').text('Lucrum CFO Snapshot', { align: 'left' })
  doc.moveDown(0.2)
  doc.fontSize(10).fillColor('#6B7280').text(`Generated: ${new Date().toLocaleString()}`)
  doc.moveDown(1)

  // Revenue Reality
  doc.fontSize(14).fillColor('#111827').text('Revenue Reality (Last 30 Days)')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Gross revenue: ${money(grossRevenue30d || revenue30d, currency)}`)
  doc.text(`Net revenue: ${money(netRevenue30d || revenue30d, currency)}`)
  doc.text(`Stripe fees: ${money(stripeFees30d, currency)}`)
  doc.text(`Refunds: ${money(refundTotal30d, currency)}`)
  doc.text(`Disputes: ${money(disputeTotal30d, currency)}`)
  doc.moveDown(1)

  // Retention
  doc.fontSize(14).fillColor('#111827').text('Churn & Retention')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Active subscriptions: ${activeSubscriptions}`)
  doc.text(`Churn rate: ${Number.isFinite(churnRate) ? churnRate.toFixed(1) : '—'}%`)
  doc.text(`Passive churn at risk (past-due): ${money(failedPaymentsValue, currency)}`)
  doc.moveDown(1)

  // Cash Flow
  doc.fontSize(14).fillColor('#111827').text('Cash Position')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Available: ${money(availableBalance, currency)}`)
  doc.text(`Pending: ${money(pendingBalance, currency)}`)
  doc.text(`Runway: ${runway >= 9999 ? 'Profitable / ∞' : `${runway} days`}`)
  doc.moveDown(1)

  // Tax
  doc.fontSize(14).fillColor('#111827').text('Tax Estimate (US, rough)')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Annual revenue (est): ${money(annualRevenue, currency)}`)
  doc.text(`Federal (est): ${money(tax.federal, currency)}`)
  doc.text(`Self-employment (est): ${money(tax.selfEmployment, currency)}`)
  doc.text(`Total (est): ${money(tax.total, currency)}`)
  doc.text(`Quarterly payment (est): ${money(Math.round(tax.total / 4), currency)}`)
  doc.moveDown(1)
  doc.fontSize(9).fillColor('#6B7280').text('Estimates only. Consult a CPA. Lucrum is not tax/legal advice.')

  doc.end()

  const pdf = await done
  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lucrum-cfo-snapshot-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}

