import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLeadsWithStatus, readLeadsFile } from '@/lib/cold-outreach'

export async function GET() {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const leads = await getLeadsWithStatus()
		const byStatus = {
			new: leads.filter(l => l.status === 'new').length,
			emailed: leads.filter(l => l.status === 'emailed').length,
			responded: leads.filter(l => l.status === 'responded').length,
			converted: leads.filter(l => l.status === 'converted').length,
			bounced: leads.filter(l => l.status === 'bounced').length,
		}

		return NextResponse.json({
			total: leads.length,
			byStatus,
			leads: leads.slice(0, 100), // Return top 100
		})
	} catch (err) {
		console.error('[api/leads] Error:', err)
		return NextResponse.json({ error: 'Failed to read leads' }, { status: 500 })
	}
}
