'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Brain, TrendingUp, Shield, ChevronRight, Check } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Connect in 60 seconds',
    desc: 'Plug in your Stripe account. No forms. No jargon. No finance degree required.',
    color: 'gold',
  },
  {
    icon: Brain,
    title: 'AI CFO on demand',
    desc: 'Your revenue, categorized. Your cash flow, predicted. Your taxes, estimated — automatically.',
    color: 'emerald',
  },
  {
    icon: TrendingUp,
    title: 'Growth intelligence',
    desc: '"Raise your price 12%." "Offer annual plans now." Real decisions, not dashboards.',
    color: 'gold',
  },
  {
    icon: Shield,
    title: 'Built for AI builders',
    desc: 'Solo founders. Micro-SaaS. Indie hackers. We understand how you actually build.',
    color: 'emerald',
  },
]

const INSIGHTS = [
  '"You will run out of runway in 47 days at current burn."',
  '"Raise your starter plan price by 15% — churn risk is low."',
  '"3 customers are likely to cancel this month. Offer them a discount."',
  '"Annual plan conversion is 2× higher on Tuesdays. Send the email."',
  '"Your MRR growth is outpacing costs by 34%. Good time to hire."',
]

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '/forever',
    desc: 'Up to $25K/mo Stripe volume.',
    features: [
      'Connect 1 Stripe account',
      'Revenue Reality Dashboard',
      'Basic Churn Tracker',
      'Monthly AI Digest',
      'CSV Export',
    ],
    cta: 'Get free access',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$0',
    period: '/forever',
    desc: '$25K–$150K/mo Stripe volume.',
    features: [
      'All Starter features',
      'Revenue Leakage Finder',
      'Cash Flow Command Center',
      'Weekly AI Digest',
      'QuickBooks Sync',
    ],
    cta: 'Get free access',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$0',
    period: '/forever',
    desc: '$150K–$500K/mo Stripe volume.',
    features: [
      'All Growth features',
      'Real-time Alerts',
      'Slack Integration',
      'Cohort Retention Grid',
      'Tax Export',
    ],
    cta: 'Get free access',
    highlight: false,
  },
  {
    name: 'Scale',
    price: '$0',
    period: '/forever',
    desc: '$500K+/mo Stripe volume.',
    features: [
      'All Pro features',
      'API Access',
      'White-label Reports',
      'Priority Support',
      'Dedicated Onboarding',
    ],
    cta: 'Get free access',
    highlight: false,
  },
]

export default function HomePage() {
  const [insightIdx, setInsightIdx] = useState(0)
  const [visible, setVisible] = useState(true)

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
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-slate-aug hover:text-white transition-colors hidden md:block">
              Sign in
            </Link>
            <Link
              href="/connect"
              className="px-4 py-2 rounded-lg bg-gold text-obsidian font-semibold text-sm hover:bg-gold-light transition-all duration-200 hover:shadow-lg hover:shadow-gold/20"
            >
              Connect Stripe
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-aug/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
            <span className="text-xs text-slate-aug font-mono uppercase tracking-widest">AI CFO for indie builders</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 fade-up stagger-1">
            <span className="text-white">Your Stripe.</span>
            <br />
            <span className="text-gradient-gold">Your AI CFO.</span>
            <br />
            <span className="text-white">Zero complexity.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-aug max-w-2xl mx-auto mb-10 leading-relaxed fade-up stagger-2">
            Connect your Stripe account in 60 seconds. Get an AI financial brain that categorizes your revenue, forecasts your cash flow, and tells you exactly what to do next.
          </p>

          {/* Rotating insights */}
          <div className="max-w-xl mx-auto mb-10 fade-up stagger-3">
            <div className="glass gold-border rounded-2xl px-6 py-4 min-h-[64px] flex items-center justify-center">
              <p
                className={`text-sm font-mono text-gold-light text-center transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transition: 'opacity 0.4s ease, transform 0.4s ease' }}
              >
                {INSIGHTS[insightIdx]}
              </p>
            </div>
            <p className="text-xs text-slate-aug mt-2 font-mono">↑ real insights from your AI CFO</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up stagger-4">
            <Link
              href="/connect"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold text-base hover:bg-gold-light transition-all duration-200 hover:shadow-2xl hover:shadow-gold/25 w-full sm:w-auto justify-center"
            >
              Connect Stripe — Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-8 py-4 rounded-xl glass gold-border text-white font-medium text-base hover:border-gold/40 transition-all duration-200 w-full sm:w-auto justify-center"
            >
              View demo dashboard
            </Link>
          </div>

          <p className="text-xs text-slate-aug mt-5 fade-up stagger-5">
            Free forever plan. No credit card. Takes 60 seconds.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '$0', label: 'Processing fees from us' },
            { val: '60s', label: 'To connect Stripe' },
            { val: 'AI', label: 'Powered CFO engine' },
            { val: '∞', label: 'Insights on your data' },
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
              Stripe gives you tools.
              <br />
              <span className="text-gradient-gold">We give you outcomes.</span>
            </h2>
            <p className="text-slate-aug text-lg max-w-xl mx-auto">
              Stop staring at dashboards. Start getting decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass gold-border rounded-2xl p-8 card-hover gold-glow fade-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center ${
                  f.color === 'gold' 
                    ? 'bg-gold/10 border border-gold/20' 
                    : 'bg-emerald-aug/10 border border-emerald-aug/20'
                }`}>
                  <f.icon className={`w-6 h-6 ${f.color === 'gold' ? 'text-gold' : 'text-emerald-aug'}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-aug leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-y border-[rgba(201,168,76,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">Three steps to your AI CFO</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Stripe', desc: 'Click connect, authorize with Stripe OAuth. That\'s literally it. We pull your historical data automatically.' },
              { step: '02', title: 'AI analyzes everything', desc: 'Our engine categorizes every transaction, maps your revenue patterns, and builds your financial model.' },
              { step: '03', title: 'Get your briefing', desc: 'Wake up to a daily AI CFO briefing. Cash position, risks, opportunities — all in plain English.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="font-mono text-5xl font-bold text-gold/10 mb-4 leading-none">{s.step}</div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-slate-aug leading-relaxed text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Free for every builder.
              <br />
              <span className="text-gradient-gold">No paid plan required.</span>
            </h2>
            <p className="text-slate-aug text-sm font-mono uppercase tracking-widest">
              During beta, every plan is $0 forever
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 card-hover relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 gold-glow'
                    : 'glass gold-border'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold rounded-full text-obsidian text-xs font-bold uppercase tracking-widest">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-slate-aug text-sm font-mono uppercase tracking-widest mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-aug text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-aug text-sm mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                      <span className="text-slate-aug">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/connect"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-gold text-obsidian hover:bg-gold-light hover:shadow-lg hover:shadow-gold/25'
                      : 'glass gold-border text-white hover:border-gold/40'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
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
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders © 2026</p>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="mailto:hello@lucrum.app" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
