'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Plan } from '@/types'

type BillingState = {
  plan: Plan
  interval?: 'month' | 'year'
  currentPeriodEnd: number | null
  status: string | null
  features?: Record<string, boolean>
}

export function useUserPlan() {
  const [data, setData] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/plan')
      if (!res.ok) throw new Error('Failed to load plan')
      const next = await res.json()
      setData(next)
    } catch {
      setData({ plan: 'demo', currentPeriodEnd: null, status: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    plan: (data?.plan ?? 'demo') as Plan,
    interval: data?.interval,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    status: data?.status ?? null,
    features: data?.features ?? {},
    loading,
    refresh,
  }
}
