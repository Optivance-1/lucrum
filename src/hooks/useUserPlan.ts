'use client'

import { useCallback, useEffect, useState } from 'react'
import type { UserPlan } from '@/lib/subscription'

type BillingState = {
  plan: UserPlan
  currentPeriodEnd: number | null
  status: string | null
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
      setData({ plan: 'free', currentPeriodEnd: null, status: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    plan: data?.plan ?? 'free',
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    status: data?.status ?? null,
    loading,
    refresh,
  }
}
