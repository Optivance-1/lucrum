import Anthropic from '@anthropic-ai/sdk'

export type AIProvider = 'gemini' | 'anthropic'

type GenerateAITextInput = {
  system?: string
  prompt: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}

export type GenerateAITextOutput = {
  text: string
  provider: AIProvider
}

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash'
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

function resolveProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase()
  if (configured === 'gemini' || configured === 'anthropic') return configured
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return 'anthropic'
}

function joinPrompt(system: string | undefined, prompt: string): string {
  if (!system?.trim()) return prompt
  return `${system.trim()}\n\n${prompt}`
}

async function generateWithAnthropic(input: GenerateAITextInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  const anthropic = new Anthropic({ apiKey })
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: input.maxTokens ?? 350,
    temperature: input.temperature ?? 0.3,
    ...(input.system?.trim() ? { system: input.system } : {}),
    messages: [{ role: 'user', content: input.prompt }],
  })

  const firstText = message.content.find(block => block.type === 'text')
  return firstText?.type === 'text' ? firstText.text : ''
}

async function generateWithGemini(input: GenerateAITextInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: joinPrompt(input.system, input.prompt) }],
      },
    ],
    generationConfig: {
      temperature: input.temperature ?? 0.3,
      maxOutputTokens: input.maxTokens ?? 350,
      ...(input.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${details}`)
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map(part => part.text ?? '').join('').trim()
}

export async function generateAIText(input: GenerateAITextInput): Promise<GenerateAITextOutput> {
  const preferred = resolveProvider()
  const fallback = preferred === 'gemini' ? 'anthropic' : 'gemini'

  try {
    const text = preferred === 'gemini'
      ? await generateWithGemini(input)
      : await generateWithAnthropic(input)
    return { text, provider: preferred }
  } catch (preferredError) {
    try {
      const text = fallback === 'gemini'
        ? await generateWithGemini(input)
        : await generateWithAnthropic(input)
      return { text, provider: fallback }
    } catch (fallbackError) {
      const firstMessage =
        preferredError instanceof Error ? preferredError.message : 'unknown provider error'
      const secondMessage =
        fallbackError instanceof Error ? fallbackError.message : 'unknown fallback error'
      throw new Error(`AI providers failed. preferred=${firstMessage}; fallback=${secondMessage}`)
    }
  }
}
