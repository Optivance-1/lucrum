import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, showPlus = true): string {
  const prefix = showPlus && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

/**
 * Calculate days of runway.
 * balance = current cash available
 * monthlyNetBurn = expenses - revenue (positive = burning cash)
 */
export function calculateRunway(balance: number, monthlyNetBurn: number): number {
  if (monthlyNetBurn <= 0) return 9999 // profitable or breakeven = infinite runway
  return Math.floor((balance / monthlyNetBurn) * 30)
}

/**
 * MoM MRR growth as a percentage
 */
export function calculateMRRGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Churn rate = cancelled subs in period / active subs at start of period
 */
export function calculateChurnRate(cancelled: number, activeAtStart: number): number {
  if (activeAtStart === 0) return 0
  return (cancelled / activeAtStart) * 100
}

/**
 * Rough self-employment / income tax estimate (US)
 * Uses tiered brackets as a guide, not legal advice
 */
export function estimateTax(annualRevenue: number): { federal: number; selfEmployment: number; total: number } {
  const selfEmployment = annualRevenue * 0.153 * 0.9235 // SE tax on 92.35% of net
  let federal = 0
  if (annualRevenue <= 11600) federal = annualRevenue * 0.10
  else if (annualRevenue <= 47150) federal = 1160 + (annualRevenue - 11600) * 0.12
  else if (annualRevenue <= 100525) federal = 5426 + (annualRevenue - 47150) * 0.22
  else federal = 17168 + (annualRevenue - 100525) * 0.24
  return {
    federal: Math.round(federal),
    selfEmployment: Math.round(selfEmployment),
    total: Math.round(federal + selfEmployment),
  }
}

/**
 * Return last N days as YYYY-MM-DD strings, most recent last
 */
export function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

/**
 * Format a UNIX timestamp as a relative time string
 */
export function timeAgo(unixTs: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixTs
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/**
 * Compact number formatter: 1200 → "1.2K", 1500000 → "1.5M"
 */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
