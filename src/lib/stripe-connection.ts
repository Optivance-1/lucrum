import Stripe from 'stripe'
import crypto from 'crypto'
import { safeKvGet, safeKvSet, safeKvDel } from '@/lib/kv'
import { STRIPE_API_VERSION } from '@/lib/stripe'
import { getUserPlan, canUseActionExecution } from '@/lib/subscription'

export interface StripeConnection {
  encryptedAccessToken: string
  stripeAccountId: string
  scope: 'read_only' | 'read_write'
  connectedAt: number
  plan: string
  businessName?: string
}

let encryptionKeyValidated = false
let encryptionKeyError: string | null = null

function getEncryptionKey(): Buffer {
  const raw = process.env.COOKIE_ENCRYPTION_KEY

  if (!raw) {
    const msg = 'COOKIE_ENCRYPTION_KEY environment variable is required. Generate a 32+ character random string and set it in your environment.'
    if (!encryptionKeyValidated && !encryptionKeyError) {
      encryptionKeyError = msg
      console.error('[stripe-connection] FATAL:', msg)
    }
    throw new Error(msg)
  }

  if (raw.length < 32) {
    const msg = `COOKIE_ENCRYPTION_KEY must be at least 32 characters (got ${raw.length})`
    if (!encryptionKeyValidated && !encryptionKeyError) {
      encryptionKeyError = msg
      console.error('[stripe-connection] FATAL:', msg)
    }
    throw new Error(msg)
  }

  encryptionKeyValidated = true
  return crypto.createHash('sha256').update(raw).digest()
}

// Check encryption status at startup
export function isEncryptionReady(): { ready: boolean; error: string | null } {
  try {
    getEncryptionKey()
    return { ready: true, error: null }
  } catch (e) {
    return { ready: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    'v2',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decryptToken(ciphertext: string): string | null {
  if (!ciphertext.startsWith('v2.')) return null
  const key = getEncryptionKey()
  const [, ivB64, tagB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !dataB64) return null

  try {
    const iv = Buffer.from(ivB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')
    const encrypted = Buffer.from(dataB64, 'base64url')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

export async function getStripeConnection(userId: string): Promise<StripeConnection | null> {
  const connection = await safeKvGet<StripeConnection>(`stripe_connection:${userId}`)
  return connection
}

export async function getStripeClient(userId: string): Promise<Stripe | null> {
  const connection = await getStripeConnection(userId)
  if (!connection) return null

  const accessToken = decryptToken(connection.encryptedAccessToken)
  if (!accessToken) return null

  return new Stripe(accessToken, { apiVersion: STRIPE_API_VERSION })
}

export async function hasStripeConnected(userId: string): Promise<boolean> {
  const connection = await safeKvGet<StripeConnection>(`stripe_connection:${userId}`)
  return !!connection
}

export async function saveStripeConnection(
  userId: string,
  accessToken: string,
  stripeAccountId: string,
  scope: 'read_only' | 'read_write',
  plan: string,
  businessName?: string
): Promise<void> {
  const connection: StripeConnection = {
    encryptedAccessToken: encryptToken(accessToken),
    stripeAccountId,
    scope,
    connectedAt: Date.now(),
    plan,
    businessName,
  }

  await safeKvSet(`stripe_connection:${userId}`, connection)
  await safeKvSet(`stripe_account_user:${stripeAccountId}`, userId)
  await safeKvSet(`first_connection:${userId}`, true, 3600)
}

export async function disconnectStripe(userId: string): Promise<boolean> {
  try {
    const connection = await getStripeConnection(userId)
    if (!connection) return false

    if (process.env.LUCRUM_STRIPE_CLIENT_ID) {
      try {
        const response = await fetch('https://connect.stripe.com/oauth/deauthorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.LUCRUM_STRIPE_CLIENT_ID,
            stripe_user_id: connection.stripeAccountId,
          }),
        })
        if (!response.ok) {
          console.warn('[stripe-connection] Deauthorize failed:', await response.text())
        }
      } catch (err) {
        console.warn('[stripe-connection] Deauthorize request failed:', err)
      }
    }

    await safeKvDel(`stripe_connection:${userId}`)
    await safeKvDel(`stripe_account_user:${connection.stripeAccountId}`)
    await safeKvDel(`metrics:${userId}`)
    await safeKvDel(`customers:${userId}`)
    await safeKvDel(`fivemoves:${userId}`)
    await safeKvDel(`leaks:${userId}`)

    return true
  } catch (err) {
    console.error('[stripe-connection] disconnect failed:', err)
    return false
  }
}

export async function canExecuteActions(userId: string): Promise<boolean> {
  const connection = await getStripeConnection(userId)
  if (!connection) return false

  if (connection.scope !== 'read_write') return false

  const plan = await getUserPlan(userId)
  return canUseActionExecution(plan)
}

export async function needsScopeUpgrade(userId: string): Promise<boolean> {
  const connection = await getStripeConnection(userId)
  if (!connection) return false

  const plan = await getUserPlan(userId)
  if (!canUseActionExecution(plan)) return false

  return connection.scope === 'read_only'
}

export function getOAuthUrl(plan: string, state: string): string {
  const scope = plan === 'enterprise' ? 'read_write' : 'read_only'
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LUCRUM_STRIPE_CLIENT_ID!,
    scope,
    redirect_uri: redirectUri,
    state,
  })

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  stripe_user_id: string
  scope: string
} | null> {
  try {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_secret: process.env.LUCRUM_STRIPE_SECRET_KEY!,
      }),
    })

    if (!response.ok) {
      console.error('[stripe-connection] Token exchange failed:', await response.text())
      return null
    }

    return await response.json()
  } catch (err) {
    console.error('[stripe-connection] Token exchange error:', err)
    return null
  }
}
