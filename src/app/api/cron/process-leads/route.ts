import { NextRequest, NextResponse } from 'next/server'
import { processNewLeads, readLeadsFile } from '@/lib/cold-outreach'

/**
 * Cron endpoint to process leads daily
 *
 * Usage: Configure a cron job to call this endpoint daily
 * The CRON_SECRET environment variable must be set for authentication
 *
 * Example cron (Vercel Cron or external scheduler):
 * - Daily at 9 AM: curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/process-leads
 */
export async function GET(req: NextRequest) {
	// Validate cron secret
	const authHeader = req.headers.get('authorization') || req.headers.get('x-cron-secret')
	const cronSecret = process.env.CRON_SECRET

	if (cronSecret) {
		const providedSecret = authHeader?.replace('Bearer ', '')
		if (providedSecret !== cronSecret) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}
	}

	try {
		// Check if there are any leads to process
		const leads = readLeadsFile()

		if (leads.length === 0) {
			return NextResponse.json({
				ok: true,
				message: 'No leads in leads.json - run the scraper first',
				processed: 0,
				sent: 0,
			})
		}

		// Process new leads (send cold emails)
		// Limit to 5 per day to avoid rate limits and spam complaints
		const result = await processNewLeads({
			limit: 5,
			testMode: false,
			minScore: 4, // Only high-quality leads
		})

		return NextResponse.json({
			ok: true,
			timestamp: new Date().toISOString(),
			leadsAvailable: leads.length,
			...result,
		})
	} catch (err) {
		console.error('[cron/process-leads] Error:', err)
		return NextResponse.json({
			ok: false,
			error: String(err),
		}, { status: 500 })
	}
}

// Also support POST for manual triggering
export async function POST(req: NextRequest) {
	return GET(req)
}
