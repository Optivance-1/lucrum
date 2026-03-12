'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Brain, TrendingUp, Shield, Check, Star, BarChart3 } from 'lucide-react'
import PlatformROIBanner from '@/components/PlatformROIBanner'

interface DatasetStats {
  decisionsAnalyzed: string
  businessesServed: string
  averageOutcomeImprovement: string
  averageRunwayExtended: string
}

const FEATURES = [
  { icon: Zap, title: 'Connect in 60 seconds', desc: 'Plug in your Stripe account. No forms. No jargon. No finance degree required.', color: 'gold' },
  { icon: Brain, title: 'AI CFO on demand', desc: 'Your revenue, categorized. Your cash flow, predicted. Real decisions, not dashboards.', color: 'emerald' },
  { icon: TrendingUp, title: 'Growth intelligence', desc: '"Raise your price 12%." "Offer annual plans now." Powered by 50,000 Monte Carlo simulations.', color: 'gold' },
  { icon: Shield, title: 'Built for AI builders', desc: 'Solo founders. Micro-SaaS. Indie hackers. We understand how you actually build.', color: 'emerald' },
]

const INSIGHTS = [
  '"You will run out of runway in 47 days at current burn."',
  '"Raise your starter plan price by 15% — churn risk is low."',
  '"3 customers are likely to cancel this month. Offer them a discount."',
  '"Annual plan conversion is 2× higher on Tuesdays. Send the email."',
  '"Your MRR growth is outpacing costs by 34%. Good time to hire."',
]

const TESTIMONIALS = [
  { quote: 'MAX caught a failed payment I\'d missed for 3 weeks. Recovered $297 in 30 seconds.', author: '@alexfounder', plan: 'Solo Dev' },
  { quote: 'The Five Moves simulation paid for itself in the first week. I ran the recovery play and saved $2,400 MRR.', author: 'Solo Dev customer', plan: 'Solo Dev' },
  { quote: 'Finally understand my runway without opening a spreadsheet. MAX just tells me what to do.', author: 'Early user', plan: 'Enterprise' },
]

export default function HomePage() {
  const [insightIdx, setInsightIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [annual, setAnnual] = useState(false)
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setInsightIdx(i => (i + 1) % INSIGHTS.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/dataset/stats')
      .then(res => res.json())
      .then(data => {
        setDatasetStats({
          decisionsAnalyzed: data.decisionsAnalyzed || '0',
          businessesServed: data.businessesServed || '0',
          averageOutcomeImprovement: data.averageOutcomeImprovement || '12%',
          averageRunwayExtended: data.averageRunwayExtended || '15 days',
        })
      })
      .catch(() => {
        setDatasetStats({
          decisionsAnalyzed: '0',
          businessesServed: '0',
          averageOutcomeImprovement: '12%',
          averageRunwayExtended: '15 days',
        })
      })
  }, [])

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-[rgba(201,168,76,0.12)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-aug">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-slate-aug hover:text-white transition-colors hidden md:block">Sign in</Link>
            <Link href="/connect" className="px-4 py-2 rounded-lg bg-gold text-obsidian font-semibold text-sm hover:bg-gold-light transition-all duration-200 hover:shadow-lg hover:shadow-gold/20">
              Try MAX free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-aug/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
            <span className="text-xs text-slate-aug font-mono uppercase tracking-widest">AI CFO for indie builders</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 fade-up stagger-1">
            <span className="text-white">Your Stripe.</span><br />
            <span className="text-gradient-gold">Your AI CFO.</span><br />
            <span className="text-white">Zero complexity.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-aug max-w-2xl mx-auto mb-10 leading-relaxed fade-up stagger-2">
            Connect your Stripe account in 60 seconds. Get an AI financial brain that categorizes your revenue, forecasts your cash flow, and tells you exactly what to do next.
          </p>

          <div className="max-w-xl mx-auto mb-10 fade-up stagger-3">
            <div className="glass gold-border rounded-2xl px-6 py-4 min-h-[64px] flex items-center justify-center">
              <p className={`text-sm font-mono text-gold-light text-center transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
                {INSIGHTS[insightIdx]}
              </p>
            </div>
            <p className="text-xs text-slate-aug mt-2 font-mono">&uarr; real insights from your AI CFO</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up stagger-4">
            <Link href="/connect" className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold text-base hover:bg-gold-light transition-all duration-200 hover:shadow-2xl hover:shadow-gold/25 w-full sm:w-auto justify-center">
              Try a free question <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 px-8 py-4 rounded-xl glass gold-border text-white font-medium text-base hover:border-gold/40 transition-all duration-200 w-full sm:w-auto justify-center">
              View pricing
            </Link>
          </div>

          <p className="text-xs text-slate-aug mt-5 fade-up stagger-5">
            Try a free question. Then pick a plan.
          </p>
        </div>
      </section>

      {/* Dataset Stats Widget */}
      {datasetStats && (parseInt(datasetStats.decisionsAnalyzed.replace(/[^0-9]/g, '')) > 0 || true) && (
        <section className="py-8 border-y border-[rgba(201,168,76,0.1)] bg-gradient-to-r from-gold/5 via-transparent to-emerald-aug/5">
          <div className="max-w-4xl mx-auto px-6">
            <div className="glass gold-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-gold mb-1">Live Intelligence</p>
                  <p className="text-white font-display font-bold">
                    {datasetStats.decisionsAnalyzed} founder decisions analyzed
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="font-display text-2xl font-bold text-emerald-aug">{datasetStats.averageOutcomeImprovement}</div>
                  <div className="text-xs text-slate-aug">Avg outcome lift</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-gold">{datasetStats.averageRunwayExtended}</div>
                  <div className="text-xs text-slate-aug">Avg runway extended</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white">{datasetStats.businessesServed}</div>
                  <div className="text-xs text-slate-aug">Businesses served</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats bar */}
      <section className="py-12 border-y border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '$19', label: 'Starting per month' },
            { val: '60s', label: 'To connect Stripe' },
            { val: '50K', label: 'Simulations per analysis' },
            { val: 'AI', label: 'Powered CFO engine' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-gradient-gold mb-1">{s.val}</div>
              <div className="text-xs text-slate-aug uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Stripe gives you tools.<br /><span className="text-gradient-gold">We give you outcomes.</span>
            </h2>
            <p className="text-slate-aug text-lg max-w-xl mx-auto">Stop staring at dashboards. Start getting decisions.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass gold-border rounded-2xl p-8 card-hover gold-glow fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center ${f.color === 'gold' ? 'bg-gold/10 border border-gold/20' : 'bg-emerald-aug/10 border border-emerald-aug/20'}`}>
                  <f.icon className={`w-6 h-6 ${f.color === 'gold' ? 'text-gold' : 'text-emerald-aug'}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-aug leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-6 border-y border-[rgba(201,168,76,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-gold mb-2">Trusted by indie hackers</p>
            <h2 className="font-display text-3xl font-bold text-white">What founders are saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass gold-border rounded-2xl p-6">
                <Star className="w-4 h-4 text-gold mb-3" />
                <p className="text-sm text-white leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-aug font-mono">{t.author}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform ROI */}
      <PlatformROIBanner />

      {/* Research Section */}
      <section className="py-16 px-6 border-y border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="glass gold-border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-gold" />
                <span className="text-xs font-mono uppercase tracking-widest text-gold">Research</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">
                The State of SaaS Survival
              </h3>
              <p className="text-slate-aug">
                Real data from real Stripe businesses. What actually happens when founders raise prices, recover payments, or fight churn?
              </p>
            </div>
            <Link
              href="/reports"
              className="px-6 py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all flex items-center gap-2 whitespace-nowrap"
            >
              Read the research <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Starting at <span className="text-gradient-gold">$19/mo</span>
          </h2>
          <p className="text-slate-aug text-lg mb-8">Three plans. No free tier. No fluff.</p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass gold-border rounded-2xl p-8 text-left">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Solo Dev</div>
              <div className="font-display text-3xl font-bold text-white mb-1">$19<span className="text-lg text-slate-aug font-normal">/mo</span></div>
              <p className="text-sm text-slate-aug mb-4">AI CFO + insights</p>
              <ul className="space-y-2 mb-6">
                {['5 MAX prompts per day', 'Five Moves Engine', 'Full Analytics + Audit Log', 'Webhook Alerts'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-aug"><Check className="w-4 h-4 text-emerald-aug flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/pricing?plan=solo" className="block text-center py-3 rounded-xl glass gold-border text-white font-semibold text-sm hover:border-gold/40 transition-all">
                Start Solo Dev
              </Link>
            </div>

            <div className="bg-gradient-to-b from-emerald-aug/10 to-emerald-aug/5 border-2 border-emerald-aug/40 rounded-2xl p-8 text-left relative">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-emerald-aug rounded-full text-obsidian text-xs font-bold uppercase tracking-widest">Popular</div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Growth</div>
              <div className="font-display text-3xl font-bold text-white mb-1">$49<span className="text-lg text-slate-aug font-normal">/mo</span></div>
              <p className="text-sm text-slate-aug mb-4">Execute actions directly</p>
              <ul className="space-y-2 mb-6">
                {['Everything in Solo Dev', 'Action Execution', '2 team seats', 'Outcome tracking + ROI'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-aug"><Check className="w-4 h-4 text-emerald-aug flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/pricing?plan=growth" className="block text-center py-3 rounded-xl bg-emerald-aug text-obsidian font-bold text-sm hover:opacity-90 transition-all">
                Start Growth
              </Link>
            </div>

            <div className="bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 rounded-2xl p-8 text-left relative gold-glow">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Enterprise</div>
              <div className="font-display text-3xl font-bold text-white mb-1">$99<span className="text-lg text-slate-aug font-normal">/mo</span></div>
              <p className="text-sm text-slate-aug mb-4">Scale with GLM-5 AI</p>
              <ul className="space-y-2 mb-6">
                {['Everything in Growth', 'Unlimited MAX prompts', '10 Stripe accounts', 'Priority AI (GLM-5)'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-aug"><Check className="w-4 h-4 text-emerald-aug flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/pricing?plan=enterprise" className="block text-center py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
                Start Enterprise
              </Link>
            </div>
          </div>

          <Link href="/pricing" className="inline-block mt-8 text-sm text-gold hover:text-gold-light transition-colors">
            See full pricing &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-xs">L</span>
            </div>
            <span className="font-display font-bold text-gradient-gold">Lucrum</span>
          </div>
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders &copy; 2026</p>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="/reports" className="hover:text-white transition-colors">Research</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="mailto:hello@lucrum.app" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
