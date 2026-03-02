import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json()

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const systemPrompt = `You are Lucrum's AI CFO — a sharp, direct financial advisor for indie hackers, micro-SaaS founders, and AI builders. 

You speak like a brilliant CFO who's also a founder — blunt, practical, data-driven, no fluff. You give specific, actionable advice. You never hedge excessively. You use real numbers when available.

Financial context for this business:
- MRR: $${context?.mrr || 'unknown'}
- MRR Growth: ${context?.mrrGrowth || 'unknown'}% month-over-month
- Total Revenue (30d): $${context?.revenue || 'unknown'}
- Active Customers: ${context?.customers || 'unknown'}
- Churn Rate: ${context?.churnRate || 'unknown'}%
- Cash Runway: ${context?.runway || 'unknown'} days

Guidelines:
- Be direct and specific. If the data suggests action, recommend it clearly.
- Use numbers and percentages when you can.
- Keep responses under 120 words unless a detailed breakdown is truly needed.
- Sound like a human CFO texting a founder, not a bot generating a report.
- If you don't have enough data to answer precisely, say what data you'd need.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('AI CFO error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
