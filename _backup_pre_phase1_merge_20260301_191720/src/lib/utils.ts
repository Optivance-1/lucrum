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

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function calculateRunway(balance: number, monthlyBurn: number): number {
  if (monthlyBurn <= 0) return Infinity
  return Math.floor((balance / monthlyBurn) * 30)
}

export function calculateMRRGrowth(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function estimateTax(revenue: number, rate = 0.25): number {
  return revenue * rate
}
