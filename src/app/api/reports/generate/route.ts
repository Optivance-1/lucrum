import { NextRequest, NextResponse } from 'next/server'
import { generateMonthlyReport, getDataPointsProgress } from '@/lib/report-generator'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const previousMonth = new Date(now.setMonth(now.getMonth() - 1))
    const month = previousMonth.toISOString().slice(0, 7)

    const existingReport = await safeKvGet(`report:${month}`)
    if (existingReport) {
      return NextResponse.json({
        published: false,
        reason: 'Report already exists for this month',
      })
    }

    const progress = await getDataPointsProgress()
    if (progress.current < progress.required) {
      return NextResponse.json({
        published: false,
        reason: `Insufficient data points: ${progress.current}/${progress.required}`,
      })
    }

    const report = await generateMonthlyReport(month)

    if (!report) {
      return NextResponse.json({
        published: false,
        reason: 'Report generation failed - insufficient data for month',
      })
    }

    const isFirstReport = await isFirstPublishedReport()
    if (isFirstReport) {
      await notifyWaitlist(report.title, month)
    }

    return NextResponse.json({
      published: true,
      month,
      title: report.title,
      dataPoints: report.dataPointsUsed,
      findings: report.keyFindings.length,
    })
  } catch (error: any) {
    console.error('[reports/generate] error:', error)
    return NextResponse.json(
      { published: false, reason: error.message },
      { status: 500 }
    )
  }
}

async function isFirstPublishedReport(): Promise<boolean> {
  const flag = await safeKvGet('report:first_published')
  if (!flag) {
    await safeKvSet('report:first_published', Date.now())
    return true
  }
  return false
}

async function notifyWaitlist(reportTitle: string, month: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[reports/generate] No RESEND_API_KEY - skipping waitlist notification')
    return
  }

  try {
    const waitlist = await safeKvGet<string[]>('report_waitlist') ?? []
    if (waitlist.length === 0) return

    const resend = new Resend(resendKey)
    const reportUrl = `https://lucrumcfo.vercel.app/reports/${month}`

    for (const email of waitlist.slice(0, 100)) {
      await resend.emails.send({
        from: 'Lucrum Research <research@lucrumcfo.vercel.app>',
        to: email,
        subject: `The first State of SaaS Survival report is live`,
        html: `
          <h1 style="font-family: Georgia, serif; color: #1a1a1a;">The data is in.</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Lucrum just published its first monthly research report:
            <strong>${reportTitle}</strong>
          </p>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Real data from real Stripe businesses. Anonymized. What actually works 
            when founders make financial decisions?
          </p>
          <p style="margin-top: 24px;">
            <a href="${reportUrl}" style="background: #c9a84c; color: #1a1a1a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Read the report →
            </a>
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">
            You received this because you signed up for Lucrum Research updates.
          </p>
        `,
      })
    }

    console.log(`[reports/generate] Notified ${waitlist.length} waitlist subscribers`)
  } catch (err) {
    console.error('[reports/generate] waitlist notification failed:', err)
  }
}
