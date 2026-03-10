'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'
import { useStripeData } from '@/hooks/useStripeData'
import { timeAgo } from '@/lib/utils'

interface AuditEntry {
  id: string
  userId: string
  actionType: string
  category: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  errorMessage?: string
  revenueImpact?: number
  affectedCustomers: string[]
  maxRecommended: boolean
  executedAt: string
  stripeRequestId?: string
}

export default function AuditPage() {
  const { error, isDemoData, lastRefreshed, loading, refresh } = useStripeData()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [auditLoading, setAuditLoading] = useState(true)

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/audit?limit=100')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.data ?? [])
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  return (
    <DashboardShell
      title="Action Audit Log"
      subtitle="Complete history of all actions executed through Lucrum"
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      <div className="glass gold-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-6 py-3 border-b border-[rgba(201,168,76,0.1)] text-xs font-mono uppercase tracking-widest text-slate-aug">
          <span>Timestamp</span>
          <span>Action</span>
          <span>Impact</span>
          <span>Status</span>
          <span></span>
        </div>

        {auditLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-aug">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-aug">No actions executed yet. Recommendations will appear on your dashboard.</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="border-b border-[rgba(201,168,76,0.05)] last:border-0">
              <div
                className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-6 py-3 items-center cursor-pointer hover:bg-white/2 transition-all"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <span className="text-xs font-mono text-slate-aug flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(Math.floor(new Date(entry.executedAt).getTime() / 1000))}
                </span>
                <span className="text-sm text-white">{entry.actionType.replace(/_/g, ' ')}</span>
                <span className={`text-xs font-mono ${entry.revenueImpact && entry.revenueImpact > 0 ? 'text-emerald-aug' : 'text-slate-aug'}`}>
                  {entry.revenueImpact != null ? `$${entry.revenueImpact}` : '—'}
                </span>
                <span className="flex items-center gap-1">
                  {entry.success
                    ? <CheckCircle className="w-3 h-3 text-emerald-aug" />
                    : <AlertTriangle className="w-3 h-3 text-crimson-aug" />
                  }
                  <span className={`text-xs font-mono ${entry.success ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                    {entry.success ? 'Success' : 'Failed'}
                  </span>
                </span>
                <span className="text-right">
                  {expandedId === entry.id
                    ? <ChevronDown className="w-4 h-4 text-slate-aug inline" />
                    : <ChevronRight className="w-4 h-4 text-slate-aug inline" />
                  }
                </span>
              </div>

              {expandedId === entry.id && (
                <div className="px-6 pb-4 fade-up">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Parameters</p>
                      <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-lg p-3 overflow-auto max-h-32">
                        {JSON.stringify(entry.params, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Result</p>
                      <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-lg p-3 overflow-auto max-h-32">
                        {JSON.stringify(entry.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                  {entry.affectedCustomers.length > 0 && (
                    <p className="text-xs text-slate-aug mt-2">
                      Affected: {entry.affectedCustomers.join(', ')}
                    </p>
                  )}
                  {entry.maxRecommended && (
                    <span className="inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                      MAX Recommended
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
