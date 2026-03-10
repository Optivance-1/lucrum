'use client'

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

type Snapshot = {
  timestamp: number
  mrr: number
}

export default function MRRHistory() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/metrics/history')
        const data = await res.json()
        if (!cancelled) {
          setSnapshots(data.snapshots ?? [])
        }
      } catch {
        if (!cancelled) setSnapshots([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = snapshots.map((snapshot) => ({
    date: new Date(snapshot.timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    mrr: snapshot.mrr,
  }))

  return (
    <div className="glass gold-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-base font-bold text-white">MRR History</h3>
          <p className="text-slate-aug text-xs font-mono">Last 90 days of saved snapshots</p>
        </div>
        {chartData.length > 0 && (
          <span className="text-sm font-mono text-white">
            {formatCurrency(chartData[chartData.length - 1].mrr)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
      ) : chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="snapshotMrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
            <XAxis dataKey="date" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              contentStyle={{
                background: 'rgba(22,22,42,0.95)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '16px',
                color: '#fff',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#snapshotMrrGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-56 flex items-center justify-center text-slate-aug text-sm font-mono">
          Historical snapshots will appear after daily syncs start accumulating.
        </div>
      )}
    </div>
  )
}
