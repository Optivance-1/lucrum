'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { OutcomeSummary } from '@/types'

function useCountUp(target: number, duration = 1500): number {
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

export default function PlatformROIBanner() {
  const [totals, setTotals] = useState<OutcomeSummary | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/outcomes/platform')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setTotals(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const hasData = totals && totals.totalImpact > 0
  const recovered = useCountUp(totals?.paymentRecovered ?? 0)
  const actions = useCountUp(totals?.actionsExecuted ?? 0)

  return (
    <section className="py-16 px-6 border-y border-[rgba(201,168,76,0.1)] bg-obsidian">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-gold mb-6">
          Lucrum users this month
        </p>

        {!loaded ? (
          <div className="flex justify-center gap-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="h-10 w-28 mx-auto rounded-lg bg-white/5 animate-pulse mb-2" />
                <div className="h-3 w-20 mx-auto rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : hasData ? (
          <div className="flex justify-center gap-12 flex-wrap">
            <div className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold text-gradient-gold">
                ${recovered.toLocaleString()}
              </div>
              <div className="text-xs text-slate-aug font-mono uppercase tracking-widest mt-2">
                Payments Recovered
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold text-gradient-gold">
                34 days avg
              </div>
              <div className="text-xs text-slate-aug font-mono uppercase tracking-widest mt-2">
                Runway Extended
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold text-gradient-gold">
                {actions.toLocaleString()}
              </div>
              <div className="text-xs text-slate-aug font-mono uppercase tracking-widest mt-2">
                Actions Executed
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-aug text-lg mb-4">Be the first to add to these numbers</p>
            <Link
              href="/connect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all"
            >
              Connect Stripe &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
