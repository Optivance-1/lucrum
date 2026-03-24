import { safeKvGet, safeKvSet } from '@/lib/kv'

type AtRiskPayload = {
  customerId: string
  invoiceId?: string | null
  amountDue?: number
  customerName?: string | null
  updatedAt: string
}

export async function rememberUserEmail(userId: string, email?: string | null): Promise<void> {
  if (!userId || !email) return
  await safeKvSet(`lucrum:user-email:${userId}`, email)
}

export async function getUserEmail(userId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:user-email:${userId}`)
}

export async function rememberStripeAccountOwner(accountId: string, userId: string): Promise<void> {
  if (!accountId || !userId) return
  await safeKvSet(`lucrum:stripe-account-owner:${accountId}`, userId, {
    ex: 60 * 60 * 24 * 365,
  })
}

export async function getStripeAccountOwner(accountId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-account-owner:${accountId}`)
}

export async function rememberStripeCustomerOwner(customerId: string, userId: string): Promise<void> {
  if (!customerId || !userId) return
  await safeKvSet(`lucrum:stripe-customer-owner:${customerId}`, userId)
}

export async function getStripeCustomerOwner(customerId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-customer-owner:${customerId}`)
}

export async function rememberStripeSubscriptionOwner(subscriptionId: string, userId: string): Promise<void> {
  if (!subscriptionId || !userId) return
  await safeKvSet(`lucrum:stripe-subscription-owner:${subscriptionId}`, userId)
}

export async function getStripeSubscriptionOwner(subscriptionId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-subscription-owner:${subscriptionId}`)
}

export async function rememberBillingCustomerOwner(customerId: string, userId: string): Promise<void> {
  if (!customerId || !userId) return
  await safeKvSet(`lucrum:billing-customer-owner:${customerId}`, userId)
}

export async function getBillingCustomerOwner(customerId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:billing-customer-owner:${customerId}`)
}

export async function rememberBillingSubscriptionOwner(subscriptionId: string, userId: string): Promise<void> {
  if (!subscriptionId || !userId) return
  await safeKvSet(`lucrum:billing-subscription-owner:${subscriptionId}`, userId)
}

export async function getBillingSubscriptionOwner(subscriptionId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:billing-subscription-owner:${subscriptionId}`)
}

export async function markCustomerAtRisk(payload: AtRiskPayload): Promise<void> {
  if (!payload.customerId) return
  await safeKvSet(`lucrum:atrisk:${payload.customerId}`, payload)
}

export async function markMetricsInvalidated(userId: string): Promise<void> {
  if (!userId) return
  await safeKvSet(`lucrum:metrics-invalidated:${userId}`, Date.now())
}

export async function getMetricsInvalidatedAt(userId: string): Promise<number | null> {
  return safeKvGet<number>(`lucrum:metrics-invalidated:${userId}`)
}

export async function resolveUserIdFromStripeEventObject(
  object: Record<string, any>,
  accountId?: string | null
): Promise<string | null> {
  if (accountId) {
    const byAccount = await getStripeAccountOwner(accountId)
    if (byAccount) return byAccount
  }

  const customerId =
    typeof object.customer === 'string'
      ? object.customer
      : typeof object.customer?.id === 'string'
      ? object.customer.id
      : null

  if (customerId) {
    const byCustomer = await getStripeCustomerOwner(customerId)
    if (byCustomer) return byCustomer
  }

  const subscriptionId =
    typeof object.subscription === 'string'
      ? object.subscription
      : object.object === 'subscription' && typeof object.id === 'string'
      ? object.id
      : null

  if (subscriptionId) {
    const bySubscription = await getStripeSubscriptionOwner(subscriptionId)
    if (bySubscription) return bySubscription
  }

  return null
}
