'use client'

import { Suspense, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Check, X, Star, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_LUCRUM_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_LUCRUM_STRIPE_PUBLISHABLE_KEY)
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

const PLANS = {
  solo: {
    name: 'Solo Dev',
    monthly: 19,
    annual: 190,
    desc: 'For indie hackers and solo founders',
    features: [
      { text: '5 MAX prompts per day', included: true },
      { text: 'Five Moves Engine', included: true },
      { text: 'Full Analytics Dashboard', included: true },
      { text: 'Metric History + Audit Log', included: true },
      { text: 'Webhook Alerts', included: true },
      { text: '1 Stripe account', included: true },
      { text: 'Action Execution', included: false },
      { text: 'Team seats', included: false },
    ],
  },
  growth: {
    name: 'Growth',
    monthly: 49,
    annual: 490,
    desc: 'For founders ready to execute',
    features: [
      { text: 'Everything in Solo Dev', included: true },
      { text: 'Action Execution (Stripe writes)', included: true },
      { text: '2 team seats', included: true },
      { text: '1 Stripe account', included: true },
      { text: 'Outcome tracking + ROI dashboard', included: true },
      { text: 'Multi-account (10x)', included: false },
      { text: 'Priority AI (GLM-5)', included: false },
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 99,
    annual: 990,
    desc: 'For growing SaaS teams who need scale',
    features: [
      { text: 'Everything in Growth', included: true },
      { text: 'Unlimited MAX prompts', included: true },
      { text: 'Connect up to 10 Stripe accounts', included: true },
      { text: 'Priority AI (GLM-5)', included: true },
      { text: '5 team seats', included: true },
      { text: 'API access + White-label', included: true },
    ],
  },
}

const FAQ = [
  { q: 'Can I switch plans?', a: 'Yes. Upgrade or downgrade anytime from your dashboard.' },
  { q: 'What happens to my data if I cancel?', a: 'Your metric history is retained for 90 days.' },
  { q: 'Do you store my Stripe secret key?', a: 'It\'s AES-256-GCM encrypted and never logged or shared.' },
  { q: 'What is Action Execution?', a: 'Growth and Enterprise plans include Action Execution — fire Stripe actions (emails, coupons, subscription changes, payouts) directly from Lucrum without opening Stripe dashboard.' },
  { q: 'What counts as a MAX prompt?', a: 'Each question you ask the AI CFO counts as one prompt. Solo Dev and Growth get 5 per day. Enterprise gets unlimited.' },
  { q: 'What is GLM-5 Priority AI?', a: 'Enterprise users get access to GLM-5, a 744B parameter model, for deeper financial reasoning. Other plans use fast, high-quality open models.' },
]

function getPriceId(plan: 'solo' | 'growth' | 'enterprise', annual = false): string {
  if (plan === 'solo') {
    return annual
      ? (process.env.NEXT_PUBLIC_LUCRUM_SOLO_ANNUAL_PRICE_ID ?? '')
      : (process.env.NEXT_PUBLIC_LUCRUM_SOLO_MONTHLY_PRICE_ID ?? '')
  }
  if (plan === 'growth') {
    return annual
      ? (process.env.NEXT_PUBLIC_LUCRUM_GROWTH_ANNUAL_PRICE_ID ?? '')
      : (process.env.NEXT_PUBLIC_LUCRUM_GROWTH_MONTHLY_PRICE_ID ?? '')
  }
  return annual
    ? (process.env.NEXT_PUBLIC_LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID ?? '')
    : (process.env.NEXT_PUBLIC_LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID ?? '')
}

export default function PricingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <PricingPage />
    </Suspense>
  )
}

function PricingPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hintPlan = searchParams.get('plan') as 'solo' | 'growth' | 'enterprise' | null

  const [checkoutPlan, setCheckoutPlan] = useState<'solo' | 'growth' | 'enterprise' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [annual, setAnnual] = useState(false)

  const startCheckout = useCallback(async (plan: 'solo' | 'growth' | 'enterprise') => {
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=/pricing?plan=${plan}`)
      return
    }
    setCheckoutError(null)
    setCheckoutPlan(plan)
  }, [isSignedIn, router])

  const fetchClientSecret = useCallback(async () => {
    if (!checkoutPlan) return ''
    const priceId = getPriceId(checkoutPlan, annual)
    if (!priceId) {
      setCheckoutError('Billing is not configured yet. Price IDs missing.')
      setCheckoutPlan(null)
      return ''
    }
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const data = await res.json()
    if (!res.ok || !data.clientSecret) {
      setCheckoutError(data?.error ?? 'Could not start checkout. Try again.')
      setCheckoutPlan(null)
      return ''
    }
    return data.clientSecret
  }, [checkoutPlan, annual])

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
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            {isSignedIn && (
              <Link href="/dashboard" className="text-sm text-slate-aug hover:text-white transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-8 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 relative">
          Stop guessing. Start growing.
        </h1>
        <p className="text-slate-aug text-lg mb-6 relative">Three plans. No free tier. No fluff.</p>
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? 'text-white font-semibold' : 'text-slate-aug'}`}>Monthly</span>
          <button onClick={() => setAnnual(!annual)} className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-gold' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-white font-semibold' : 'text-slate-aug'}`}>Annual <span className="text-emerald-aug text-xs font-mono">save 2 mo</span></span>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {/* Solo Dev */}
          <div className={`rounded-2xl p-8 card-hover glass gold-border ${hintPlan === 'solo' ? 'ring-2 ring-gold/50' : ''}`}>
            <div className="mb-6">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Solo Dev</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-white">${annual ? Math.round(PLANS.solo.annual / 12) : PLANS.solo.monthly}</span>
                <span className="text-slate-aug text-sm">/mo</span>
              </div>
              {annual && <p className="text-xs text-emerald-aug font-mono mt-1">${PLANS.solo.annual}/yr — save $38</p>}
              <p className="text-slate-aug text-sm mt-2">{PLANS.solo.desc}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PLANS.solo.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm">
                  {f.included
                    ? <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-slate-aug/30 flex-shrink-0 mt-0.5" />}
                  <span className={f.included ? 'text-slate-aug' : 'text-slate-aug/30'}>{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout('solo')}
              className="w-full text-center py-3 rounded-xl font-semibold text-sm glass gold-border text-white hover:border-gold/40 transition-all"
            >
              Start Solo Dev
            </button>
          </div>

          {/* Growth */}
          <div className={`rounded-2xl p-8 card-hover relative bg-gradient-to-b from-emerald-aug/10 to-emerald-aug/5 border-2 border-emerald-aug/40 ${hintPlan === 'growth' || !hintPlan ? 'ring-2 ring-emerald-aug/50' : ''}`}>
            <div className="absolute -top-3 right-6 px-3 py-1 bg-emerald-aug rounded-full text-obsidian text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Star className="w-3 h-3" /> Most Popular
            </div>
            <div className="mb-6">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Growth</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-white">${annual ? Math.round(PLANS.growth.annual / 12) : PLANS.growth.monthly}</span>
                <span className="text-slate-aug text-sm">/mo</span>
              </div>
              {annual && <p className="text-xs text-emerald-aug font-mono mt-1">${PLANS.growth.annual}/yr — save $98</p>}
              <p className="text-slate-aug text-sm mt-2">{PLANS.growth.desc}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PLANS.growth.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm">
                  {f.included
                    ? <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-slate-aug/30 flex-shrink-0 mt-0.5" />}
                  <span className={f.included ? 'text-slate-aug' : 'text-slate-aug/30'}>{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout('growth')}
              className="w-full text-center py-3 rounded-xl font-semibold text-sm bg-emerald-aug text-obsidian hover:opacity-90 hover:shadow-lg hover:shadow-emerald-aug/25 transition-all"
            >
              Start Growth
            </button>
          </div>

          {/* Enterprise */}
          <div className={`rounded-2xl p-8 card-hover relative bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 gold-glow ${hintPlan === 'enterprise' ? 'ring-2 ring-gold/60' : ''}`}>
            <div className="mb-6">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-white">${annual ? Math.round(PLANS.enterprise.annual / 12) : PLANS.enterprise.monthly}</span>
                <span className="text-slate-aug text-sm">/mo</span>
              </div>
              {annual && <p className="text-xs text-emerald-aug font-mono mt-1">${PLANS.enterprise.annual}/yr — save $198</p>}
              <p className="text-slate-aug text-sm mt-2">{PLANS.enterprise.desc}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PLANS.enterprise.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                  <span className="text-slate-aug">{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout('enterprise')}
              className="w-full text-center py-3 rounded-xl font-semibold text-sm bg-gold text-obsidian hover:bg-gold-light hover:shadow-lg hover:shadow-gold/25 transition-all"
            >
              Start Enterprise
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="max-w-5xl mx-auto text-center mt-8 space-y-1">
          <p className="text-xs text-slate-aug">All plans include a 14-day money-back guarantee.</p>
          <p className="text-xs text-slate-aug">Cancel anytime. No questions asked.</p>
          <p className="text-xs text-slate-aug">Stripe data is read-only until you authorize actions.</p>
        </div>
      </section>

      {/* Embedded checkout */}
      {checkoutPlan && stripePromise && (
        <section className="px-6 pb-16">
          <div className="max-w-2xl mx-auto glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-mono uppercase tracking-widest text-gold">
                Checkout — {checkoutPlan === 'solo' ? 'Solo Dev' : checkoutPlan === 'growth' ? 'Growth' : 'Enterprise'} ({annual ? 'Annual' : 'Monthly'})
              </p>
              <button onClick={() => setCheckoutPlan(null)} className="text-xs text-slate-aug hover:text-white">
                Cancel
              </button>
            </div>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </section>
      )}

      {checkoutError && (
        <section className="px-6 pb-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-crimson-aug text-sm font-mono">{checkoutError}</p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, idx) => (
              <div key={idx} className="glass gold-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  {faqOpen === idx ? <ChevronUp className="w-4 h-4 text-slate-aug" /> : <ChevronDown className="w-4 h-4 text-slate-aug" />}
                </button>
                {faqOpen === idx && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-aug">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-xs">L</span>
            </div>
            <span className="font-display font-bold text-gradient-gold">Lucrum</span>
          </div>
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders</p>
        </div>
      </footer>
    </div>
  )
}
