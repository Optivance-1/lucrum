'use client'

import { useState, useCallback } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { Brain, ChevronRight, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import type { AIInsight, InsightSeverity } from '@/types'

const INSIGHT_STYLES: Record<InsightSeverity, {
  border: string; bg: string; icon: React.ElementType; iconColor: string
}> = {
  critical: { border: 'border-red-500/40', bg: 'bg-red-500/8', icon: AlertTriangle, iconColor: 'text-red-400' },
  warning: { border: 'border-yellow-500/35', bg: 'bg-yellow-500/6', icon: AlertTriangle, iconColor: 'text-yellow-400' },
  opportunity: { border: 'border-gold/30', bg: 'bg-gold/5', icon: TrendingUp, iconColor: 'text-gold' },
  win: { border: 'border-emerald-aug/30', bg: 'bg-emerald-aug/5', icon: CheckCircle, iconColor: 'text-emerald-aug' },
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function AIInsightsPage() {
  const { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiProvider, setAiProvider] = useState<'gemini' | 'anthropic' | 'fallback' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

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
      setAiResponse(data.answer ?? 'Could not get a response.')
    } catch {
      setAiProvider('fallback')
      setAiResponse('AI advisor is temporarily in local fallback mode. Try again in a moment.')
    } finally {
      setAiLoading(false)
    }
  }, [metrics])

  const QUICK_PROMPTS = [
    'Should I raise my prices?',
    'When do I run out of cash?',
    'How is my churn trending?',
    'What would a 5% price increase do to revenue?',
    'Which customers are at risk?',
  ]

  return (
    <DashboardShell
      title="Lucrum AI Advisor"
      subtitle="Plain-English financial summary and ranked recommendations"
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {/* AI-generated insights */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">This Week&apos;s Insights</h3>
          {insightsLoading && (
            <span className="ml-2 text-xs font-mono text-slate-aug flex items-center gap-1">
              <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
              Analyzing...
            </span>
          )}
        </div>

        <div className="space-y-3">
          {insightsLoading && insights.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : insights.length > 0 ? (
            insights.map((insight) => {
              const style = INSIGHT_STYLES[insight.type]
              const Icon = style.icon
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
                  <span className="text-xs text-slate-aug flex items-center gap-0.5 flex-shrink-0">
                    {insight.action} <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              )
            })
          ) : (
            <p className="text-slate-aug text-sm py-4">AI insights are warming up. Refresh to regenerate suggestions.</p>
          )}
        </div>
      </div>

      {/* Ask AI CFO */}
      <div className="glass gold-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-white mb-3">Ask Your AI CFO</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Should I raise prices? When do I hit $10k MRR? How's my churn?"
            className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
            onKeyDown={(e) => e.key === 'Enter' && askAI(aiQuestion)}
          />
          <button
            onClick={() => askAI(aiQuestion)}
            disabled={!aiQuestion.trim() || aiLoading}
            className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {aiLoading ? (
              <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Ask
          </button>
        </div>

        {aiResponse && (
          <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
            <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
            {aiProvider && (
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-aug mt-2">
                Source: {aiProvider}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map((q) => (
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
    </DashboardShell>
  )
}
