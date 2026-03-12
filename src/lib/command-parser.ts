import type { CFOContext, ParsedCommand, CommandIntent } from '@/types'
import { callStructuredAI, stripThinking } from '@/lib/ai-client'

const VALID_INTENTS: CommandIntent[] = [
  'price_change',
  'recover_payments',
  'churn_recovery',
  'runway_forecast',
  'apply_discount',
  'cancel_customer',
  'pause_customer',
  'expand_customer',
  'analyze_segment',
  'unknown',
]

export async function parseCommand(
  input: string,
  context: Partial<CFOContext>
): Promise<ParsedCommand> {
  const mrr = context.mrr ?? 0
  const activeSubscriptions = context.activeSubscriptions ?? 0

  const prompt = `Parse this founder command into structured JSON.
Context: MRR $${mrr}, ${activeSubscriptions} customers.
Command: '${input}'

Return ONLY valid JSON with no markdown or preamble:
{
  "intent": one of [price_change, recover_payments, churn_recovery, runway_forecast, apply_discount, cancel_customer, pause_customer, expand_customer, analyze_segment, unknown],
  "params": { relevant parameters extracted from the command },
  "confidence": 0.0-1.0,
  "requiresSimulation": true/false,
  "requiresConfirmation": true/false,
  "isDestructive": true/false
}

Examples of intent mapping:
- "raise pro plan price 10%" → price_change, params: { percent: 10, plan: "pro" }
- "recover my failed payments" → recover_payments, params: {}
- "what happens if I raise prices 20%" → price_change, params: { percent: 20, simulate: true }
- "who are my highest churn risk customers" → analyze_segment, params: { segment: "churn_risk" }
- "give everyone a 20% discount for 3 months" → apply_discount, params: { percent: 20, months: 3 }
- "forecast my runway" → runway_forecast, params: {}
- "cancel customer xyz" → cancel_customer, params: { customerId: "xyz" }
- "pause subscription abc" → pause_customer, params: { subscriptionId: "abc" }
- "show expansion opportunities" → expand_customer, params: {}

Guidelines:
- If the command contains "what if", "simulate", "what happens", set requiresSimulation: true
- price_change, cancel_customer, pause_customer are destructive
- recover_payments, runway_forecast, analyze_segment are not destructive
- If unsure about intent, set confidence low and intent to "unknown"`

  try {
    const raw = stripThinking(await callStructuredAI(undefined, prompt))
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      let intent: CommandIntent = parsed.intent
      if (!VALID_INTENTS.includes(intent)) {
        intent = 'unknown'
      }
      
      let confidence = typeof parsed.confidence === 'number' 
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5
      
      if (confidence < 0.6) {
        intent = 'unknown'
      }

      const requiresSimulation = intent === 'price_change' || 
        intent === 'apply_discount' ||
        parsed.params?.simulate === true ||
        parsed.requiresSimulation === true

      const isDestructive = ['price_change', 'cancel_customer', 'pause_customer'].includes(intent)
      
      const requiresConfirmation = isDestructive || requiresSimulation

      return {
        intent,
        params: parsed.params ?? {},
        confidence,
        requiresSimulation,
        requiresConfirmation,
        isDestructive,
        rawInput: input,
      }
    }
  } catch (err) {
    console.error('[command-parser] parse failed:', err)
  }

  return {
    intent: 'unknown',
    params: {},
    confidence: 0,
    requiresSimulation: false,
    requiresConfirmation: false,
    isDestructive: false,
    rawInput: input,
  }
}

export function isLikelyCommand(input: string): boolean {
  const commandPatterns = [
    /^(raise|lower|change|update|set)\s+(price|pricing)/i,
    /^recover\s+(failed\s+)?payments?/i,
    /^retry\s+(failed\s+)?payments?/i,
    /^(send|launch)\s+churn\s+recovery/i,
    /^forecast\s+(my\s+)?runway/i,
    /^(show|give|apply)\s+.*(discount|coupon)/i,
    /^cancel\s+(customer|subscription)/i,
    /^pause\s+(customer|subscription)/i,
    /^(show|list|find)\s+(churn\s+risk|at[\s-]?risk|expansion)/i,
    /^who.*(churn|cancel|at[\s-]?risk)/i,
    /^what\s+(happens|if)\s+/i,
    /^expand\s+(my\s+)?(top|best)/i,
  ]

  return commandPatterns.some(pattern => pattern.test(input.trim()))
}

export function getCommandSuggestions(): string[] {
  return [
    'recover failed payments',
    'raise prices 10%',
    'forecast 90-day runway',
    'show churn risks',
    'apply 20% discount for 3 months',
    'show expansion opportunities',
  ]
}

export function formatCommandHelp(intent: CommandIntent): string {
  const help: Record<CommandIntent, string> = {
    price_change: 'Try: "raise prices 10%" or "what if I raise prices 15%"',
    recover_payments: 'Try: "recover failed payments" or "retry past due invoices"',
    churn_recovery: 'Try: "send churn recovery emails" or "launch retention campaign"',
    runway_forecast: 'Try: "forecast my runway" or "how long until I run out of cash"',
    apply_discount: 'Try: "give 20% discount for 3 months" or "apply retention coupon"',
    cancel_customer: 'Try: "cancel customer [email]" or "cancel subscription [id]"',
    pause_customer: 'Try: "pause customer [email]" or "pause subscription [id]"',
    expand_customer: 'Try: "expand top customers" or "show upgrade candidates"',
    analyze_segment: 'Try: "show churn risk customers" or "who is at risk"',
    unknown: 'Try:\n• "recover failed payments"\n• "raise prices 10%"\n• "show churn risks"\n• "forecast my runway"',
  }
  return help[intent]
}
