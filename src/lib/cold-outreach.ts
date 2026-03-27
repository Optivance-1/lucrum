import { Resend } from 'resend'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'

// Lead status tracking
export type LeadStatus = 'new' | 'emailed' | 'responded' | 'converted' | 'bounced'

export interface ScrapedLead {
	source: string
	product_name?: string
	founder_name?: string
	website?: string
	twitter_handle?: string
	username?: string
	email?: string
	follower_count?: number
	upvote_count?: number
	score: number
	priority: boolean
	post_title?: string
	post_text?: string
	mrr_text?: string
}

export interface LeadWithStatus extends ScrapedLead {
	id: string
	status: LeadStatus
	emailedAt?: number
	respondedAt?: number
	convertedAt?: number
}

function getResendClient(): Resend | null {
	if (!process.env.RESEND_API_KEY) return null
	return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Read leads from the JSON file produced by the Python scraper
 */
export function readLeadsFile(): ScrapedLead[] {
	try {
		const leadsPath = path.join(process.cwd(), 'leads.json')
		if (!fs.existsSync(leadsPath)) {
			logger.info('cold-outreach', 'leads.json not found')
			return []
		}
		const content = fs.readFileSync(leadsPath, 'utf-8')
		const leads = JSON.parse(content)
		return Array.isArray(leads) ? leads : []
	} catch (err) {
		logger.error('cold-outreach', 'failed to read leads.json', err)
		return []
	}
}

/**
 * Generate a unique ID for a lead based on available identifiers
 */
function generateLeadId(lead: ScrapedLead): string {
	const parts = [
		lead.email,
		lead.twitter_handle,
		lead.username,
		lead.website,
		lead.product_name,
	].filter(Boolean)
	return parts.join('|').toLowerCase().slice(0, 100) || `unknown-${Date.now()}`
}

/**
 * Get lead status from KV store
 */
export async function getLeadStatus(leadId: string): Promise<LeadStatus> {
	const status = await safeKvGet<LeadStatus>(`lead_status:${leadId}`)
	return status || 'new'
}

/**
 * Set lead status in KV store
 */
export async function setLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
	await safeKvSet(`lead_status:${leadId}`, status, { ex: 60 * 60 * 24 * 90 }) // 90 days TTL
}

/**
 * Get leads with their current status
 */
export async function getLeadsWithStatus(): Promise<LeadWithStatus[]> {
	const leads = readLeadsFile()
	const withStatus: LeadWithStatus[] = []

	for (const lead of leads) {
		const id = generateLeadId(lead)
		const status = await getLeadStatus(id)
		withStatus.push({
			...lead,
			id,
			status,
		})
	}

	// Sort: new first, then by score
	return withStatus.sort((a, b) => {
		if (a.status === 'new' && b.status !== 'new') return -1
		if (a.status !== 'new' && b.status === 'new') return 1
		return b.score - a.score
	})
}

/**
 * Cold email template for SaaS founders
 */
function generateColdEmailHtml(lead: ScrapedLead): string {
	const name = lead.founder_name || lead.username || 'Founder'
	const productRef = lead.product_name
		? `I noticed ${lead.product_name} on ${lead.source}`
		: `I came across your post on ${lead.source}`
	const mrrRef = lead.mrr_text
		? ` Seeing that you're at ${lead.mrr_text} is impressive.`
		: ''

	return `
<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 40px 20px; }
.container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.logo { text-align: center; margin-bottom: 32px; }
.logo span { font-size: 28px; font-weight: bold; color: #c9a84c; }
h1 { color: #1a1a1a; font-size: 22px; margin: 0 0 16px; }
p { color: #4a4a4a; font-size: 16px; line-height: 1.7; margin: 0 0 16px; }
.highlight { background: #f0f7ff; border-left: 4px solid #c9a84c; padding: 16px; margin: 24px 0; }
.highlight p { margin: 0; color: #1a1a1a; }
.cta { display: inline-block; background: #c9a84c; color: #1a1a1a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
.footer { text-align: center; margin-top: 32px; color: #888; font-size: 13px; }
</style>
</head>
<body>
<div class="container">
	<div class="logo"><span>Lucrum</span></div>
	<h1>Hey ${name},</h1>
	<p>${productRef}.${mrrRef}</p>
	<p>I'm building <a href="https://lucrumcfo.vercel.app" style="color: #c9a84c;">Lucrum</a> — an AI CFO that connects to your Stripe and gives you live MRR tracking, runway calculations, and AI-generated growth insights.</p>
	<div class="highlight">
		<p>Most founders know their bank balance. Fewer know their real MRR, churn rate, or how many days of runway they actually have. Lucrum fixes that in 60 seconds.</p>
	</div>
	<p>It's free to try — just connect your Stripe and see your numbers instantly.</p>
	<a href="https://lucrumcfo.vercel.app" class="cta">See your MRR & Runway →</a>
	<p style="margin-top: 24px; color: #888; font-size: 14px;">If this isn't relevant, just ignore this email. No hard feelings.</p>
	<div class="footer">
		<p>Lucrum • AI CFO for indie builders</p>
	</div>
</div>
</body>
</html>
`
}

/**
 * Send cold email to a lead
 */
export async function sendColdEmail(
	lead: ScrapedLead,
	options: { testMode?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
	const resend = getResendClient()
	if (!resend) {
		return { success: false, error: 'RESEND_API_KEY not configured' }
	}

	if (!lead.email) {
		return { success: false, error: 'No email address for lead' }
	}

	const name = lead.founder_name || lead.username || 'Founder'
	const subject = lead.product_name
		? `Quick question about ${lead.product_name}`
		: 'Quick question about your SaaS'

	if (options.testMode) {
		logger.info('cold-outreach', `[TEST] Would send to ${lead.email}: ${subject}`)
		return { success: true }
	}

	try {
		await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
			to: lead.email,
			subject,
			html: generateColdEmailHtml(lead),
			replyTo: process.env.OPERATOR_EMAIL,
		})

		logger.info('cold-outreach', `Sent email to ${lead.email}`)
		return { success: true }
	} catch (err) {
		logger.error('cold-outreach', `Failed to send to ${lead.email}`, err)
		return { success: false, error: String(err) }
	}
}

/**
 * Process all new leads and send emails
 */
export async function processNewLeads(
	options: {
		limit?: number
		testMode?: boolean
		minScore?: number
	} = {}
): Promise<{ processed: number; sent: number; skipped: number; errors: string[] }> {
	const { limit = 50, testMode = false, minScore = 3 } = options

	const leads = await getLeadsWithStatus()
	const newLeads = leads.filter(
		(l) => l.status === 'new' && l.score >= minScore && l.email
	)

	const toProcess = newLeads.slice(0, limit)
	const errors: string[] = []
	let sent = 0
	let skipped = 0

	for (const lead of toProcess) {
		const result = await sendColdEmail(lead, { testMode })

		if (result.success) {
			await setLeadStatus(lead.id, 'emailed')
			if (!testMode) {
				await safeKvSet(`lead_emailed_at:${lead.id}`, Date.now(), { ex: 60 * 60 * 24 * 90 })
			}
			sent++
		} else {
			errors.push(`${lead.email || lead.id}: ${result.error}`)
			skipped++
		}
	}

	return {
		processed: toProcess.length,
		sent,
		skipped,
		errors,
	}
}
