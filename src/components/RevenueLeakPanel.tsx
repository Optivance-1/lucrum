'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, DollarSign, Zap, RefreshCw, Settings } from 'lucide-react'
import type { RevenueLeak, LeakCategory, Plan } from '@/types'

const CATEGORY_CONFIG: Record<LeakCategory, {
  icon: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  failed_payments: { icon: '💳', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  expiring_cards: { icon: '⏰', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  dunning_risk: { icon: '🚨', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  paused_subscriptions: { icon: '⏸️', color: 'text-gold', bgColor: 'bg-gold/10', borderColor: 'border-gold/30' },
  cancelled_recoverable: { icon: '🔄', color: 'text-gold', bgColor: 'bg-gold/10', borderColor: 'border-gold/30' },
  underpriced_segment: { icon: '💰', color: 'text-emerald-aug', bgColor: 'bg-emerald-aug/10', borderColor: 'border-emerald-aug/30' },
  expansion_ready: { icon: '📈', color: 'text-emerald-aug', bgColor: 'bg-emerald-aug/10', borderColor: 'border-emerald-aug/30' },
  annual_upsell: { icon: '📅', color: 'text-emerald-aug', bgColor: 'bg-emerald-aug/10', borderColor: 'border-emerald-aug/30' },
}

interface RevenueLeakPanelProps {
  plan: Plan
  onFeatureLock?: (feature: string, requiredPlan: 'solo' | 'growth' | 'enterprise') => void
}

export default function RevenueLeakPanel({ plan, onFeatureLock }: RevenueLeakPanelProps) {
  const [leaks, setLeaks] = useState<RevenueLeak[]>([])
  const [totalRecoverable, setTotalRecoverable] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [autoFixEnabled, setAutoFixEnabled] = useState(false)
  const [canEnableAutoFix, setCanEnableAutoFix] = useState(false)

  const fetchLeaks = useCallback(async () => {
    if (plan === 'demo') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/revenue/leaks')
      const data = await res.json()

      if (data.paywallRequired) {
        setError('Upgrade to unlock Revenue Leak Detection')
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch leaks')
      }

      setLeaks(data.leaks)
      setTotalRecoverable(data.totalRecoverable)
      setAutoFixEnabled(data.autoFixEnabled)
      setCanEnableAutoFix(data.canEnableAutoFix)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [plan])

  useEffect(() => {
    fetchLeaks()
  }, [fetchLeaks])

  const handleFix = async (leak: RevenueLeak) => {
    if (plan === 'demo') {
      onFeatureLock?.('Revenue Leak Fixes', 'solo')
      return
    }

    setFixingId(leak.id)

    try {
      const res = await fetch('/api/revenue/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: leak.id, confirmed: true }),
      })

      const data = await res.json()

      if (data.success) {
        setLeaks(prev => prev.filter(l => l.id !== leak.id))
        setTotalRecoverable(prev => prev - leak.estimatedMRRImpact)
      }
    } catch (err) {
      console.error('[RevenueLeakPanel] fix failed:', err)
    } finally {
      setFixingId(null)
    }
  }

  const toggleAutoFix = async () => {
    if (!canEnableAutoFix) {
      onFeatureLock?.('Auto-Fix', 'enterprise')
      return
    }

    try {
      const res = await fetch('/api/revenue/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAutoFix: !autoFixEnabled }),
      })

      const data = await res.json()
      if (data.success) {
        setAutoFixEnabled(data.autoFixEnabled)
      }
    } catch (err) {
      console.error('[RevenueLeakPanel] toggle auto-fix failed:', err)
    }
  }

  if (plan === 'demo') {
    return (
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Revenue Recovery</h3>
              <p className="text-xs text-slate-aug font-mono">Connect Stripe to detect leaks</p>
            </div>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-aug text-sm">Connect your Stripe account to unlock automatic revenue leak detection.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Revenue Recovery</h3>
            <p className="text-xs text-slate-aug font-mono flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin" /> Scanning your Stripe data...
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Revenue Recovery</h3>
            <p className="text-xs text-red-400 font-mono">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (leaks.length === 0) {
    return (
      <div className="glass border-2 border-emerald-aug/40 rounded-2xl p-6 mb-6 bg-emerald-aug/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-aug/20 border border-emerald-aug/30 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-aug" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">No Revenue Leaks Detected</h3>
            <p className="text-xs text-emerald-aug font-mono">Lucrum scans every 2 hours. All clear.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass gold-border rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Revenue Recovery</h3>
            <p className="text-xs text-slate-aug font-mono">Detected from your Stripe data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono text-slate-aug uppercase tracking-widest">Recoverable</div>
            <div className="font-display text-xl font-bold text-gold">${totalRecoverable.toLocaleString()}</div>
          </div>
          {canEnableAutoFix && (
            <button
              onClick={toggleAutoFix}
              className={`p-2 rounded-lg transition-all ${
                autoFixEnabled
                  ? 'bg-emerald-aug/20 border border-emerald-aug/30 text-emerald-aug'
                  : 'bg-white/5 border border-white/10 text-slate-aug hover:text-white'
              }`}
              title={autoFixEnabled ? 'Auto-fix enabled' : 'Enable auto-fix'}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {autoFixEnabled && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-aug/10 border border-emerald-aug/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-aug" />
            <span className="text-sm text-emerald-aug font-semibold">Auto-fix enabled</span>
          </div>
          <p className="text-xs text-slate-aug mt-1">High-priority leaks (failed payments) are automatically recovered.</p>
        </div>
      )}

      <div className="space-y-3">
        {leaks.map(leak => {
          const config = CATEGORY_CONFIG[leak.category] ?? CATEGORY_CONFIG.failed_payments
          const isFixing = fixingId === leak.id

          return (
            <div
              key={leak.id}
              className={`rounded-xl p-4 border ${config.borderColor} ${config.bgColor} transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{config.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">{leak.title}</h4>
                      <span className={`text-xs font-mono font-bold ${config.color}`}>
                        ${leak.estimatedMRRImpact.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-aug leading-relaxed">{leak.description}</p>
                    <p className="text-xs text-slate-aug/60 mt-1 font-mono">
                      {leak.affectedCount} customer{leak.affectedCount !== 1 ? 's' : ''} affected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleFix(leak)}
                  disabled={isFixing}
                  className="px-4 py-2 rounded-lg bg-gold text-obsidian font-bold text-xs hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center gap-2"
                >
                  {isFixing ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    'Fix Now'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-[rgba(201,168,76,0.1)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-aug font-mono">
            {leaks.length} leak{leaks.length !== 1 ? 's' : ''} • ${(totalRecoverable * 12).toLocaleString()} ARR at risk
          </span>
          <button
            onClick={fetchLeaks}
            className="text-xs text-slate-aug hover:text-gold transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
