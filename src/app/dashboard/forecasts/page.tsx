'use client'

import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency, estimateTax } from '@/lib/utils'
import { TrendingUp, DollarSign, Zap, Calendar, Download, FileDown } from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function ForecastsPage() {
  const { metrics, loading, error, lastRefreshed, refresh } = useStripeData()

  return (
    <DashboardShell
      title="Cash Flow Command Center"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : '30/60/90-day forecast, payout buffer, and MRR movement'}
      error={error}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

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
