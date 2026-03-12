import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/lib/stripe'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import {
  rememberBillingCustomerOwner,
  rememberBillingSubscriptionOwner,
} from '@/lib/user-state'
import type { Plan, BillingInterval, Subscription } from '@/types'

export type { Plan, BillingInterval, Subscription }

// Legacy alias kept so existing imports like `UserPlan` don't break during migration
export type UserPlan = Plan

function getBillingKey(name: string, userId: string): string {
  return `lucrum:${name}:${userId}`
}

export function getLucrumStripe(): Stripe | null {
  const secretKey = process.env.LUCRUM_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}

// ─── Subscription CRUD ─────────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const record = await safeKvGet<Subscription>(getBillingKey('plan', userId))
  if (!record) return { plan: 'demo' }
  if (record.plan !== 'demo' && record.expiresAt && record.expiresAt < Date.now()) {
    return { plan: 'demo' }
  }
  return record
}

export async function setUserSubscription(userId: string, sub: Subscription): Promise<void> {
  await safeKvSet(getBillingKey('plan', userId), sub)
  if (sub.stripeCustomerId) {
    await safeKvSet(getBillingKey('customer', userId), sub.stripeCustomerId)
    await rememberBillingCustomerOwner(sub.stripeCustomerId, userId)
  }
  if (sub.stripeSubscriptionId) {
    await rememberBillingSubscriptionOwner(sub.stripeSubscriptionId, userId)
  }
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await getUserSubscription(userId)
  return sub.plan
}

// ─── Legacy helpers (kept for webhook compat) ──────────────────────────────

export async function getUserSubscriptionRecord(userId: string): Promise<Subscription | null> {
  return safeKvGet<Subscription>(getBillingKey('plan', userId))
}

export async function upsertUserSubscription(record: {
  userId: string; plan: string; status: string;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null;
  priceId: string | null; currentPeriodEnd: number | null; updatedAt: string;
}): Promise<void> {
  const plan = resolvePlanFromPriceId(record.priceId) ?? (record.plan === 'pro' ? 'solo' : 'demo')
  const interval = resolveIntervalFromPriceId(record.priceId)
  await setUserSubscription(record.userId, {
    plan,
    interval,
    activatedAt: Date.now(),
    stripeCustomerId: record.stripeCustomerId ?? undefined,
    stripeSubscriptionId: record.stripeSubscriptionId ?? undefined,
  })
}

export async function clearUserSubscription(userId: string): Promise<void> {
  await setUserSubscription(userId, { plan: 'demo' })
}

export async function setUserBillingCustomerId(userId: string, customerId: string): Promise<void> {
  await safeKvSet(getBillingKey('customer', userId), customerId)
  await rememberBillingCustomerOwner(customerId, userId)
}

export async function getUserBillingCustomerId(userId: string): Promise<string | null> {
  return safeKvGet<string>(getBillingKey('customer', userId))
}

// ─── Feature gates ─────────────────────────────────────────────────────────

export function canUseCFOChat(plan: Plan): boolean {
  return plan === 'solo' || plan === 'growth' || plan === 'enterprise'
}

export function canUseFiveMoves(plan: Plan): boolean {
  return plan === 'solo' || plan === 'growth' || plan === 'enterprise'
}

export function canUseActionExecution(plan: Plan): boolean {
  return plan === 'growth' || plan === 'enterprise'
}

export function canUseMultiAccount(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function canUseAPI(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function usesPriorityAI(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function canUseWebhookAlerts(plan: Plan): boolean {
  return plan === 'solo' || plan === 'growth' || plan === 'enterprise'
}

export function getTeamSeats(plan: Plan): number {
  if (plan === 'enterprise') return 5
  if (plan === 'growth') return 2
  if (plan === 'solo') return 1
  return 0
}

// ─── Demo question tracking ────────────────────────────────────────────────

export async function getDemoQuestionsUsed(userId: string): Promise<number> {
  return (await safeKvGet<number>(`demo:${userId}:questions`)) ?? 0
}

export async function incrementDemoQuestions(userId: string): Promise<number> {
  const current = await getDemoQuestionsUsed(userId)
  const next = current + 1
  await safeKvSet(`demo:${userId}:questions`, next)
  return next
}

export function getDemoQuestionsUsedAnon(cookieValue: string | undefined): number {
  if (!cookieValue) return 0
  const n = parseInt(cookieValue, 10)
  return Number.isNaN(n) ? 0 : n
}

// ─── Price ID resolution ───────────────────────────────────────────────────

const SOLO_PRICE_IDS = new Set([
  process.env.LUCRUM_SOLO_MONTHLY_PRICE_ID,
  process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_PRO_PRICE_ID,
  process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
].filter(Boolean))

const GROWTH_PRICE_IDS = new Set([
  process.env.LUCRUM_GROWTH_MONTHLY_PRICE_ID,
  process.env.LUCRUM_GROWTH_ANNUAL_PRICE_ID,
].filter(Boolean))

const ENTERPRISE_PRICE_IDS = new Set([
  process.env.LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID,
  process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
].filter(Boolean))

const ANNUAL_PRICE_IDS = new Set([
  process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_GROWTH_ANNUAL_PRICE_ID,
  process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
].filter(Boolean))

export function resolvePlanFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null
  if (ENTERPRISE_PRICE_IDS.has(priceId)) return 'enterprise'
  if (GROWTH_PRICE_IDS.has(priceId)) return 'growth'
  if (SOLO_PRICE_IDS.has(priceId)) return 'solo'
  return null
}

export function resolveIntervalFromPriceId(priceId: string | null | undefined): BillingInterval | undefined {
  if (!priceId) return undefined
  return ANNUAL_PRICE_IDS.has(priceId) ? 'year' : 'month'
}

export function getValidPriceIds(): string[] {
  return [
    process.env.LUCRUM_SOLO_MONTHLY_PRICE_ID,
    process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
    process.env.LUCRUM_GROWTH_MONTHLY_PRICE_ID,
    process.env.LUCRUM_GROWTH_ANNUAL_PRICE_ID,
    process.env.LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID,
    process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
    process.env.LUCRUM_PRO_PRICE_ID,
    process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
  ].filter(Boolean) as string[]
}
