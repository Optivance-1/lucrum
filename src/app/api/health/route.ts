// OPERATOR SETUP: 
// Go to uptimerobot.com (free)
// Add new monitor: HTTP(s)
// URL: [this endpoint URL]
// Interval: every 30 minutes
// Alert contact: [brother's phone number]
// If status is not "healthy" → sends SMS automatically

import { NextResponse } from 'next/server'

type CheckResult = {
  ok: boolean
  durationMs: number
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

async function pingOllama(): Promise<CheckResult> {
  const baseUrl = process.env.OLLAMA_URL
  if (!baseUrl) return { ok: false, durationMs: 0 }
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`
  const body = {
    model: 'mistral:latest',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 1,
    temperature: 0,
    stream: false,
  }
  const start = Date.now()
  try {
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      10_000
    )
    const ok = res.ok
    return { ok, durationMs: Date.now() - start }
  } catch {
    return { ok: false, durationMs: Date.now() - start }
  }
}

async function pingRunpod(endpointEnvKey: string, model: string): Promise<CheckResult> {
  const endpoint = process.env[endpointEnvKey]
  const apiKey = process.env.RUNPOD_API_KEY
  if (!endpoint || !apiKey) return { ok: false, durationMs: 0 }

  const url = endpoint
  const body = {
    model,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 1,
    temperature: 0,
    stream: false,
  }
  const start = Date.now()
  try {
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }),
      10_000
    )
    const ok = res.ok
    return { ok, durationMs: Date.now() - start }
  } catch {
    return { ok: false, durationMs: Date.now() - start }
  }
}

export async function GET() {
  const start = Date.now()
  const fallbackAvailable = Boolean(process.env.TOGETHER_API_KEY)

  let lucrumChat = 'failed' as 'ok' | 'failed'
  let lucrumInsights = 'failed' as 'ok' | 'failed'

  let chatCheck: CheckResult = { ok: false, durationMs: 0 }
  let heavyCheck: CheckResult = { ok: false, durationMs: 0 }

  if (process.env.OLLAMA_URL && process.env.NODE_ENV === 'development') {
    const ollamaCheck = await pingOllama()
    chatCheck = ollamaCheck
    heavyCheck = ollamaCheck
  } else {
    heavyCheck = await pingRunpod('RUNPOD_ENDPOINT_HEAVY_URL', 'meta-llama/Llama-3.3-70B-Instruct')
    chatCheck = await pingRunpod('RUNPOD_ENDPOINT_CHAT_URL', 'Qwen/Qwen2.5-14B-Instruct')
  }

  lucrumChat = chatCheck.ok ? 'ok' : 'failed'
  lucrumInsights = heavyCheck.ok ? 'ok' : 'failed'

  let status: 'healthy' | 'degraded' | 'down' = 'healthy'
  const anyOk = chatCheck.ok || heavyCheck.ok

  if (anyOk) {
    status = 'healthy'
  } else if (fallbackAvailable) {
    status = 'degraded'
  } else {
    status = 'down'
  }

  const responseTimeMs = Math.max(chatCheck.durationMs, heavyCheck.durationMs, Date.now() - start)

  return NextResponse.json({
    status,
    lucrum_chat: lucrumChat,
    lucrum_insights: lucrumInsights,
    fallback_available: fallbackAvailable,
    timestamp: new Date().toISOString(),
    response_time_ms: responseTimeMs,
  })
}

