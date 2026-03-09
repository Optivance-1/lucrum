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
    // @ts-expect-error signal is valid for fetch
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

async function callOllama(system: string | undefined, user: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL
  if (!baseUrl || process.env.NODE_ENV !== 'development') return ''

  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`
  const body = {
    model: 'mistral:latest',
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

async function callTogether(system: string | undefined, user: string): Promise<string> {
  const apiKey = process.env.TOGETHER_API_KEY
  const baseUrl = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1'
  if (!apiKey) return ''

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const body = {
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
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

  if (!res.ok) return ''
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

function logFailure(scope: string, error: unknown): void {
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.error(`[${ts}] [ai-client:${scope}] AI call failed:`, error)
}

async function callAiWithRouting(
  scope: 'heavy' | 'chat',
  system: string | undefined,
  user: string
): Promise<string> {
  // 1. Local Ollama for development
  try {
    const ollamaText = await callOllama(system, user)
    if (ollamaText) return ollamaText
  } catch (err) {
    logFailure(`${scope}:ollama`, err)
  }

  // 2. RunPod (heavy or chat)
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

  // 3. Together.ai fallback
  try {
    const togetherText = await callTogether(system, user)
    if (togetherText) return togetherText
  } catch (err) {
    logFailure(`${scope}:together`, err)
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

