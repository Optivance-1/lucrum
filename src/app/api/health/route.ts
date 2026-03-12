// UptimeRobot setup: monitor https://[domain]/api/health
// Alert when status !== "healthy"
// SMS to brother's phone via UptimeRobot free tier

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ProviderStatus = 'ok' | 'failed' | 'not_configured'

async function pingProvider(
  name: string,
  fn: () => Promise<Response>
): Promise<{ status: ProviderStatus; ms: number }> {
  const start = Date.now()
  try {
    const res = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return { status: res.ok ? 'ok' : 'failed', ms: Date.now() - start }
  } catch {
    return { status: 'failed', ms: Date.now() - start }
  }
}

export async function GET() {
  const start = Date.now()
  const providers: Record<string, ProviderStatus> = {}
  const responseTimes: Record<string, number> = {}

  const groqKey = process.env.GROQ_API_KEY
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  const nvidiaKey = process.env.NVIDIA_API_KEY
  const ollamaUrl = process.env.OLLAMA_URL
  const runpodKey = process.env.RUNPOD_API_KEY
  const runpodHeavy = process.env.RUNPOD_ENDPOINT_HEAVY_URL

  const checks: Promise<void>[] = []

  if (groqKey) {
    checks.push(
      pingProvider('groq', () =>
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: process.env.GROQ_CHAT_FALLBACK || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            temperature: 0,
            max_tokens: 3,
            stream: false,
          }),
        })
      ).then(r => {
        providers.groq = r.status
        responseTimes.groq = r.ms
      })
    )
  } else {
    providers.groq = 'not_configured'
  }

  if (geminiKey) {
    checks.push(
      pingProvider('gemini', () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 3 },
            }),
          }
        )
      ).then(r => {
        providers.gemini = r.status
        responseTimes.gemini = r.ms
      })
    )
  } else {
    providers.gemini = 'not_configured'
  }

  if (nvidiaKey) {
    checks.push(
      pingProvider('glm5', () =>
        fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nvidiaKey}` },
          body: JSON.stringify({
            model: process.env.NVIDIA_GLM_MODEL || 'thudm/glm-4-9b-chat',
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            temperature: 0,
            max_tokens: 3,
            stream: false,
          }),
        })
      ).then(r => {
        providers.glm5 = r.status
        responseTimes.glm5 = r.ms
      })
    )
  } else {
    providers.glm5 = 'not_configured'
  }

  if (ollamaUrl) {
    checks.push(
      pingProvider('ollama', () =>
        fetch(`${ollamaUrl.replace(/\/+$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral:latest',
            stream: false,
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            options: { temperature: 0, num_predict: 3 },
          }),
        })
      ).then(r => {
        providers.ollama = r.status
        responseTimes.ollama = r.ms
      })
    )
  } else {
    providers.ollama = 'not_configured'
  }

  if (runpodKey && runpodHeavy) {
    checks.push(
      pingProvider('runpod', () =>
        fetch(runpodHeavy, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runpodKey}` },
          body: JSON.stringify({
            model: 'default',
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            max_tokens: 3,
            temperature: 0,
            stream: false,
          }),
        })
      ).then(r => {
        providers.runpod = r.status
        responseTimes.runpod = r.ms
      })
    )
  } else {
    providers.runpod = 'not_configured'
  }

  await Promise.allSettled(checks)

  const okProviders = Object.values(providers).filter(s => s === 'ok')
  const configuredProviders = Object.values(providers).filter(s => s !== 'not_configured')
  const primaryOk = providers.groq === 'ok'

  let status: 'healthy' | 'degraded' | 'down'
  if (primaryOk) {
    status = 'healthy'
  } else if (okProviders.length > 0) {
    status = 'degraded'
  } else if (configuredProviders.length === 0) {
    status = 'degraded'
  } else {
    status = 'down'
  }

  const activeProvider = providers.groq === 'ok' ? 'groq'
    : providers.glm5 === 'ok' ? 'glm5'
    : providers.runpod === 'ok' ? 'runpod'
    : providers.gemini === 'ok' ? 'gemini'
    : providers.ollama === 'ok' ? 'ollama'
    : 'none'

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    providers,
    active_provider: activeProvider,
    simulation_cache: 'ok',
    response_time_ms: responseTimes,
  })
}
