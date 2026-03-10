import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/lib/stripe'
import { safeKvDel, safeKvGet, safeKvSet } from '@/lib/kv'
import {
  rememberBillingCustomerOwner,
  rememberBillingSubscriptionOwner,
} from '@/lib/user-state'

export type UserPlan = 'free' | 'pro'

export type SubscriptionRecord = {
  userId: string
  plan: UserPlan
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  priceId: string | null
  currentPeriodEnd: number | null
  updatedAt: string
}

function getBillingKey(name: string, userId: string): string {
  return `lucrum:${name}:${userId}`
}

export function getLucrumStripe(): Stripe | null {
  const secretKey = process.env.LUCRUM_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  })
}

export async function getUserSubscriptionRecord(userId: string): Promise<SubscriptionRecord | null> {
  return safeKvGet<SubscriptionRecord>(getBillingKey('plan', userId))
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const record = await getUserSubscriptionRecord(userId)
  if (!record) return 'free'

  const activeStatuses = new Set(['active', 'trialing', 'past_due'])
  const stillCurrent = !record.currentPeriodEnd || record.currentPeriodEnd * 1000 > Date.now()

  return record.plan === 'pro' && activeStatuses.has(record.status) && stillCurrent ? 'pro' : 'free'
}

export async function upsertUserSubscription(record: SubscriptionRecord): Promise<void> {
  await safeKvSet(getBillingKey('plan', record.userId), record)

  if (record.stripeCustomerId) {
    await safeKvSet(getBillingKey('customer', record.userId), record.stripeCustomerId)
    await rememberBillingCustomerOwner(record.stripeCustomerId, record.userId)
  }

  if (record.stripeSubscriptionId) {
    await rememberBillingSubscriptionOwner(record.stripeSubscriptionId, record.userId)
  }
}

export async function clearUserSubscription(userId: string): Promise<void> {
  await safeKvDel(getBillingKey('plan', userId))
}

export async function setUserBillingCustomerId(userId: string, customerId: string): Promise<void> {
  await safeKvSet(getBillingKey('customer', userId), customerId)
  await rememberBillingCustomerOwner(customerId, userId)
}

export async function getUserBillingCustomerId(userId: string): Promise<string | null> {
  return safeKvGet<string>(getBillingKey('customer', userId))
}
