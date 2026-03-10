const DEFAULT_TIMEOUT_MS = 10_000

type ChatRole = 'system' | 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const result = await promise
    return result
  } finally {
    clearTimeout(id)
  }
}

function buildMessages(system: string | undefined, user: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (system && system.trim()) {
    messages.push({ role: 'system', content: system.trim() })
  }
  messages.push({ role: 'user', content: user })
  return messages
}

async function callOllama(
  system: string | undefined,
  user: string,
  scope: 'fast' | 'structured'
): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL
  if (!baseUrl || process.env.NODE_ENV !== 'development') return ''

  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`
  const body = {
    model: scope === 'structured'
      ? (process.env.OLLAMA_STRUCTURED_MODEL || 'mistral:latest')
      : (process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b'),
    messages: buildMessages(system, user),
    temperature: 0.2,
    stream: false,
  }

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    DEFAULT_TIMEOUT_MS
  )

  if (!res.ok) return ''
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

async function callRunpod(
  endpointEnvKey: 'RUNPOD_ENDPOINT_HEAVY_URL' | 'RUNPOD_ENDPOINT_CHAT_URL',
  defaultModel: string,
  system: string | undefined,
  user: string
): Promise<string> {
  const endpoint = process.env[endpointEnvKey]
  const apiKey = process.env.RUNPOD_API_KEY
  if (!endpoint || !apiKey) return ''

  const url = endpoint
  const body = {
    model: defaultModel,
    messages: buildMessages(system, user),
    temperature: 0.2,
    stream: false,
  }

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }),
    DEFAULT_TIMEOUT_MS
  )

  if (!res.ok) throw new Error(`RunPod request failed: ${res.status}`)
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

async function callGroq(
  system: string | undefined,
  user: string,
  purpose: 'heavy' | 'chat' | 'structured'
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return ''

  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const reasoningModel =
    process.env.GROQ_REASONING_MODEL || 'moonshotai/kimi-k2'
  const reasoningFallback =
    process.env.GROQ_REASONING_FALLBACK || 'qwen-qwq-32b'
  const chatModel =
    process.env.GROQ_CHAT_MODEL || 'meta-llama/llama-4-scout'
  const chatFallback =
    process.env.GROQ_CHAT_FALLBACK || 'llama-3.3-70b-versatile'
  const structuredModel =
    process.env.GROQ_STRUCTURED_MODEL || 'qwen-qwq-32b'

  const modelOrder =
    purpose === 'heavy'
      ? [reasoningModel, reasoningFallback]
      : purpose === 'chat'
      ? [chatModel, chatFallback]
      : [structuredModel, reasoningModel]

  const maxTokens =
    purpose === 'heavy' ? 400 : purpose === 'chat' ? 300 : 500

  const messages = buildMessages(
    system ? `${system.trim()}\n\nBe concise. Under ${purpose === 'heavy' ? 130 : 90} words.` : undefined,
    user
  )

  let lastError: unknown

  for (const model of modelOrder) {
    try {
      const res = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens: maxTokens,
            stream: false,
          }),
        }),
        DEFAULT_TIMEOUT_MS
      )

      if (res.status === 429) {
        logFailure(`${purpose}:groq:rate_limit`, new Error(`429 from ${model}`))
        // try next model immediately
        continue
      }

      if (!res.ok) {
        lastError = new Error(`Groq request failed (${res.status})`)
        continue
      }

      const data: any = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim()) {
        return content.trim()
      }
    } catch (err) {
      lastError = err
      logFailure(`${purpose}:groq:${model}`, err)
    }
  }

  if (lastError) throw lastError
  return ''
}

function logFailure(scope: string, error: unknown): void {
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.error(`[${ts}] [ai-client:${scope}] AI call failed:`, error)
}

async function callAiWithRouting(
  scope: 'heavy' | 'chat' | 'structured',
  system: string | undefined,
  user: string
): Promise<string> {
  // 1. RunPod (heavy or chat) – fastest when configured
  try {
    const model =
      scope === 'heavy'
        ? 'meta-llama/Llama-3.3-70B-Instruct'
        : 'Qwen/Qwen2.5-14B-Instruct'
    const endpointKey =
      scope === 'heavy' ? 'RUNPOD_ENDPOINT_HEAVY_URL' : 'RUNPOD_ENDPOINT_CHAT_URL'
    const runpodText = await callRunpod(endpointKey, model, system, user)
    if (runpodText) return runpodText
  } catch (err) {
    logFailure(`${scope}:runpod`, err)
  }

  // 2. Groq — primary backbone
  try {
    const groqText = await callGroq(system, user, scope === 'structured' ? 'structured' : scope)
    if (groqText) return groqText
  } catch (err) {
    logFailure(`${scope}:groq`, err)
  }

  // 3. Local Ollama fallback (free, unlimited in dev)
  try {
    const ollamaText = await callOllama(
      system,
      user,
      scope === 'structured' ? 'structured' : 'fast'
    )
    if (ollamaText) return ollamaText
  } catch (err) {
    logFailure(`${scope}:ollama`, err)
  }

  const ts = new Date().toISOString()
  logFailure(scope, new Error('All AI providers failed'))
  return 'AI analysis temporarily unavailable. Your metrics are still accurate.'
}

export async function callHeavyAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('heavy', system, user)
}

export async function callChatAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('chat', system, user)
}

export async function callStructuredAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('structured', system, user)
}

export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export async function callVisionAI(prompt: string, fileBase64: string, mimeType: string): Promise<string> {
  // 1. Groq vision (Llama 4 Scout supports vision)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: process.env.GROQ_CHAT_MODEL || 'meta-llama/llama-4-scout',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
                  { type: 'text', text: prompt },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 500,
            stream: false,
          }),
        }),
        15_000
      )
      if (res.ok) {
        const data: any = await res.json()
        const content = data?.choices?.[0]?.message?.content
        if (typeof content === 'string' && content.trim()) return content.trim()
      }
    } catch (err) {
      logFailure('vision:groq', err)
    }
  }

  // 2. Gemini 2.0 Flash
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  if (geminiKey) {
    try {
      const res = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mimeType, data: fileBase64 } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
            }),
          }
        ),
        15_000
      )
      if (res.ok) {
        const data: any = await res.json()
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof content === 'string' && content.trim()) return content.trim()
      }
    } catch (err) {
      logFailure('vision:gemini', err)
    }
  }

  return 'Document analysis unavailable. Please enter values manually.'
}
