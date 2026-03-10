'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import type { ActionCard, StripeMetrics } from '@/types'
import ActionModal from '@/components/ActionModal'

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: React.ElementType; iconColor: string }> = {
  critical:    { border: 'border-red-500/40',     bg: 'bg-red-500/8',     icon: AlertTriangle, iconColor: 'text-red-400' },
  warning:     { border: 'border-yellow-500/35',  bg: 'bg-yellow-500/6',  icon: AlertTriangle, iconColor: 'text-yellow-400' },
  opportunity: { border: 'border-gold/30',        bg: 'bg-gold/5',        icon: TrendingUp,    iconColor: 'text-gold' },
  win:         { border: 'border-emerald-aug/30', bg: 'bg-emerald-aug/5', icon: CheckCircle,   iconColor: 'text-emerald-aug' },
}

export default function MaxRecommendations({ metrics }: { metrics: StripeMetrics | null }) {
  const [cards, setCards] = useState<ActionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCard, setActiveCard] = useState<ActionCard | null>(null)

  const fetchCards = useCallback(async () => {
    if (!metrics) return
    setLoading(true)
    try {
      const res = await fetch('/api/actions/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards ?? [])
      }
    } catch {
      // Best effort
    } finally {
      setLoading(false)
    }
  }, [metrics])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  if (!cards.length && !loading) return null

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">MAX Recommendations</h3>
          {loading && (
            <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin ml-2" />
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {cards.map((card) => {
            const style = SEVERITY_STYLES[card.severity] ?? SEVERITY_STYLES.opportunity
            const Icon = style.icon
            return (
              <div
                key={card.id}
                className={`flex-shrink-0 w-72 rounded-xl p-4 border ${style.border} ${style.bg} card-hover cursor-pointer`}
                onClick={() => setActiveCard(card)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  <span className={`text-xs font-mono uppercase ${style.iconColor}`}>{card.severity}</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                <p className="text-xs text-slate-aug leading-relaxed mb-3">{card.context}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-aug">{card.estimatedImpact}</span>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all">
                    {card.actionLabel}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {activeCard && (
        <ActionModal card={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </>
  )
}
