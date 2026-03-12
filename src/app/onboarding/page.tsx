'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

interface OnboardingInsight {
  type: 'opportunity' | 'warning' | 'win'
  title: string
  detail: string
  metric?: string
}

interface TopMove {
  title: string
  summary: string
  risk: string
  riskColor: string
  estimatedImpact: string
}

const LOADING_MESSAGES = [
  'Pulling your Stripe data...',
  'Analyzing revenue patterns...',
  'Running 50,000 simulations...',
  'Calculating churn risk...',
  'Identifying growth opportunities...',
  'MAX is analyzing your business...',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const [step, setStep] = useState(1)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const [progress, setProgress] = useState(0)
  const [insights, setInsights] = useState<OnboardingInsight[]>([])
  const [topMove, setTopMove] = useState<TopMove | null>(null)
  const [metrics, setMetrics] = useState<{ mrr: number; runway: number; churn: number } | null>(null)

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-up')
    }
  }, [isLoaded, router, userId])

  useEffect(() => {
    if (step !== 1) return

    const messageInterval = setInterval(() => {
      setLoadingMessage(prev => {
        const idx = LOADING_MESSAGES.indexOf(prev)
        return LOADING_MESSAGES[(idx + 1) % LOADING_MESSAGES.length]
      })
    }, 1200)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + Math.random() * 15
      })
    }, 600)

    const fetchData = async () => {
      try {
        const [metricsRes, movesRes] = await Promise.all([
          fetch('/api/metrics'),
          fetch('/api/ai/five-moves'),
        ])
        
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json()
          setMetrics({
            mrr: metricsData.mrr || 0,
            runway: metricsData.runway || 0,
            churn: metricsData.churnRate || 0,
          })
          
          const generatedInsights: OnboardingInsight[] = []
          
          if (metricsData.runway && metricsData.runway < 90) {
            generatedInsights.push({
              type: 'warning',
              title: 'Runway Alert',
              detail: `At current burn, you have ${metricsData.runway} days of runway. MAX can help extend this.`,
              metric: `${metricsData.runway} days`,
            })
          }
          
          if (metricsData.failedPaymentsValue > 0) {
            generatedInsights.push({
              type: 'opportunity',
              title: 'Recoverable Revenue',
              detail: `You have $${metricsData.failedPaymentsValue.toLocaleString()} in failed payments that can be recovered.`,
              metric: `$${metricsData.failedPaymentsValue.toLocaleString()}`,
            })
          }
          
          if (metricsData.mrrGrowth > 0) {
            generatedInsights.push({
              type: 'win',
              title: 'Growth Momentum',
              detail: `Your MRR grew ${metricsData.mrrGrowth}% last month. Keep it up!`,
              metric: `+${metricsData.mrrGrowth}%`,
            })
          }
          
          if (generatedInsights.length === 0) {
            generatedInsights.push({
              type: 'opportunity',
              title: 'Ready for Analysis',
              detail: 'MAX has analyzed your Stripe data and is ready to help you grow.',
            })
          }
          
          setInsights(generatedInsights.slice(0, 3))
        }
        
        if (movesRes.ok) {
          const movesData = await movesRes.json()
          if (movesData.moves?.[0]) {
            const move = movesData.moves[0]
            setTopMove({
              title: move.title,
              summary: move.summary,
              risk: move.risk,
              riskColor: move.riskColor,
              estimatedImpact: move.metrics?.expectedDollarImpact 
                ? `$${move.metrics.expectedDollarImpact.toLocaleString()}`
                : 'Calculated impact',
            })
          }
        }
      } catch (err) {
        console.error('[onboarding] data fetch failed:', err)
        setInsights([{
          type: 'opportunity',
          title: 'Ready for Analysis',
          detail: 'MAX has loaded your data and is ready to help.',
        }])
      }
    }

    fetchData()

    const autoAdvance = setTimeout(() => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
      setProgress(100)
      setTimeout(() => setStep(2), 500)
    }, 8000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
      clearTimeout(autoAdvance)
    }
  }, [step])

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-lg">L</span>
            </div>
            <span className="font-display font-bold text-2xl text-gradient-gold">Lucrum</span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                s === step ? 'w-8 bg-gold' : s < step ? 'w-4 bg-gold/50' : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Loading */}
        {step === 1 && (
          <div className="glass gold-border rounded-2xl p-8 text-center fade-up">
            <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
            
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Your data is loading
            </h2>
            
            <p className="text-slate-aug mb-6 min-h-[24px] transition-opacity">
              {loadingMessage}
            </p>
            
            <div className="w-full h-2 bg-obsidian-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            
            <p className="text-xs text-slate-aug mt-3 font-mono">
              {Math.round(Math.min(100, progress))}% complete
            </p>
          </div>
        )}

        {/* Step 2: Insights */}
        {step === 2 && (
          <div className="glass gold-border rounded-2xl p-8 fade-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-aug/10 border border-emerald-aug/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-aug" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                Here is what MAX found
              </h2>
              {metrics && (
                <p className="text-slate-aug">
                  ${metrics.mrr.toLocaleString()} MRR • {metrics.runway === 9999 ? '∞' : metrics.runway} days runway • {metrics.churn}% churn
                </p>
              )}
            </div>
            
            <div className="space-y-4 mb-6">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    insight.type === 'warning'
                      ? 'bg-crimson-aug/5 border-crimson-aug/20'
                      : insight.type === 'win'
                      ? 'bg-emerald-aug/5 border-emerald-aug/20'
                      : 'bg-gold/5 border-gold/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      insight.type === 'warning' ? 'bg-crimson-aug/10' :
                      insight.type === 'win' ? 'bg-emerald-aug/10' : 'bg-gold/10'
                    }`}>
                      {insight.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-crimson-aug" />
                      ) : insight.type === 'win' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-aug" />
                      ) : (
                        <Zap className="w-4 h-4 text-gold" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{insight.title}</h3>
                        {insight.metric && (
                          <span className={`text-sm font-mono ${
                            insight.type === 'warning' ? 'text-crimson-aug' :
                            insight.type === 'win' ? 'text-emerald-aug' : 'text-gold'
                          }`}>
                            {insight.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-aug mt-1">{insight.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-xl bg-gold text-obsidian font-bold hover:bg-gold-light transition-all flex items-center justify-center gap-2"
            >
              Show me my first move <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: First Move */}
        {step === 3 && (
          <div className="glass gold-border rounded-2xl p-8 fade-up">
            <div className="text-center mb-6">
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-2">
                Your #1 Move
              </p>
              <h2 className="font-display text-2xl font-bold text-white">
                {topMove?.title || 'Your personalized move is ready'}
              </h2>
            </div>
            
            {topMove && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-mono px-2 py-1 rounded-full border"
                    style={{
                      color: topMove.riskColor,
                      borderColor: `${topMove.riskColor}40`,
                      backgroundColor: `${topMove.riskColor}10`,
                    }}
                  >
                    {topMove.risk.toUpperCase()}
                  </span>
                  <span className="text-sm text-emerald-aug font-mono">
                    {topMove.estimatedImpact}
                  </span>
                </div>
                <p className="text-slate-aug leading-relaxed">
                  {topMove.summary}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="w-full py-3.5 rounded-xl bg-gold text-obsidian font-bold hover:bg-gold-light transition-all flex items-center justify-center gap-2"
              >
                Execute this move <Zap className="w-4 h-4" />
              </Link>
              
              <Link
                href="/dashboard"
                className="w-full py-3.5 rounded-xl glass gold-border text-white font-semibold hover:border-gold/40 transition-all flex items-center justify-center gap-2"
              >
                See all 5 moves
              </Link>
            </div>
          </div>
        )}

        {/* Skip */}
        {step < 3 && (
          <p className="text-center mt-6">
            <Link href="/dashboard" className="text-sm text-slate-aug hover:text-white transition-colors">
              Skip to dashboard →
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
