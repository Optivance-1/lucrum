import { Resend } from 'resend'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { callChatAI } from '@/lib/ai-client'
import type { StripeMetrics, FiveMovesResult } from '@/types'

const SEQUENCE_DAYS = [0, 2, 5, 7]

export interface EmailSequenceJob {
  userId: string
  email: string
  day: number
  scheduledAt: number
  sentAt?: number
  status: 'pending' | 'sent' | 'failed'
}

export interface WelcomeEmailContext {
  name?: string
  mrr: number
  runway: number
  churnRate: number
  topMoveTitle?: string
  failedPaymentsValue?: number
  failedPaymentsCount?: number
}

export async function scheduleWelcomeSequence(
  userId: string,
  email: string
): Promise<void> {
  const now = Date.now()

  for (const day of SEQUENCE_DAYS) {
    const job: EmailSequenceJob = {
      userId,
      email,
      day,
      scheduledAt: now + day * 24 * 60 * 60 * 1000,
      status: 'pending',
    }

    await safeKvSet(`email_sequence:${userId}:day${day}`, job)
  }

  const indexKey = 'email_sequence:pending'
  const pendingJobs = await safeKvGet<string[]>(indexKey) ?? []
  
  for (const day of SEQUENCE_DAYS) {
    const jobKey = `${userId}:day${day}`
    if (!pendingJobs.includes(jobKey)) {
      pendingJobs.push(jobKey)
    }
  }
  
  await safeKvSet(indexKey, pendingJobs)

  await sendWelcomeEmail(userId, email)
}

export async function processEmailSequence(): Promise<{ processed: number; sent: number }> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[email-sequences] No RESEND_API_KEY configured')
    return { processed: 0, sent: 0 }
  }

  const pendingJobs = await safeKvGet<string[]>('email_sequence:pending') ?? []
  const now = Date.now()
  let processed = 0
  let sent = 0

  for (const jobKey of pendingJobs.slice(0, 50)) {
    const [userId, dayKey] = jobKey.split(':')
    const job = await safeKvGet<EmailSequenceJob>(`email_sequence:${jobKey}`)
    
    if (!job || job.status !== 'pending') continue
    if (job.scheduledAt > now) continue

    processed++

    try {
      const success = await sendSequenceEmail(job)
      if (success) {
        job.status = 'sent'
        job.sentAt = now
        sent++
      } else {
        job.status = 'failed'
      }
      await safeKvSet(`email_sequence:${jobKey}`, job)
    } catch (err) {
      console.error(`[email-sequences] Failed to process ${jobKey}:`, err)
    }
  }

  const remainingJobs = pendingJobs.filter(async (jobKey) => {
    const job = await safeKvGet<EmailSequenceJob>(`email_sequence:${jobKey}`)
    return job?.status === 'pending'
  })
  await safeKvSet('email_sequence:pending', remainingJobs)

  return { processed, sent }
}

async function sendWelcomeEmail(userId: string, email: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false

  try {
    const metrics = await safeKvGet<StripeMetrics>(`metrics:${userId}`)
    const fiveMoves = await safeKvGet<FiveMovesResult>(`fivemoves:${userId}`)

    const context: WelcomeEmailContext = {
      mrr: metrics?.mrr ?? 0,
      runway: metrics?.runway ?? 0,
      churnRate: metrics?.churnRate ?? 0,
      topMoveTitle: fiveMoves?.moves?.[0]?.title,
      failedPaymentsValue: metrics?.failedPaymentsValue,
      failedPaymentsCount: metrics?.failedPaymentsCount,
    }

    const insight = await generatePersonalizedInsight(context, 'welcome')
    
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'MAX from Lucrum <max@lucrumcfo.vercel.app>',
      to: email,
      subject: 'MAX is analyzing your Stripe data',
      html: generateWelcomeEmailHtml(context, insight),
    })

    return true
  } catch (err) {
    console.error('[email-sequences] Welcome email failed:', err)
    return false
  }
}

async function sendSequenceEmail(job: EmailSequenceJob): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false

  try {
    const metrics = await safeKvGet<StripeMetrics>(`metrics:${job.userId}`)
    const fiveMoves = await safeKvGet<FiveMovesResult>(`fivemoves:${job.userId}`)

    const context: WelcomeEmailContext = {
      mrr: metrics?.mrr ?? 0,
      runway: metrics?.runway ?? 0,
      churnRate: metrics?.churnRate ?? 0,
      topMoveTitle: fiveMoves?.moves?.[0]?.title,
      failedPaymentsValue: metrics?.failedPaymentsValue,
      failedPaymentsCount: metrics?.failedPaymentsCount,
    }

    const emailContent = getEmailForDay(job.day, context)
    if (!emailContent) return false

    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'MAX from Lucrum <max@lucrumcfo.vercel.app>',
      to: job.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return true
  } catch (err) {
    console.error(`[email-sequences] Day ${job.day} email failed:`, err)
    return false
  }
}

function getEmailForDay(
  day: number,
  context: WelcomeEmailContext
): { subject: string; html: string } | null {
  switch (day) {
    case 2:
      return {
        subject: 'Your highest-value move this week',
        html: generateDay2EmailHtml(context),
      }
    case 5:
      return {
        subject: context.failedPaymentsValue && context.failedPaymentsValue > 0
          ? `We found $${context.failedPaymentsValue.toLocaleString()} in recoverable revenue`
          : 'Revenue leaks detected in your Stripe',
        html: generateDay5EmailHtml(context),
      }
    case 7:
      return {
        subject: 'How is MAX working for you?',
        html: generateDay7EmailHtml(context),
      }
    default:
      return null
  }
}

async function generatePersonalizedInsight(
  context: WelcomeEmailContext,
  type: 'welcome' | 'move' | 'leak'
): Promise<string> {
  try {
    const prompt = `Generate a single sentence insight for a SaaS founder with:
- MRR: $${context.mrr.toLocaleString()}
- Runway: ${context.runway} days
- Churn: ${context.churnRate}%
${context.failedPaymentsValue ? `- Failed payments: $${context.failedPaymentsValue}` : ''}

Type: ${type}
Be specific to their numbers. One sentence only.`

    const response = await callChatAI(undefined, prompt)
    return response.slice(0, 200)
  } catch {
    return context.runway < 90
      ? `With ${context.runway} days of runway, every decision counts.`
      : `Your $${context.mrr.toLocaleString()} MRR business has opportunities to grow.`
  }
}

function generateWelcomeEmailHtml(context: WelcomeEmailContext, insight: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo span { font-size: 24px; font-weight: bold; color: #c9a84c; }
        .card { background: #242424; border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #fff; font-size: 24px; margin: 0 0 16px; }
        p { color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
        .insight { background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; padding: 16px; margin: 24px 0; }
        .insight p { color: #c9a84c; margin: 0; }
        .cta { display: inline-block; background: #c9a84c; color: #1a1a1a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><span>Lucrum</span></div>
        <div class="card">
          <h1>MAX is on it.</h1>
          <p>Your Stripe data is now connected. MAX has run 50,000 Monte Carlo simulations and analyzed your revenue patterns.</p>
          
          <div class="insight">
            <p>${insight}</p>
          </div>
          
          <p>Your current snapshot:</p>
          <p style="color: #fff;">
            <strong>MRR:</strong> $${context.mrr.toLocaleString()}<br>
            <strong>Runway:</strong> ${context.runway === 9999 ? '∞' : context.runway + ' days'}<br>
            <strong>Churn:</strong> ${context.churnRate}%
          </p>
          
          ${context.topMoveTitle ? `<p>Your top recommended move: <strong style="color: #fff;">${context.topMoveTitle}</strong></p>` : ''}
          
          <a href="https://lucrumcfo.vercel.app/dashboard" class="cta">Open your dashboard →</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you connected your Stripe to Lucrum.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateDay2EmailHtml(context: WelcomeEmailContext): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo span { font-size: 24px; font-weight: bold; color: #c9a84c; }
        .card { background: #242424; border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #fff; font-size: 24px; margin: 0 0 16px; }
        p { color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
        .move { background: rgba(80,200,120,0.1); border: 1px solid rgba(80,200,120,0.2); border-radius: 8px; padding: 16px; margin: 24px 0; }
        .move h2 { color: #50c878; font-size: 18px; margin: 0 0 8px; }
        .move p { color: #a0a0a0; margin: 0; }
        .cta { display: inline-block; background: #c9a84c; color: #1a1a1a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><span>Lucrum</span></div>
        <div class="card">
          <h1>Your highest-value move this week</h1>
          <p>Based on your $${context.mrr.toLocaleString()} MRR and current metrics, here is what MAX recommends:</p>
          
          <div class="move">
            <h2>${context.topMoveTitle || 'Review your Five Moves'}</h2>
            <p>This move was selected from 5 options, ranked by potential impact and risk.</p>
          </div>
          
          <p>MAX has simulated this decision 50,000 times. The numbers favor action.</p>
          
          <a href="https://lucrumcfo.vercel.app/dashboard" class="cta">Execute this move →</a>
        </div>
        <div class="footer">
          <p>Lucrum • AI CFO for indie builders</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateDay5EmailHtml(context: WelcomeEmailContext): string {
  const hasLeaks = (context.failedPaymentsValue ?? 0) > 0
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo span { font-size: 24px; font-weight: bold; color: #c9a84c; }
        .card { background: #242424; border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #fff; font-size: 24px; margin: 0 0 16px; }
        p { color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
        .alert { background: rgba(220,60,60,0.1); border: 1px solid rgba(220,60,60,0.2); border-radius: 8px; padding: 16px; margin: 24px 0; }
        .alert h2 { color: #dc3c3c; font-size: 18px; margin: 0 0 8px; }
        .cta { display: inline-block; background: #c9a84c; color: #1a1a1a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><span>Lucrum</span></div>
        <div class="card">
          <h1>${hasLeaks ? `$${(context.failedPaymentsValue ?? 0).toLocaleString()} is slipping through the cracks` : 'Revenue leak scan complete'}</h1>
          
          ${hasLeaks ? `
            <div class="alert">
              <h2>${context.failedPaymentsCount ?? 0} failed payment${(context.failedPaymentsCount ?? 0) !== 1 ? 's' : ''}</h2>
              <p>$${(context.failedPaymentsValue ?? 0).toLocaleString()} can be recovered with one click.</p>
            </div>
            <p>Lucrum found these revenue leaks by scanning your Stripe data. Most can be fixed automatically.</p>
          ` : `
            <p>Good news: Lucrum scanned your Stripe and found no major revenue leaks. Your payment recovery is healthy.</p>
          `}
          
          <a href="https://lucrumcfo.vercel.app/dashboard" class="cta">${hasLeaks ? 'Recover revenue →' : 'View dashboard →'}</a>
        </div>
        <div class="footer">
          <p>Lucrum • AI CFO for indie builders</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateDay7EmailHtml(context: WelcomeEmailContext): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo span { font-size: 24px; font-weight: bold; color: #c9a84c; }
        .card { background: #242424; border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #fff; font-size: 24px; margin: 0 0 16px; }
        p { color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
        .cta { display: inline-block; background: #c9a84c; color: #1a1a1a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><span>Lucrum</span></div>
        <div class="card">
          <h1>Quick check-in</h1>
          <p>You have been using Lucrum for a week now. How is MAX working for you?</p>
          <p>If there is anything confusing, not working, or missing — just reply to this email. I read every response.</p>
          <p>Your business at a glance:</p>
          <p style="color: #fff;">
            <strong>MRR:</strong> $${context.mrr.toLocaleString()}<br>
            <strong>Runway:</strong> ${context.runway === 9999 ? '∞' : context.runway + ' days'}
          </p>
          <p>Want to unlock action execution, outcome tracking, and more?</p>
          <a href="https://lucrumcfo.vercel.app/pricing" class="cta">View upgrade options →</a>
        </div>
        <div class="footer">
          <p>Lucrum • AI CFO for indie builders</p>
        </div>
      </div>
    </body>
    </html>
  `
}
