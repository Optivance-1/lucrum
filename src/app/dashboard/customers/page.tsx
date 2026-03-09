'use client'

import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency } from '@/lib/utils'
import { Users, AlertTriangle, TrendingDown, RefreshCw, Download } from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function CustomersPage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()

  return (
    <DashboardShell
      title="Churn & Retention Intelligence"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : 'Passive churn, cohort retention, and recovery estimates'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      <div className="flex justify-end mb-4">
        <a
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
          href="/api/customers/export"
          download
        >
          <Download className="w-4 h-4" />
          Download CSV
        </a>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      {/* Passive churn & active churn KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-crimson-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Passive Churn at Risk</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-crimson-aug">
              {metrics ? formatCurrency(metrics.failedPaymentsValue ?? 0) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.failedPaymentsCount ?? 0} customers with failed payments
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Churn Rate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? `${metrics.churnRate}%` : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.cancelledSubscriptions30d ?? 0} cancelled in last 30 days
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Active Subscriptions</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics?.activeSubscriptions ?? '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            +{metrics?.newSubscriptions30d ?? 0} new in last 30 days
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Recovery Estimate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-emerald-aug">
              {metrics?.failedPaymentsValue ? formatCurrency(metrics.failedPaymentsValue * 0.3) : '$0'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            ~30% recoverable with retry on days 3, 7, 14
          </p>
        </div>
      </div>

      {/* Cohort retention grid */}
      {metrics?.cohortRetention && metrics.cohortRetention.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Cohort Retention Grid</h3>
          <p className="text-slate-aug text-sm mb-4">
            Which acquisition month&apos;s customers retain best and worst over time.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="text-left py-3 px-4 text-slate-aug font-mono">Cohort</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Customers</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Retained</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Retention %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.cohortRetention.map((row) => (
                  <tr key={row.cohortMonth} className="border-b border-gold/10 hover:bg-white/5">
                    <td className="py-3 px-4 font-mono text-white">{row.cohortMonth}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-aug">{row.customers}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-aug">{row.retained}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={row.retentionRate >= 80 ? 'text-emerald-aug' : row.retentionRate >= 50 ? 'text-gold' : 'text-crimson-aug'}>
                        {row.retentionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dunning recommendation */}
      {(metrics?.failedPaymentsCount ?? 0) > 0 && (
        <div className="glass gold-border rounded-2xl p-6 border-l-4 border-gold/50">
          <h3 className="font-display text-base font-bold text-white mb-2">Smart Dunning Recommendation</h3>
          <p className="text-slate-aug text-sm">
            Trigger payment retries on days 3, 7, and 14 after failure. Industry data shows ~30% of failed payments
            recover with well-timed retries. Consider enabling Stripe&apos;s automatic retry logic or using a dunning
            tool for best results.
          </p>
        </div>
      )}
    </DashboardShell>
  )
}
