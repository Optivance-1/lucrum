'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { StripeMetrics, AIInsight, CFOContext } from '@/types'

interface UseStripeDataReturn {
  metrics: StripeMetrics | null
  insights: AIInsight[]
  loading: boolean
  insightsLoading: boolean
  error: string | null
  lastRefreshed: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL_MS = 60_000 // auto-refresh every 60s

export function useStripeData(): UseStripeDataReturn {
  const [metrics, setMetrics]           = useState<StripeMetrics | null>(null)
  const [insights, setInsights]         = useState<AIInsight[]>([])
  const [loading, setLoading]           = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cacheKeyRef = useRef<string>('lucrum:lastInsights:v1')

  const fetchInsights = useCallback(async (ctx: CFOContext) => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
      if (res.ok) {
        const data = await res.json()
        const next = data.insights ?? []
        setInsights(next)
        try {
          localStorage.setItem(cacheKeyRef.current, JSON.stringify({ savedAt: Date.now(), insights: next }))
        } catch {
          // ignore
        }
      } else {
        // If AI fails, try cached insights
        try {
          const raw = localStorage.getItem(cacheKeyRef.current)
          const parsed = raw ? JSON.parse(raw) : null
          if (parsed?.insights?.length) setInsights(parsed.insights)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err)
      // If offline or API fails, try cached insights
      try {
        const raw = localStorage.getItem(cacheKeyRef.current)
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed?.insights?.length) setInsights(parsed.insights)
      } catch {
        // ignore
      }
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/data')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data: StripeMetrics = await res.json()
      setMetrics(data)
      setError(null)
      setLastRefreshed(new Date())

      // After we have metrics, fetch AI insights with the real context
      const ctx: CFOContext = {
        mrr: data.mrr,
        mrrGrowth: data.mrrGrowth,
        revenue30d: data.revenue30d,
        revenueGrowth: data.revenueGrowth,
        activeSubscriptions: data.activeSubscriptions,
        newSubscriptions30d: data.newSubscriptions30d,
        churnRate: data.churnRate,
        newCustomers30d: data.newCustomers30d,
        availableBalance: data.availableBalance,
        runway: data.runway,
        cancelledSubscriptions30d: data.cancelledSubscriptions30d,
      }
      fetchInsights(ctx)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Stripe data')
    } finally {
      setLoading(false)
    }
  }, [fetchInsights])

  // Initial load
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(fetchMetrics, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMetrics])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchMetrics()
  }, [fetchMetrics])

  return { metrics, insights, loading, insightsLoading, error, lastRefreshed, refresh }
}
