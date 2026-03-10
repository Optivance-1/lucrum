'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Zap,
  Brain, AlertTriangle, CheckCircle, ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { useStripeData } from '@/hooks/useStripeData'
import { useUserPlan } from '@/hooks/useUserPlan'
import { formatCurrency, formatPercent, timeAgo } from '@/lib/utils'
import DashboardShell from '@/components/DashboardShell'
import InlineNotice from '@/components/InlineNotice'
import MRRHistory from '@/components/MRRHistory'
import type { InsightSeverity } from '@/types'

// ─── Design tokens ─────────────────────────────────────────────────────────

const INSIGHT_STYLES: Record<InsightSeverity, {
  border: string; bg: string; icon: React.ElementType; iconColor: string; dot: string
}> = {
  critical:    { border: 'border-red-500/40',      bg: 'bg-red-500/8',      icon: AlertTriangle, iconColor: 'text-red-400',    dot: 'bg-red-400' },
  warning:     { border: 'border-yellow-500/35',   bg: 'bg-yellow-500/6',   icon: AlertTriangle, iconColor: 'text-yellow-400', dot: 'bg-yellow-400' },
  opportunity: { border: 'border-gold/30',         bg: 'bg-gold/5',         icon: TrendingUp,    iconColor: 'text-gold',       dot: 'bg-gold' },
  win:         { border: 'border-emerald-aug/30',  bg: 'bg-emerald-aug/5',  icon: CheckCircle,   iconColor: 'text-emerald-aug',dot: 'bg-emerald-aug' },
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
  )
}

function KPICard({
  label, value, change, positive, icon: Icon, loading,
}: {
  label: string; value: string; change: string; positive: boolean
  icon: React.ElementType; loading: boolean
}) {
  return (
    <div className="glass gold-border rounded-2xl p-5 card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gold" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : (
        <>
          <div className="font-display text-2xl font-bold text-white mb-1">{value}</div>
          <div className={`flex items-center gap-1 text-xs font-mono ${positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        </>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass gold-border rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-aug font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ─── Main dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const { plan } = useUserPlan()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiProvider, setAiProvider] = useState<'groq' | 'gemini' | 'fallback' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [billingBusy, setBillingBusy] = useState(false)

  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) return
    setAiLoading(true)
    setAiResponse('')
    try {
      const res = await fetch('/api/ai/cfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          // Pass REAL metrics as context — not hardcoded values
          context: metrics ? {
            mrr: metrics.mrr,
            mrrGrowth: metrics.mrrGrowth,
            revenue30d: metrics.revenue30d,
            revenueGrowth: metrics.revenueGrowth,
            activeSubscriptions: metrics.activeSubscriptions,
            newSubscriptions30d: metrics.newSubscriptions30d,
            churnRate: metrics.churnRate,
            newCustomers30d: metrics.newCustomers30d,
            availableBalance: metrics.availableBalance,
            runway: metrics.runway,
            cancelledSubscriptions30d: metrics.cancelledSubscriptions30d,
          } : undefined,
        }),
      })
      const data = await res.json()
      setAiProvider(data.provider ?? 'fallback')
      setAiResponse(data.answer ?? 'Could not get a response right now.')
    } catch {
      setAiProvider('fallback')
      setAiResponse('AI advisor is running in local fallback mode right now. Try again in a few seconds.')
    } finally {
      setAiLoading(false)
    }
  }, [metrics])

  // ── Derived display values (from real metrics or sensible fallbacks) ───────
  const runwayDisplay = !metrics ? '—'
    : metrics.runway >= 9999 ? '∞'
    : `${metrics.runway}d`

  const runwayPositive = !metrics ? true : metrics.runway > 90 || metrics.runway >= 9999

  const startCheckout = useCallback(async (interval: 'monthly' | 'annual' = 'monthly') => {
    setBillingBusy(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      }
    } finally {
      setBillingBusy(false)
    }
  }, [])

  return (
    <DashboardShell
      title={`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}. ☀️`}
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : loading ? 'Loading your financial data...' : `Last synced ${lastRefreshed ? timeAgo(Math.floor(lastRefreshed.getTime() / 1000)) : 'just now'} · auto-refreshes every 60s`}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >

        {plan === 'free' && (
          <div className="glass gold-border rounded-2xl p-5 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 gold-glow">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-1">Upgrade to Pro to unlock MAX CFO</p>
              <p className="text-sm text-white">
                Free plan keeps the dashboard. Pro unlocks the full AI CFO, deeper insights, and the action engine.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startCheckout('monthly')}
                disabled={billingBusy}
                className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-50"
              >
                {billingBusy ? 'Starting...' : 'Upgrade for $99/mo'}
              </button>
              <button
                onClick={() => startCheckout('annual')}
                disabled={billingBusy}
                className="px-4 py-2 rounded-xl glass gold-border text-white font-semibold text-sm hover:border-gold/40 transition-all disabled:opacity-50"
              >
                Annual $899
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <InlineNotice
            variant="error"
            message={error}
            action={(
              <button
                onClick={() => refresh()}
                className="text-gold text-sm hover:text-gold-light transition-colors"
              >
                Try again →
              </button>
            )}
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="MRR" icon={DollarSign} loading={loading}
            value={metrics ? formatCurrency(metrics.mrr) : '—'}
            change={metrics ? `${formatPercent(metrics.mrrGrowth)} MoM` : '—'}
            positive={(metrics?.mrrGrowth ?? 0) >= 0}
          />
          <KPICard
            label="Active Subs" icon={Users} loading={loading}
            value={metrics ? metrics.activeSubscriptions.toString() : '—'}
            change={metrics ? `+${metrics.newSubscriptions30d} new (30d)` : '—'}
            positive={true}
          />
          <KPICard
            label="Churn Rate" icon={TrendingDown} loading={loading}
            value={metrics ? `${metrics.churnRate}%` : '—'}
            change={metrics ? `${metrics.cancelledSubscriptions30d} cancelled (30d)` : '—'}
            positive={(metrics?.churnRate ?? 0) < 5}
          />
          <KPICard
            label="Cash Runway" icon={Zap} loading={loading}
            value={runwayDisplay}
            change={metrics ? `$${metrics.availableBalance.toLocaleString()} available` : '—'}
            positive={runwayPositive}
          />
        </div>

        <div className="glass gold-border rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Decision-grade Forecasting</p>
            <p className="text-sm text-white">Monte Carlo Scenario Lab is live in Forecasts (P10/P50/P90 + action advice).</p>
          </div>
          <Link
            href="/dashboard/forecasts"
            className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm font-semibold whitespace-nowrap"
          >
            Open Forecasts
          </Link>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* MRR Growth Chart */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">MRR Growth</h3>
                <p className="text-slate-aug text-xs font-mono">Monthly recurring revenue</p>
              </div>
              {metrics && (
                <span className={`text-sm font-mono font-bold ${metrics.mrrGrowth >= 0 ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                  {formatPercent(metrics.mrrGrowth)} MoM
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : metrics?.mrrHistory.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metrics.mrrHistory}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No subscription data yet</div>
            )}
          </div>

          {/* Daily Revenue (last 7 days — properly ordered) */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">Last 7 Days</h3>
                <p className="text-slate-aug text-xs font-mono">Daily revenue</p>
              </div>
              {metrics && (
                <span className="text-white text-sm font-mono font-bold">
                  {formatCurrency(metrics.dailyRevenue.reduce((s, d) => s + d.revenue, 0))} total
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : metrics?.dailyRevenue.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metrics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B8FA8', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {metrics.dailyRevenue.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.revenue > 0 ? 'rgba(0, 208, 132, 0.65)' : 'rgba(139, 143, 168, 0.3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No revenue in last 7 days</div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* AI CFO Insights + Chat */}
          <div className="lg:col-span-2 glass gold-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-gold" />
              <h3 className="font-display text-base font-bold text-white">AI CFO Insights</h3>
              {insightsLoading && (
                <span className="ml-2 text-xs font-mono text-slate-aug flex items-center gap-1">
                  <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
                  Analyzing your data...
                </span>
              )}
              {insights.length > 0 && !insightsLoading && (
                <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {insights.length} active
                </span>
              )}
            </div>

            {/* Insights list */}
            <div className="space-y-3 mb-5">
              {insightsLoading && insights.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))
              ) : insights.length > 0 ? (
                insights.map((insight) => {
                  const style = INSIGHT_STYLES[insight.type]
                  const Icon  = style.icon
                  return (
                    <div key={insight.id} className={`rounded-xl p-4 border ${style.border} ${style.bg} flex items-start gap-3`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white">{insight.title}</p>
                          {insight.metric && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${style.bg} border ${style.border} ${style.iconColor}`}>
                              {insight.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-aug leading-relaxed">{insight.body}</p>
                      </div>
                      <button className="text-xs text-slate-aug hover:text-white flex items-center gap-0.5 flex-shrink-0 transition-colors">
                        {insight.action}<ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              ) : !loading && (
                <p className="text-slate-aug text-sm text-center py-4">
                  AI insights are warming up. Refresh to regenerate recommendations.
                </p>
              )}
            </div>

            {/* Ask AI CFO */}
            <div className="border-t border-[rgba(201,168,76,0.1)] pt-5">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Ask your AI CFO</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  placeholder="Should I raise prices? When do I hit $10k MRR? How's my churn?"
                  className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 transition-all"
                  onKeyDown={e => e.key === 'Enter' && askAI(aiQuestion)}
                />
                <button
                  onClick={() => askAI(aiQuestion)}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading
                    ? <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    : <Brain className="w-4 h-4" />
                  }
                  Ask
                </button>
              </div>

              {aiResponse && (
                <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20 fade-up">
                  <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
                  {aiProvider && (
                    <p className="text-[11px] font-mono uppercase tracking-widest text-slate-aug mt-2">
                      Source: {aiProvider}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'Should I raise my prices?',
                  'When do I run out of cash?',
                  'How is my churn trending?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setAiQuestion(q); askAI(q) }}
                    className="text-xs px-3 py-1.5 rounded-lg glass gold-border text-slate-aug hover:text-white transition-all hover:border-gold/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live events feed */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base font-bold text-white">Live Events</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-aug font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
                Live
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : metrics?.recentEvents.length ? (
              <div className="space-y-0">
                {metrics.recentEvents.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.positive ? 'bg-emerald-aug' : 'bg-crimson-aug'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{event.description}</p>
                      <p className="text-xs text-slate-aug font-mono">
                        {event.customerEmail ? `${event.customerEmail} · ` : ''}{timeAgo(event.created)}
                      </p>
                    </div>
                    <span className={`text-xs font-mono font-bold flex-shrink-0 ${event.positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                      {event.positive ? '+' : '-'}{formatCurrency(event.amount, event.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-aug text-sm text-center py-8">No recent events</p>
            )}

            {metrics?.recentEvents.length ? (
              <Link
                href="/dashboard/revenue"
                className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-aug hover:text-gold transition-colors pt-3 border-t border-[rgba(201,168,76,0.07)]"
              >
                View all events <ArrowUpRight className="w-3 h-3" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-6">
          <MRRHistory />
        </div>

        {/* Financial summary row */}
        {metrics && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '30d Revenue',    value: formatCurrency(metrics.revenue30d),                        sub: `vs ${formatCurrency(metrics.revenuePrev30d)} prior`, good: metrics.revenueGrowth >= 0 },
              { label: 'New Customers',  value: metrics.newCustomers30d.toString(),                        sub: 'joined in last 30 days',                             good: true },
              { label: 'Available Cash', value: formatCurrency(metrics.availableBalance),                  sub: `+ ${formatCurrency(metrics.pendingBalance)} pending`, good: metrics.availableBalance > 0 },
              { label: 'Est. Tax (ann)', value: formatCurrency(metrics.mrr * 12 * 0.25),                   sub: '~25% of annualized MRR',                             good: true },
            ].map(({ label, value, sub, good }) => (
              <div key={label} className="glass gold-border rounded-xl p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">{label}</p>
                <p className={`font-display text-xl font-bold ${good ? 'text-white' : 'text-crimson-aug'}`}>{value}</p>
                <p className="text-xs text-slate-aug mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}
    </DashboardShell>
  )
}
