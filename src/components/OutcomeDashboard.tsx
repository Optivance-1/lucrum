'use client'

import { useState, useEffect, useRef } from 'react'
import type { AggregateOutcomes } from '@/types'

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

function StatBlock({ value, label, tooltip, prefix = '', suffix = '' }: {
  value: number; label: string; tooltip: string; prefix?: string; suffix?: string
}) {
  const display = useCountUp(value)
  const [showTip, setShowTip] = useState(false)

  return (
    <div
      className="relative flex-1 min-w-0 text-center"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className="font-display text-2xl md:text-3xl font-bold text-gold">
        {prefix}{display.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-slate-aug font-mono uppercase tracking-widest mt-1">{label}</div>
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg glass gold-border text-xs text-slate-aug whitespace-nowrap z-10">
          {tooltip}
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return <div className="flex-1 min-w-0 text-center"><div className="h-8 w-20 mx-auto rounded-lg bg-white/5 animate-pulse mb-1" /><div className="h-3 w-16 mx-auto rounded bg-white/5 animate-pulse" /></div>
}

export default function OutcomeDashboard({ outcomes, loading }: {
  outcomes: AggregateOutcomes | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 mb-6 border border-gold/30">
        <div className="text-xs font-mono uppercase tracking-widest text-gold mb-4">Your Lucrum ROI — This Month</div>
        <div className="flex gap-4">
          <Skeleton /><Skeleton /><Skeleton /><Skeleton />
        </div>
      </div>
    )
  }

  if (!outcomes || outcomes.userActionsExecuted === 0) {
    return (
      <div className="glass rounded-2xl p-6 mb-6 border border-gold/30">
        <div className="text-xs font-mono uppercase tracking-widest text-gold mb-3">Your Lucrum ROI</div>
        <p className="text-sm text-slate-aug leading-relaxed">
          Your ROI dashboard activates when you execute your first action. Try MAX&apos;s top recommendation.
        </p>
        <div className="mt-2 text-gold text-xs font-mono">↓ See Five Moves below</div>
      </div>
    )
  }

  const month = outcomes.thisMonth

  return (
    <div className="glass rounded-2xl p-6 mb-6 border border-gold/30">
      <div className="text-xs font-mono uppercase tracking-widest text-gold mb-4">Your Lucrum ROI — This Month</div>
      <div className="flex gap-4 flex-wrap">
        <StatBlock
          value={month.paymentRecovered}
          label="Payments Recovered"
          tooltip="Sum of failed invoices successfully retried through Lucrum"
          prefix="$"
        />
        <StatBlock
          value={outcomes.userRunwayExtended}
          label="Runway Extended"
          tooltip="Days of additional runway from burn reduction and cash recovery actions"
          suffix=" days"
        />
        <StatBlock
          value={month.churnPrevented + month.revenueExpanded}
          label="Revenue Influenced"
          tooltip="MRR retained from churn prevention actions (estimated)"
          prefix="$"
        />
        <StatBlock
          value={month.actionsExecuted}
          label="Actions Taken"
          tooltip="Total Stripe actions executed directly from Lucrum"
        />
      </div>
      {outcomes.userValueGenerated > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(201,168,76,0.1)] text-center">
          <span className="text-xs font-mono text-emerald-aug">
            All time: ${outcomes.userValueGenerated.toLocaleString()} total value generated
          </span>
        </div>
      )}
    </div>
  )
}
