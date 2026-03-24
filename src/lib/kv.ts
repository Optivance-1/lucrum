import { createClient, type VercelKV } from '@vercel/kv'
import { logger } from '@/lib/logger'

let client: VercelKV | null = null

function getKvClient(): VercelKV | null {
  if (client) return client

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('kv', 'Missing KV_REST_API_URL or KV_REST_API_TOKEN in production')
    }
    return null
  }

  client = createClient({ url, token })
  return client
}

export async function safeKvGet<T>(key: string): Promise<T | null> {
  const kv = getKvClient()
  if (!kv) return null

  try {
    return await kv.get<T>(key)
  } catch (error) {
    logger.error('kv', 'get failed', { key, error })
    return null
  }
}

export async function safeKvSet(
  key: string,
  value: unknown,
  optionsOrTtl?: { ex?: number } | number
): Promise<boolean> {
  const kv = getKvClient()
  if (!kv) return false

  const ex = typeof optionsOrTtl === 'number' ? optionsOrTtl : optionsOrTtl?.ex

  try {
    if (ex) {
      await kv.set(key, value, { ex })
    } else {
      await kv.set(key, value)
    }
    return true
  } catch (error) {
    logger.error('kv', 'set failed', { key, error })
    return false
  }
}

export async function safeKvDel(...keys: string[]): Promise<number> {
  if (!keys.length) return 0

  const kv = getKvClient()
  if (!kv) return 0

  try {
    return await kv.del(...keys)
  } catch (error) {
    logger.error('kv', 'del failed', { keys, error })
    return 0
  }
}
