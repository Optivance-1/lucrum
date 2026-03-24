import { safeKvGet, safeKvSet } from '@/lib/kv'

const DEFAULT_TIMEOUT_MS = 10_000
const GLM5_TIMEOUT_MS = 30_000

export type AiCostOptions = { userId?: string; plan?: string }

function getBillingPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function estimateCost(model: string, tokensUsed: number): number {
  return (tokensUsed / 1000) * (model.includes('heavy') || model === 'glm5' ? 0.2 : 0.12)
}

function capForPlan(plan: string): number {
  const caps: Record<string, number> = {
    starter: 1.5,
    growth: 3.0,
    pro: 8.0,
    solo: 1.5,
    enterprise: 8.0,
    demo: 1.5,
  }
  return caps[plan] ?? 1.5
}

function nextResetLabel(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function parseCostRecord(raw: string | null): { cost: number; calls: number } {
  if (!raw) return { cost: 0, calls: 0 }
  try {
    const prev = JSON.parse(raw) as { cost?: number; calls?: number }
    return {
      cost: typeof prev.cost === 'number' ? prev.cost : 0,
      calls: typeof prev.calls === 'number' ? prev.calls : 0,
    }
  } catch {
    return { cost: 0, calls: 0 }
  }
}

async function checkAiBudget(userId: string, plan: string): Promise<{ overBudget: boolean; cost: number; cap: number }> {
  const key = `ai_cost:${userId}:${getBillingPeriod()}`
  const raw = await safeKvGet<string>(key)
  const prev = parseCostRecord(raw)
  const cap = capForPlan(plan)
  return { overBudget: prev.cost >= cap, cost: prev.cost, cap }
}

export async function trackAICost(userId: string, plan: string, tokensUsed: number, model: string) {
  const key = `ai_cost:${userId}:${getBillingPeriod()}`
  const raw = await safeKvGet<string>(key)
  const prev = parseCostRecord(raw)
  const callCost = estimateCost(model, tokensUsed)
  const updated = { cost: prev.cost + callCost, calls: prev.calls + 1 }
  await safeKvSet(key, JSON.stringify(updated), { ex: 60 * 60 * 24 * 35 })
  const cap = capForPlan(plan)
  return {
    cost: updated.cost,
    cap,
    overBudget: updated.cost >= cap,
  }
}

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

async function callGLM5(
  system: string | undefined,
  user: string
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) return ''

  const url = 'https://integrate.api.nvidia.com/v1/chat/completions'
  const model = process.env.NVIDIA_GLM_MODEL || 'thudm/glm-4-9b-chat'

  const start = Date.now()
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(system, user),
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
      }),
    }),
    GLM5_TIMEOUT_MS
  )

  const remaining = res.headers.get('x-ratelimit-remaining-requests')
  if (remaining && parseInt(remaining, 10) < 100) {
    logFailure('glm5:rate_limit_low', new Error(`Remaining requests: ${remaining}`))
  }

  if (!res.ok) throw new Error(`GLM-5 request failed: ${res.status}`)
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return ''

  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const ms = Date.now() - start
  console.log(`[glm5] response in ${ms}ms`)
  return cleaned
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
  if (scope === 'heavy') {
    // Heavy: RunPod → GLM-5 → Kimi K2 → Qwen → Ollama
    try {
      const runpodText = await callRunpod('RUNPOD_ENDPOINT_HEAVY_URL', 'meta-llama/Llama-3.3-70B-Instruct', system, user)
      if (runpodText) return runpodText
    } catch (err) { logFailure('heavy:runpod', err) }

    try {
      const glmText = await callGLM5(system, user)
      if (glmText) return glmText
    } catch (err) { logFailure('heavy:glm5', err) }

    try {
      const groqText = await callGroq(system, user, 'heavy')
      if (groqText) return groqText
    } catch (err) { logFailure('heavy:groq', err) }

    try {
      const ollamaText = await callOllama(system, user, 'fast')
      if (ollamaText) return ollamaText
    } catch (err) { logFailure('heavy:ollama', err) }
  } else if (scope === 'chat') {
    // Chat: Llama 4 Scout on Groq stays primary — unchanged
    try {
      const runpodText = await callRunpod('RUNPOD_ENDPOINT_CHAT_URL', 'Qwen/Qwen2.5-14B-Instruct', system, user)
      if (runpodText) return runpodText
    } catch (err) { logFailure('chat:runpod', err) }

    try {
      const groqText = await callGroq(system, user, 'chat')
      if (groqText) return groqText
    } catch (err) { logFailure('chat:groq', err) }

    try {
      const ollamaText = await callOllama(system, user, 'fast')
      if (ollamaText) return ollamaText
    } catch (err) { logFailure('chat:ollama', err) }
  } else {
    // Structured: GLM-5 → Qwen 3 → Kimi K2 → Ollama
    try {
      const glmText = await callGLM5(system, user)
      if (glmText) return glmText
    } catch (err) { logFailure('structured:glm5', err) }

    try {
      const groqText = await callGroq(system, user, 'structured')
      if (groqText) return groqText
    } catch (err) { logFailure('structured:groq', err) }

    try {
      const ollamaText = await callOllama(system, user, 'structured')
      if (ollamaText) return ollamaText
    } catch (err) { logFailure('structured:ollama', err) }
  }

  logFailure(scope, new Error('All AI providers failed'))
  return scope === 'structured'
    ? '[]'
    : 'AI analysis temporarily unavailable. Your metrics are still accurate.'
}

export async function callGLM5AI(
  system: string | undefined,
  user: string,
  options?: AiCostOptions
): Promise<string> {
  if (options?.userId && options?.plan) {
    const b = await checkAiBudget(options.userId, options.plan)
    if (b.overBudget) {
      return `You've reached your monthly AI query limit. It resets on ${nextResetLabel()}.`
    }
  }
  try {
    const result = await callGLM5(system, user)
    if (result) {
      if (options?.userId && options?.plan) {
        const tokens = Math.ceil(((system?.length ?? 0) + user.length + result.length) / 4)
        await trackAICost(options.userId, options.plan, tokens, 'glm5')
      }
      return result
    }
  } catch (err) {
    logFailure('glm5:direct', err)
  }
  return callHeavyAI(system, user, options)
}

export async function callHeavyAI(
  system: string | undefined,
  user: string,
  options?: AiCostOptions
): Promise<string> {
  if (options?.userId && options?.plan) {
    const b = await checkAiBudget(options.userId, options.plan)
    if (b.overBudget) {
      return `You've reached your monthly AI query limit. It resets on ${nextResetLabel()}.`
    }
  }
  const out = await callAiWithRouting('heavy', system, user)
  if (options?.userId && options?.plan && out && !out.startsWith("You've reached")) {
    const tokens = Math.ceil(((system?.length ?? 0) + user.length + out.length) / 4)
    await trackAICost(options.userId, options.plan, tokens, 'heavy')
  }
  return out
}

export async function callChatAI(
  system: string | undefined,
  user: string,
  options?: AiCostOptions
): Promise<string> {
  if (options?.userId && options?.plan) {
    const b = await checkAiBudget(options.userId, options.plan)
    if (b.overBudget) {
      return `You've reached your monthly AI query limit. It resets on ${nextResetLabel()}.`
    }
  }
  const out = await callAiWithRouting('chat', system, user)
  if (options?.userId && options?.plan && out && !out.startsWith("You've reached")) {
    const tokens = Math.ceil(((system?.length ?? 0) + user.length + out.length) / 4)
    await trackAICost(options.userId, options.plan, tokens, 'chat')
  }
  return out
}

export async function callStructuredAI(
  system: string | undefined,
  user: string,
  options?: AiCostOptions
): Promise<string> {
  if (options?.userId && options?.plan) {
    const b = await checkAiBudget(options.userId, options.plan)
    if (b.overBudget) {
      return `You've reached your monthly AI query limit. It resets on ${nextResetLabel()}.`
    }
  }
  const out = await callAiWithRouting('structured', system, user)
  if (options?.userId && options?.plan && out && !out.startsWith("You've reached")) {
    const tokens = Math.ceil(((system?.length ?? 0) + user.length + out.length) / 4)
    await trackAICost(options.userId, options.plan, tokens, 'structured')
  }
  return out
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
