'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, FileText, Bell, Check } from 'lucide-react'

interface ReportSummary {
  month: string
  report: {
    title: string
    subtitle: string
    publishedAt: number
    dataPointsUsed: number
    businessesIncluded: number
    keyFindings: Array<{ headline: string }>
  }
}

interface ProgressData {
  current: number
  required: number
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then(r => r.json()),
      fetch('/api/dataset/stats').then(r => r.json()),
    ])
      .then(([reportsData, statsData]) => {
        setReports(reportsData.reports || [])
        setProgress({
          current: statsData.totalDataPoints || 0,
          required: 50,
        })
      })
      .catch(() => {
        setProgress({ current: 0, required: 50 })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async () => {
    if (!email.trim() || subscribing) return
    setSubscribing(true)
    try {
      const res = await fetch('/api/reports/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubscribed(true)
      }
    } finally {
      setSubscribing(false)
    }
  }

  const progressPercent = progress ? Math.min(100, (progress.current / progress.required) * 100) : 0
  const hasReports = reports.length > 0

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-[rgba(201,168,76,0.12)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-aug hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border mb-6">
            <BarChart3 className="w-4 h-4 text-gold" />
            <span className="text-xs text-slate-aug font-mono uppercase tracking-widest">Research</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-4">
            The State of <span className="text-gradient-gold">SaaS Survival</span>
          </h1>
          
          <p className="text-lg text-slate-aug max-w-2xl mx-auto mb-8">
            Real data from real Stripe businesses. Anonymized. Published monthly.
            What actually works when founders make financial decisions?
          </p>

          {progress && (
            <div className="glass gold-border rounded-2xl p-4 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-aug">Dataset size</span>
                <span className="text-sm font-bold text-gold">{progress.current} decisions</span>
              </div>
              <div className="h-2 bg-obsidian-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!hasReports && (
                <p className="text-xs text-slate-aug mt-2">
                  First report publishes at {progress.required} decisions
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Reports or Waitlist */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : hasReports ? (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold text-white mb-6">Published Reports</h2>
              {reports.map(({ month, report }) => (
                <Link
                  key={month}
                  href={`/reports/${month}`}
                  className="block glass gold-border rounded-2xl p-6 card-hover group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-gold" />
                        <span className="text-xs font-mono text-slate-aug uppercase tracking-widest">
                          {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
                        {report.keyFindings[0]?.headline || report.title}
                      </h3>
                      <p className="text-sm text-slate-aug">
                        Based on {report.dataPointsUsed} decisions across {report.businessesIncluded} businesses
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-aug group-hover:text-gold group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass gold-border rounded-2xl p-8 text-center max-w-xl mx-auto">
              <Bell className="w-12 h-12 text-gold mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                First report coming soon
              </h2>
              <p className="text-slate-aug mb-6">
                We publish our first research report when we reach {progress?.required || 50} analyzed decisions.
                Get notified when it drops.
              </p>

              {subscribed ? (
                <div className="flex items-center justify-center gap-2 text-emerald-aug">
                  <Check className="w-5 h-5" />
                  <span>You&apos;ll be notified!</span>
                </div>
              ) : (
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/50"
                    onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing || !email.trim()}
                    className="px-6 py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-50"
                  >
                    {subscribing ? '...' : 'Notify me'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* What We Track */}
      <section className="py-16 px-6 border-t border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-8 text-center">What We Analyze</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Decision Outcomes', desc: 'What happens when founders raise prices, recover payments, or launch retention campaigns?' },
              { title: 'Success by MRR Band', desc: 'Do $5K MRR founders succeed differently than $50K MRR founders with the same actions?' },
              { title: 'Prediction Accuracy', desc: 'How accurate are Monte Carlo simulations when compared to actual outcomes 30 days later?' },
            ].map(item => (
              <div key={item.title} className="glass gold-border rounded-xl p-6">
                <h3 className="font-display font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-aug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            Want to be part of the dataset?
          </h2>
          <p className="text-slate-aug mb-6">
            Connect your Stripe account and contribute anonymized insights while getting AI CFO recommendations.
          </p>
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold hover:bg-gold-light transition-all"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-slate-aug text-sm font-mono">Lucrum Research &copy; 2026</span>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
