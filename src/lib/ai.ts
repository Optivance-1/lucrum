export type AIProvider = 'groq' | 'gemini'

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

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash'

function resolveProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase()
  if (configured === 'groq' || configured === 'gemini') return configured
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return 'groq'
}

function joinPrompt(system: string | undefined, prompt: string): string {
  if (!system?.trim()) return prompt
  return `${system.trim()}\n\n${prompt}`
}

async function generateWithGroq(input: GenerateAITextInput): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model,
    messages: [
      ...(input.system?.trim() ? [{ role: 'system' as const, content: input.system.trim() }] : []),
      { role: 'user' as const, content: input.prompt },
    ],
    temperature: input.temperature ?? 0.3,
    max_tokens: input.maxTokens ?? 350,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Groq request failed (${res.status}): ${details}`)
  }

  const data = await res.json() as {
    choices?: Array<{
      message?: { content?: string }
    }>
  }

  const content = data.choices?.[0]?.message?.content
  return (content ?? '').trim()
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
  const fallback: AIProvider = preferred === 'groq' ? 'gemini' : 'groq'

  try {
    const text = preferred === 'groq'
      ? await generateWithGroq(input)
      : await generateWithGemini(input)
    return { text, provider: preferred }
  } catch (preferredError) {
    try {
      const text = fallback === 'groq'
        ? await generateWithGroq(input)
        : await generateWithGemini(input)
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
