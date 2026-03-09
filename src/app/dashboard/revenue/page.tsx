'use client'

import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { DollarSign, TrendingUp, Percent, AlertTriangle, Download } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass gold-border rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-aug font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function RevenuePage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()

  return (
    <DashboardShell
      title="Revenue Reality Dashboard"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : 'Gross vs net revenue, effective fee rate, and payout timeline'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {metrics && (
        <div className="flex justify-end mb-4">
          <a
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
            href={`/api/revenue/export?grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&effectiveFeeRate=${metrics.effectiveFeeRate}&payoutSchedule=${encodeURIComponent(metrics.payoutSchedule)}`}
            download
          >
            <Download className="w-4 h-4" />
            Download CSV
          </a>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      {/* Gross vs Net Revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Gross Revenue (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.grossRevenue30d ?? metrics.revenue30d) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Before fees, refunds, disputes</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Net Revenue (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.netRevenue30d ?? metrics.revenue30d) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">After Stripe fees, refunds, disputes</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Effective Fee Rate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics?.effectiveFeeRate != null ? `${metrics.effectiveFeeRate.toFixed(2)}%` : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Blended rate vs nominal 2.9%</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-crimson-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Revenue Leakage (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-crimson-aug">
              {metrics ? formatCurrency((metrics.refundTotal30d ?? 0) + (metrics.disputeTotal30d ?? 0) + (metrics.stripeFees30d ?? 0)) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Fees + refunds + disputes</p>
        </div>
      </div>

      {/* Revenue by period (7, 30, 90, 365) */}
      {metrics?.revenueByPeriod && metrics.revenueByPeriod.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Revenue by Period</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.revenueByPeriod.map((p) => (
              <div key={p.period} className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">{p.period}</p>
                <p className="font-bold text-white">{formatCurrency(p.net)}</p>
                <p className="text-xs text-slate-aug">Gross: {formatCurrency(p.gross)} · Fees: {formatCurrency(p.fees)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-4">MRR Trend</h3>
          {loading ? <Skeleton className="h-44 w-full" /> : metrics?.mrrHistory?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics.mrrHistory}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-aug text-sm">No data yet</div>
          )}
        </div>
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Daily Revenue (Last 7 Days)</h3>
          {loading ? <Skeleton className="h-44 w-full" /> : metrics?.dailyRevenue?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={metrics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#8B8FA8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {metrics.dailyRevenue.map((entry, i) => (
                    <Cell key={i} fill={entry.revenue > 0 ? 'rgba(0, 208, 132, 0.65)' : 'rgba(139, 143, 168, 0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-aug text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Revenue Leakage Finder */}
      {metrics?.leakageSummary && (
        <div className="glass gold-border rounded-2xl p-6 mb-6 border-l-4 border-crimson-aug/50">
          <h3 className="font-display text-base font-bold text-white mb-4">Revenue Leakage Finder</h3>
          <p className="text-slate-aug text-sm mb-4">
            Money you&apos;ve lost or are losing — refunds, disputes, fees, and passive churn at risk.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-crimson-aug/5 p-4 border border-crimson-aug/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Refunds (30d)</p>
              <p className="font-bold text-crimson-aug">{formatCurrency(metrics.leakageSummary.refundTotal)}</p>
            </div>
            <div className="rounded-xl bg-crimson-aug/5 p-4 border border-crimson-aug/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Disputes (30d)</p>
              <p className="font-bold text-crimson-aug">{formatCurrency(metrics.leakageSummary.disputeTotal)}</p>
            </div>
            <div className="rounded-xl bg-gold/5 p-4 border border-gold/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Stripe Fees (30d)</p>
              <p className="font-bold text-gold">{formatCurrency(metrics.leakageSummary.feeTotal)}</p>
            </div>
            <div className="rounded-xl bg-yellow-500/5 p-4 border border-yellow-500/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Passive Churn at Risk</p>
              <p className="font-bold text-yellow-400">{formatCurrency(metrics.leakageSummary.passiveChurnAtRisk)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-aug mt-4">
            Fee optimization: Consider annual billing to reduce per-transaction fees. Round up prices to absorb the 2.9% + $0.30.
          </p>
        </div>
      )}

      {/* Payout timeline */}
      {metrics?.payoutSchedule && (
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-2">Stripe Payout Timeline</h3>
          <p className="text-slate-aug text-sm">
            Revenue typically lands in your bank account within {metrics.payoutSchedule} of the charge date.
            Available balance: {formatCurrency(metrics.availableBalance)} · Pending: {formatCurrency(metrics.pendingBalance)}
          </p>
        </div>
      )}
    </DashboardShell>
  )
}
