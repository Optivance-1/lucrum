import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { safeKvGet, safeKvSet, safeKvDel } from '@/lib/kv'
import type { ParsedCommand } from '@/types'

const HOLD_SECRET = () => process.env.HOLD_TOKEN_SECRET || process.env.COOKIE_ENCRYPTION_KEY || 'dev-hold-secret'

function signPayload(payload: string): string {
  return createHmac('sha256', HOLD_SECRET()).update(payload).digest('hex')
}

export async function generateHoldToken(userId: string, action: ParsedCommand): Promise<string> {
  const nonce = randomBytes(16).toString('hex')
  const payload = JSON.stringify({
    userId,
    intent: action.intent,
    params: action.params,
    nonce,
    v: 1,
  })
  const sig = signPayload(payload)
  const token = Buffer.from(`${payload}::${sig}`, 'utf8').toString('base64url')
  await safeKvSet(`action_hold:${userId}:${nonce}`, token, 48 * 3600)
  return token
}

export async function validateHoldToken(
  userId: string,
  token: string | undefined,
  action: ParsedCommand
): Promise<boolean> {
  if (!token) return false
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const sep = raw.lastIndexOf('::')
    if (sep <= 0) return false
    const payload = raw.slice(0, sep)
    const sig = raw.slice(sep + 2)
    const expected = signPayload(payload)
    if (sig.length !== expected.length) return false
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false
    const parsed = JSON.parse(payload) as {
      userId?: string
      intent?: string
      nonce?: string
    }
    if (parsed.userId !== userId || parsed.intent !== action.intent) return false
    const kv = await safeKvGet<string>(`action_hold:${userId}:${parsed.nonce ?? ''}`)
    return kv === token
  } catch {
    return false
  }
}

export async function consumeHoldToken(userId: string, token: string | undefined): Promise<void> {
  if (!token) return
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const sep = raw.lastIndexOf('::')
    if (sep <= 0) return
    const parsed = JSON.parse(raw.slice(0, sep)) as { nonce?: string }
    if (parsed.nonce) {
      await safeKvDel(`action_hold:${userId}:${parsed.nonce}`)
    }
  } catch {
    /* ignore */
  }
}
