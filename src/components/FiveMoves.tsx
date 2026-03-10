'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Zap, ChevronDown, ChevronUp, Shield, Clock, Lock } from 'lucide-react'
import type { FiveMovesResult, Move, StripeMetrics, ActionCard, Plan } from '@/types'
import ActionModal from '@/components/ActionModal'

const STATUS_MESSAGES = [
  'Scoring decisions...',
  'Running simulations...',
  'Kimi K2 interpreting outcomes...',
  'Ranking moves by risk...',
]

function timeAgoShort(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60_000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

function MoveCard({ move, isExpanded, onToggle, onExecute }: {
  move: Move
  isExpanded: boolean
  onToggle: () => void
  onExecute: (move: Move) => void
}) {
  return (
    <div
      className="glass rounded-2xl overflow-hidden transition-all duration-300"
      style={{ borderLeft: `4px solid ${move.riskColor}`, borderColor: `${move.riskColor}33` }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${move.riskColor}20`, color: move.riskColor, border: `1px solid ${move.riskColor}40` }}
            >
              {move.risk}
            </span>
            <span className="text-[10px] font-mono text-slate-aug">{move.riskLabel}</span>
          </div>
          <h4 className="font-display text-lg font-bold text-white mb-1">{move.title}</h4>
          <p className="text-sm text-gold italic leading-relaxed">{move.maxStatement}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-aug border border-white/10">
              <Clock className="w-3 h-3 inline mr-1" />{move.timeToExecute}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Runway</p>
              <p className="text-sm font-bold text-white">
                {move.metrics.expectedRunwayGain > 0 ? '+' : ''}{move.metrics.expectedRunwayGain}d
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Survival</p>
              <p className="text-sm font-bold text-white">{(move.metrics.survivalProbability * 100).toFixed(0)}%</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">MRR/90d</p>
              <p className="text-sm font-bold text-white">${Math.round(move.metrics.expectedMRRAt90d).toLocaleString()}</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Score</p>
              <p className="text-sm font-bold text-white">{move.metrics.compositeScore.toFixed(0)}/100</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-aug" /> : <ChevronDown className="w-4 h-4 text-slate-aug" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          <p className="text-sm text-white">{move.summary}</p>
          <p className="text-sm text-slate-aug">{move.rationale}</p>
          <p className="text-xs text-slate-aug/70 italic">{move.tradeoff}</p>

          {move.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {move.actions.map((a, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {a.label}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => onExecute(move)}
            className="w-full mt-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: move.riskColor, color: '#0B0D0F' }}
          >
            {(move as any).locked ? <><Lock className="w-4 h-4" /> Upgrade to Execute</> : 'Execute Move'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FiveMoves({ metrics, plan = 'demo', onFeatureLock }: { metrics: StripeMetrics | null; plan?: Plan; onFeatureLock?: (feature: string, requiredPlan: 'solo' | 'enterprise') => void }) {
  const isDemo = plan === 'demo'
  const [data, setData] = useState<FiveMovesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [statusIdx, setStatusIdx] = useState(0)
  const [actionCard, setActionCard] = useState<ActionCard | null>(null)
  const fetchedRef = useRef(false)

  const fetchFiveMoves = useCallback(async () => {
    if (!metrics) return
    setLoading(true)
    setStatusIdx(0)
    try {
      const res = await fetch('/api/ai/five-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, customers: [] }),
      })
      if (res.ok) {
        const result: FiveMovesResult = await res.json()
        if (result.moves?.length) setData(result)
      }
    } catch (err) {
      console.error('[FiveMoves] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [metrics])

  useEffect(() => {
    if (metrics && !fetchedRef.current && (isDemo || (metrics.accountAgeDays ?? 0) >= 60)) {
      fetchedRef.current = true
      fetchFiveMoves()
    }
  }, [metrics, fetchFiveMoves, isDemo])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setStatusIdx(i => (i + 1) % STATUS_MESSAGES.length)
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  const handleExecute = (move: Move) => {
    if (isDemo) {
      onFeatureLock?.('Five Moves Execution', 'solo')
      return
    }
    if (!move.actions.length) {
      onFeatureLock?.('Five Moves Execution', 'solo')
      return
    }
    const primary = move.actions[0]
    setActionCard({
      id: `move_${move.rank}_${Date.now()}`,
      priority: 1,
      severity: 'opportunity',
      title: move.title,
      context: move.summary,
      estimatedImpact: `+${move.metrics.expectedRunwayGain}d runway`,
      actionType: primary.actionType,
      actionLabel: 'Execute',
      params: primary.params,
      isDestructive: primary.riskTier <= 2,
      requiresConfirmText: primary.riskTier <= 2,
    })
  }

  if (!metrics) return null

  if (!isDemo && (metrics.accountAgeDays ?? 0) < 60) {
    return (
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <h2 className="font-display text-xl font-bold text-white mb-2">5 Moves</h2>
        <p className="text-sm text-slate-aug mb-3">Five Moves unlock at 60 days of Stripe data.</p>
        <div className="w-full bg-white/5 rounded-full h-2">
          <div
            className="bg-gold h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (metrics.accountAgeDays / 60) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-aug mt-2">{metrics.accountAgeDays} of 60 days</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">5 Moves</h2>
          <p className="text-xs font-mono text-slate-aug mt-0.5">
            Ranked by risk &middot; 50,000 simulations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-aug">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
              Live
            </span>
          )}
          {data && (
            <span className="text-xs font-mono text-slate-aug">
              Updated {timeAgoShort(data.generatedAt)}
            </span>
          )}
          <button
            onClick={fetchFiveMoves}
            disabled={loading}
            className="p-2 rounded-lg glass gold-border text-slate-aug hover:text-gold transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data && !loading && isDemo && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 mb-4 text-sm text-gold">
          These are example moves based on demo data. Connect your Stripe to see your real 50,000-simulation analysis.
        </div>
      )}

      {data && !loading && (
        <div className="glass gold-border rounded-xl p-3 mb-4 text-sm text-slate-aug">
          <Shield className="w-4 h-4 inline mr-1.5 text-gold" />
          Without action: <span className="text-white font-semibold">{Math.round(data.baselineSimulation.runway.p50)}d</span> median runway &middot;{' '}
          <span className="text-white font-semibold">{(data.baselineSimulation.runway.probabilityOf180Days * 100).toFixed(0)}%</span> survival at 180 days
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5" style={{ borderLeft: '4px solid rgba(255,255,255,0.1)' }}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
          <p className="text-center text-sm text-gold font-mono animate-pulse mt-2">
            {STATUS_MESSAGES[statusIdx]}
          </p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3">
          {data.moves.map((move, i) => (
            <MoveCard
              key={move.rank}
              move={move}
              isExpanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              onExecute={handleExecute}
            />
          ))}
        </div>
      )}

      {actionCard && (
        <ActionModal card={actionCard} onClose={() => setActionCard(null)} />
      )}
    </div>
  )
}
