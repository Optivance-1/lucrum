import { logger } from '@/lib/logger'

/**
 * Wrap a promise with a timeout, returning a fallback if the timeout is exceeded.
 * Prevents Stripe API calls from hanging indefinitely.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  context?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )

  try {
    return await Promise.race([promise, timeout])
  } catch (err) {
    if (context) {
      logger.warn('stripe-helpers', `${context} timed out after ${ms}ms`)
    }
    return fallback
  }
}

/**
 * Retry a function with exponential backoff.
 * Useful for Stripe API calls that may fail due to rate limiting.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = (err) => {
      if (err instanceof Error) {
        // Retry on rate limit or temporary errors
        const msg = err.message.toLowerCase()
        return (
          msg.includes('rate limit') ||
          msg.includes('timeout') ||
          msg.includes('temporarily') ||
          msg.includes('overloaded')
        )
      }
      return false
    },
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt < maxRetries && shouldRetry(err)) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
        logger.warn('stripe-helpers', `Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: err instanceof Error ? err.message : String(err),
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        break
      }
    }
  }

  throw lastError
}

/**
 * Safely access a nullable value with a default.
 * Type-safe way to handle potentially undefined Stripe responses.
 */
export function safeGet<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback
}

/**
 * Validate that a price ID matches expected format.
 */
export function isValidStripePriceId(priceId: string | undefined): boolean {
  if (!priceId) return false
  return /^price_[a-zA-Z0-9]+$/.test(priceId)
}

/**
 * Validate that a customer ID matches expected format.
 */
export function isValidStripeCustomerId(customerId: string | undefined): boolean {
  if (!customerId) return false
  return /^cus_[a-zA-Z0-9]+$/.test(customerId)
}

/**
 * Validate that a subscription ID matches expected format.
 */
export function isValidStripeSubscriptionId(subscriptionId: string | undefined): boolean {
  if (!subscriptionId) return false
  return /^sub_[a-zA-Z0-9]+$/.test(subscriptionId)
}
