import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLeadsWithStatus, sendColdEmail, setLeadStatus, processNewLeads } from '@/lib/cold-outreach'

export async function POST(req: NextRequest) {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const body = await req.json().catch(() => ({}))
		const { action, leadId, limit, testMode, minScore } = body

		// Process all new leads in batch
		if (action === 'process_all') {
			const result = await processNewLeads({
				limit: limit || 50,
				testMode: testMode || false,
				minScore: minScore || 3,
			})

			return NextResponse.json({
				ok: true,
				...result,
			})
		}

		// Send to a specific lead
		if (leadId) {
			const leads = await getLeadsWithStatus()
			const lead = leads.find(l => l.id === leadId)

			if (!lead) {
				return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
			}

			if (!lead.email) {
				return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
			}

			const result = await sendColdEmail(lead, { testMode: testMode || false })

			if (result.success) {
				await setLeadStatus(lead.id, 'emailed')
			}

			return NextResponse.json({
				ok: result.success,
				error: result.error,
			})
		}

		return NextResponse.json({ error: 'Specify action=process_all or provide leadId' }, { status: 400 })
	} catch (err) {
		console.error('[api/leads/outreach] Error:', err)
		return NextResponse.json({ error: 'Internal error' }, { status: 500 })
	}
}

// Preview what emails would be sent
export async function GET(req: NextRequest) {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { searchParams } = new URL(req.url)
	const minScore = parseInt(searchParams.get('minScore') || '3')
	const limit = parseInt(searchParams.get('limit') || '10')

	try {
		const leads = await getLeadsWithStatus()
		const toEmail = leads.filter(
			l => l.status === 'new' && l.score >= minScore && l.email
		).slice(0, limit)

		return NextResponse.json({
			wouldSendTo: toEmail.map(l => ({
				id: l.id,
				email: l.email,
				name: l.founder_name || l.username,
				product: l.product_name,
				score: l.score,
				source: l.source,
			})),
			count: toEmail.length,
			totalNew: leads.filter(l => l.status === 'new').length,
			totalWithEmail: leads.filter(l => l.status === 'new' && l.email).length,
		})
	} catch (err) {
		console.error('[api/leads/outreach] Error:', err)
		return NextResponse.json({ error: 'Internal error' }, { status: 500 })
	}
}
