import { kv } from '@vercel/kv'

export async function safeKvGet<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key)
  } catch (error) {
    console.error('[kv] get failed:', key, error)
    return null
  }
}

export async function safeKvSet(
  key: string,
  value: unknown,
  options?: { ex?: number }
): Promise<boolean> {
  try {
    if (options?.ex) {
      await kv.set(key, value, { ex: options.ex })
    } else {
      await kv.set(key, value)
    }
    return true
  } catch (error) {
    console.error('[kv] set failed:', key, error)
    return false
  }
}

export async function safeKvDel(...keys: string[]): Promise<number> {
  if (!keys.length) return 0

  try {
    return await kv.del(...keys)
  } catch (error) {
    console.error('[kv] del failed:', keys, error)
    return 0
  }
}
