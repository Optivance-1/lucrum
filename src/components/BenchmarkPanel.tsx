'use client'

import { TrendingUp, Users, BarChart2 } from 'lucide-react'
import type { BenchmarkReport } from '@/types'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">{label}</p>
      <p className="font-display text-lg font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-aug mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-slate-aug mb-1">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BenchmarkPanel({
  benchmarks,
  accountAgeDays,
  currentMRR,
}: {
  benchmarks: BenchmarkReport
  accountAgeDays: number
  currentMRR: number
}) {
  const daysRemaining = Math.max(0, 60 - accountAgeDays)

  const mrrPercentile =
    currentMRR >= benchmarks.p75MRR
      ? 'Top 25%'
      : currentMRR >= benchmarks.medianMRR
        ? 'Above median'
        : currentMRR >= benchmarks.p25MRR
          ? 'Below median'
          : 'Bottom 25%'

  return (
    <div className="glass gold-border rounded-2xl p-6 gold-glow">
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-5 h-5 text-gold" />
        <h3 className="font-display text-base font-bold text-white">Peer Benchmarks</h3>
        <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
          Day {accountAgeDays} of 60
        </span>
      </div>

      <ProgressBar value={accountAgeDays} max={60} label="New founder window" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <Stat label="Your MRR" value={`$${currentMRR.toLocaleString()}`} sub={mrrPercentile} />
        <Stat label="Median MRR" value={`$${benchmarks.medianMRR.toLocaleString()}`} sub={`${benchmarks.compCount} peers`} />
        <Stat label="Top Performer" value={`$${benchmarks.topPerformerMRR.toLocaleString()}`} />
        <Stat label="Median Growth" value={benchmarks.medianGrowthRate != null ? `${benchmarks.medianGrowthRate}%` : 'N/A'} sub="MoM" />
      </div>

      {benchmarks.similarBusinesses.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Similar businesses</p>
          <div className="space-y-2">
            {benchmarks.similarBusinesses.map((biz) => (
              <div key={biz.id} className="flex items-center justify-between py-2 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold/60" />
                  <span className="text-sm text-white">{biz.notes || biz.id}</span>
                  <span className="text-xs font-mono text-slate-aug">{biz.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gold">${biz.mrr.toLocaleString()} MRR</span>
                  {biz.growthRateMoM != null && (
                    <span className={`text-xs font-mono ${biz.growthRateMoM >= 0 ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                      {biz.growthRateMoM > 0 ? '+' : ''}{biz.growthRateMoM}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {daysRemaining > 0 && (
        <p className="mt-4 text-xs text-slate-aug text-center">
          {daysRemaining} days left in your new-founder benchmark window. Benchmarks disappear after day 60.
        </p>
      )}
    </div>
  )
}
