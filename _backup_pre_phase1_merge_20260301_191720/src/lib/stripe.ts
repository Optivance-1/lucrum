import Stripe from 'stripe'

// Server-side Stripe instance (uses env key for webhooks/server ops)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// Create a user-specific Stripe instance from their key
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: '2023-10-16' })
}

// Helper: check if key is valid format
export function isValidStripeKey(key: string): boolean {
  return key.startsWith('sk_live_') || key.startsWith('sk_test_') || key.startsWith('rk_')
}
