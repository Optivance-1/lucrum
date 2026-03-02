import Stripe from 'stripe'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Pinned API version — used everywhere for consistency
export const STRIPE_API_VERSION = '2023-10-16' as const
export const STRIPE_KEY_COOKIE = 'stripe_key'
export const STRIPE_ACCOUNTS_COOKIE = 'stripe_accounts'
const ENCRYPTION_PREFIX = 'v1'

// Server-side Stripe instance (uses env key for webhooks & server ops)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: STRIPE_API_VERSION,
})

// Create a user-scoped Stripe client from their stored key
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}

// Validate Stripe key format before making any API calls
export function isValidStripeKey(key: string): boolean {
  return (
    key.startsWith('sk_live_') ||
    key.startsWith('sk_test_') ||
    key.startsWith('rk_live_') ||
    key.startsWith('rk_test_')
  )
}

function getCookieEncryptionKey(): Buffer | null {
  const raw = process.env.COOKIE_ENCRYPTION_KEY
  if (!raw) return null
  // Normalize arbitrary-length env secret into a fixed 32-byte key.
  return createHash('sha256').update(raw).digest()
}

export function encryptStripeKey(secretKey: string): string | null {
  const key = getCookieEncryptionKey()
  if (!key) return null

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secretKey, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decryptStripeKey(ciphertext: string): string | null {
  if (!ciphertext.startsWith(`${ENCRYPTION_PREFIX}.`)) return null

  const key = getCookieEncryptionKey()
  if (!key) return null

  const [, ivB64, tagB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !dataB64) return null

  try {
    const iv = Buffer.from(ivB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')
    const encrypted = Buffer.from(dataB64, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

type StripeAccountsPayload = {
  v: 1
  activeId: string | null
  accounts: { id: string; label: string; secretKey: string }[]
}

export function parseStripeAccountsCookie(raw: string): StripeAccountsPayload | null {
  const maybeDecrypted = raw.startsWith(`${ENCRYPTION_PREFIX}.`) ? decryptStripeKey(raw) : raw
  if (!maybeDecrypted) return null
  try {
    const parsed = JSON.parse(maybeDecrypted)
    if (parsed?.v !== 1 || !Array.isArray(parsed.accounts)) return null
    return parsed as StripeAccountsPayload
  } catch {
    return null
  }
}

export function serializeStripeAccountsCookie(payload: StripeAccountsPayload): string | null {
  const raw = JSON.stringify(payload)
  const encrypted = encryptStripeKey(raw)
  if (encrypted) return encrypted
  if (process.env.NODE_ENV !== 'production') return raw
  return null
}

// Get Stripe key from request cookies (encrypted in production).
export function getStripeKeyFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined }
): string | null {
  const accountsRaw = cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
  if (accountsRaw) {
    const payload = parseStripeAccountsCookie(accountsRaw)
    if (payload?.accounts?.length) {
      const active = payload.activeId
        ? payload.accounts.find(a => a.id === payload.activeId)
        : payload.accounts[0]
      if (active?.secretKey) return active.secretKey
    }
  }

  const raw = cookies.get(STRIPE_KEY_COOKIE)?.value
  if (!raw) return null

  if (raw.startsWith(`${ENCRYPTION_PREFIX}.`)) {
    return decryptStripeKey(raw)
  }

  // Backward compatibility for local dev sessions created before encryption.
  if (process.env.NODE_ENV !== 'production') {
    return raw
  }

  return null
}
