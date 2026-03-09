'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency, estimateTax } from '@/lib/utils'
import type { SimulateResponse } from '@/types'
import {
  TrendingUp,
  DollarSign,
  Zap,
  Calendar,
  Download,
  FileDown,
  FlaskConical,
  Brain,
  Gauge,
} from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

type SimulationHistoryItem = {
  scenario: string
  runwayP50: number
  confidence: number
  advice: string
  at: string
}

const HISTORY_STORAGE_KEY = 'lucrum:simHistory:v1'
const SCENARIO_PRESETS = [
  'cut ads 30%',
  'add $2k designer',
  'churn +10%',
  'raise prices 12%',
  'pause hiring',
]

export default function ForecastsPage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const [scenario, setScenario] = useState('cut ads 30%')
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [history, setHistory] = useState<SimulationHistoryItem[]>([])
  const bootstrapRanRef = useRef(false)

  const persistHistory = useCallback((next: SimulationHistoryItem[]) => {
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, 6))
    } catch {
      // ignore
    }
  }, [])

  const runSimulation = useCallback(async (nextScenario?: string) => {
    const scenarioText = (nextScenario ?? scenario).trim() || 'baseline'
    setSimLoading(true)
    setSimError(null)
    try {
      const initialUrl = isDemoData ? '/api/simulate?demo=1' : '/api/simulate'
      let res = await fetch(initialUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioText }),
      })

      // If not connected to Stripe, auto-fallback to demo-mode simulation.
      if (!res.ok && res.status === 401 && !isDemoData) {
        res = await fetch('/api/simulate?demo=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: scenarioText }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const next = data as SimulateResponse
      setSimResult(next)

      const item: SimulationHistoryItem = {
        scenario: next.scenario,
        runwayP50: next.runway_p50,
        confidence: next.confidence,
        advice: next.advice,
        at: next.generated_at,
      }
      const deduped = [item, ...history.filter(h => h.scenario !== item.scenario)].slice(0, 6)
      persistHistory(deduped)
    } catch (err: any) {
      setSimError(err?.message ?? 'Simulation failed')
    } finally {
      setSimLoading(false)
    }
  }, [history, isDemoData, persistHistory, scenario])

  useEffect(() => {
    if (bootstrapRanRef.current) return
    if (loading) return
    bootstrapRanRef.current = true
    runSimulation('baseline').catch(() => {})
  }, [loading, runSimulation])

  const riskDrivers = useMemo(() => {
    if (!simResult) return []
    const volatilityRatio = simResult.baseline.monthly_revenue_mean > 0
      ? (simResult.baseline.monthly_revenue_std_dev / simResult.baseline.monthly_revenue_mean) * 100
      : 0
    const outflowRatio = simResult.baseline.monthly_revenue_mean > 0
      ? (simResult.baseline.monthly_operating_outflow / simResult.baseline.monthly_revenue_mean) * 100
      : 0
    return [
      `Revenue volatility: ${volatilityRatio.toFixed(1)}%`,
      `Monthly churn pressure: ${simResult.baseline.monthly_churn_rate_pct.toFixed(1)}%`,
      `Outflow load: ${outflowRatio.toFixed(1)}% of revenue`,
    ]
  }, [simResult])

  return (
    <DashboardShell
      title="Cash Flow Command Center"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : '30/60/90-day forecast, payout buffer, MRR movement, and Monte Carlo scenarios'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">Monte Carlo Scenario Lab</h3>
          {simResult && (
            <span className="ml-auto text-[11px] font-mono uppercase tracking-widest text-slate-aug">
              Source: {simResult.advice_source}
            </span>
          )}
        </div>

        <p className="text-slate-aug text-sm mb-4">
          Run probabilistic cash/runway forecasts with scenario assumptions. This is the decision engine, not a point estimate.
        </p>

        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input
            type="text"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder='e.g. "cut ads 30%" or "add $2k designer"'
            className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
            onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
          />
          <button
            onClick={() => runSimulation()}
            disabled={simLoading}
            className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {simLoading ? (
              <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Run Simulation
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setScenario(preset); runSimulation(preset) }}
              className="text-xs px-3 py-1.5 rounded-lg glass gold-border text-slate-aug hover:text-white transition-all hover:border-gold/40"
            >
              {preset}
            </button>
          ))}
        </div>

        {simError && (
          <div className="mb-4 p-3 rounded-xl bg-crimson-aug/10 border border-crimson-aug/20 text-sm text-crimson-aug">
            {simError}
          </div>
        )}

        {simResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P10</p>
                <p className="font-display text-2xl font-bold text-crimson-aug">{simResult.runway_p10}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P50</p>
                <p className="font-display text-2xl font-bold text-white">{simResult.runway_p50}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P90</p>
                <p className="font-display text-2xl font-bold text-emerald-aug">{simResult.runway_p90}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Confidence</p>
                <p className="font-display text-2xl font-bold text-gold">{simResult.confidence}%</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-gold" />
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug">Confidence Transparency</p>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-crimson-aug via-gold to-emerald-aug transition-all"
                  style={{ width: `${Math.max(2, simResult.confidence)}%` }}
                />
              </div>
              <p className="text-xs text-slate-aug">
                Scenario summary: {simResult.scenario_summary}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 6 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_6_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_6_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_6_months.p90)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 12 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_12_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_12_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_12_months.p90)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 18 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_18_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_18_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_18_months.p90)}</p>
              </div>
            </div>

            <div className="rounded-xl bg-gold/5 border border-gold/20 p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Recommended Action</p>
              <p className="text-sm text-white mb-2">{simResult.advice}</p>
              <p className="text-xs text-slate-aug">Advice confidence: {simResult.advice_confidence}%</p>
            </div>

            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Risk Drivers</p>
              <div className="flex flex-wrap gap-2">
                {riskDrivers.map((driver) => (
                  <span key={driver} className="text-xs px-3 py-1.5 rounded-lg bg-obsidian-100 border border-[rgba(201,168,76,0.15)] text-slate-aug">
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-aug text-sm">Run a scenario to generate Monte Carlo output.</p>
        )}

        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(201,168,76,0.1)]">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Recent Scenario Runs</p>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={`${item.scenario}-${item.at}`}
                  onClick={() => { setScenario(item.scenario); runSimulation(item.scenario) }}
                  className="w-full text-left rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-3 hover:border-gold/35 transition-all"
                >
                  <p className="text-sm text-white">{item.scenario}</p>
                  <p className="text-xs text-slate-aug mt-1">
                    P50 runway {item.runwayP50}m · confidence {item.confidence}%
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payout buffer & runway */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Available Cash</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.availableBalance) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">+ {formatCurrency(metrics?.pendingBalance ?? 0)} pending</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Cash Runway</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? (metrics.runway >= 9999 ? '∞ Profitable' : `${metrics.runway} days`) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">At current burn rate</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">MRR</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.mrr) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.mrrGrowth != null ? `${metrics.mrrGrowth >= 0 ? '+' : ''}${metrics.mrrGrowth}% MoM` : '—'}
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Est. Monthly Burn</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.estimatedMonthlyBurn) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">From payouts + refunds</p>
        </div>
      </div>

      {/* 30/60/90-day cash flow forecast */}
      {metrics?.cashFlowForecast && metrics.cashFlowForecast.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Cash Flow Forecast</h3>
          <p className="text-slate-aug text-sm mb-4">
            Projected cash position based on subscription renewals and historical payout patterns.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {metrics.cashFlowForecast.map((period) => (
              <div key={period.period} className="rounded-xl bg-white/5 p-5 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-2">{period.period}</p>
                <p className="font-display text-2xl font-bold text-white mb-1">
                  {formatCurrency(period.projectedCash)}
                </p>
                <p className="text-xs text-slate-aug">
                  Revenue: {formatCurrency(period.projectedRevenue)} · Payouts: {formatCurrency(period.projectedPayouts)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Prep & Export */}
      {metrics && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Reports & Tax Prep Export</h3>
          <p className="text-slate-aug text-sm mb-4">
            Quarterly estimated tax calculator and one-click export for Schedule C / S-Corp.
          </p>
          {(() => {
            const annualRevenue = metrics.mrr * 12
            const tax = estimateTax(annualRevenue)
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Annual Revenue (est)</p>
                    <p className="font-bold text-white">{formatCurrency(annualRevenue)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Federal (est)</p>
                    <p className="font-bold text-white">{formatCurrency(tax.federal)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Self-Employment (est)</p>
                    <p className="font-bold text-white">{formatCurrency(tax.selfEmployment)}</p>
                  </div>
                  <div className="rounded-xl bg-gold/10 p-4 border border-gold/20">
                    <p className="text-xs font-mono text-slate-aug mb-1">Quarterly Payment</p>
                    <p className="font-bold text-gold">{formatCurrency(Math.round(tax.total / 4))}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/tax/export?mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&format=csv`}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </a>
                  <a
                    href={`/api/reports/cfo.pdf?currency=${encodeURIComponent(metrics.currency)}&mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&churnRate=${metrics.churnRate}&activeSubscriptions=${metrics.activeSubscriptions}&failedPaymentsValue=${metrics.failedPaymentsValue}&availableBalance=${metrics.availableBalance}&pendingBalance=${metrics.pendingBalance}&runway=${metrics.runway}`}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[rgba(201,168,76,0.15)] text-white hover:border-gold/40 transition-all text-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </a>
                  <span className="text-xs text-slate-aug self-center">Estimate only. Consult a CPA.</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Quick exports */}
      {metrics && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-3">Quick Exports</h3>
          <p className="text-slate-aug text-sm mb-4">
            One place to export the key reports you&apos;ll send to yourself, a CPA, or an investor.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href={`/api/revenue/export?grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&effectiveFeeRate=${metrics.effectiveFeeRate}&payoutSchedule=${encodeURIComponent(metrics.payoutSchedule)}`}
              download
            >
              <Download className="w-4 h-4" />
              Revenue CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href="/api/customers/export"
              download
            >
              <Download className="w-4 h-4" />
              Customers CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href={`/api/tax/export?mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&format=csv`}
              download
            >
              <Download className="w-4 h-4" />
              Tax CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[rgba(201,168,76,0.15)] text-white hover:border-gold/40 transition-all text-sm"
              href={`/api/reports/cfo.pdf?currency=${encodeURIComponent(metrics.currency)}&mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&churnRate=${metrics.churnRate}&activeSubscriptions=${metrics.activeSubscriptions}&failedPaymentsValue=${metrics.failedPaymentsValue}&availableBalance=${metrics.availableBalance}&pendingBalance=${metrics.pendingBalance}&runway=${metrics.runway}`}
              download
            >
              <FileDown className="w-4 h-4" />
              CFO Snapshot PDF
            </a>
          </div>
        </div>
      )}

      {/* MRR waterfall (simplified) */}
      <div className="glass gold-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-white mb-4">MRR Movement (30d)</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gold/10">
            <span className="text-slate-aug">New subscriptions</span>
            <span className="font-mono text-emerald-aug">+{metrics?.newSubscriptions30d ?? 0}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gold/10">
            <span className="text-slate-aug">Cancelled</span>
            <span className="font-mono text-crimson-aug">-{metrics?.cancelledSubscriptions30d ?? 0}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-white font-semibold">Net active</span>
            <span className="font-mono font-bold text-white">
              {metrics ? metrics.activeSubscriptions : '—'}
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
