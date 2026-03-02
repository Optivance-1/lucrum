'use client'

import React, { createContext, useContext } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import type { StripeMetrics, AIInsight } from '@/types'

type StripeDataContextValue = {
  metrics: StripeMetrics | null
  insights: AIInsight[]
  loading: boolean
  insightsLoading: boolean
  error: string | null
  lastRefreshed: Date | null
  refresh: () => Promise<void>
}

const StripeDataContext = createContext<StripeDataContextValue | null>(null)

export function StripeDataProvider({ children }: { children: React.ReactNode }) {
  const value = useStripeData()
  return <StripeDataContext.Provider value={value}>{children}</StripeDataContext.Provider>
}

export function useStripeDataContext(): StripeDataContextValue {
  const ctx = useContext(StripeDataContext)
  if (!ctx) throw new Error('useStripeDataContext must be used within StripeDataProvider')
  return ctx
}

