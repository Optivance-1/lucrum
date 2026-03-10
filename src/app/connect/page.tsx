'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Lock, Zap, Shield, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConnectPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [stripeKey, setStripeKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-up')
    }
  }, [isLoaded, router, userId])

  const handleConnect = async () => {
    if (!stripeKey.trim()) return
    if (!userId) {
      router.replace('/sign-up')
      return
    }
    setStatus('connecting')
    setErrorMessage('')
    
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: stripeKey }),
      })
      const data = await res.json()
      
      if (data.success) {
        setStatus('success')
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1500)
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Invalid key or connection failed. Please check and try again.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Connection failed. Please try again.')
    }
  }

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass gold-border rounded-2xl p-8 text-center max-w-md w-full">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Preparing account</p>
          <h1 className="font-display text-2xl font-bold text-white mb-2">Redirecting to sign up</h1>
          <p className="text-slate-aug text-sm">You need an account before connecting Stripe.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-slate-aug hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                <span className="text-obsidian font-display font-bold text-lg">L</span>
              </div>
              <span className="font-display font-bold text-2xl text-gradient-gold">Lucrum</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Connect your Stripe</h1>
            <p className="text-slate-aug text-sm">Your AI CFO will be ready in seconds.</p>
          </div>

          {status === 'success' ? (
            <div className="glass gold-border rounded-2xl p-8 text-center fade-up">
              <div className="w-16 h-16 rounded-full bg-emerald-aug/10 border border-emerald-aug/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-aug" />
              </div>
              <h2 className="font-display text-xl font-bold text-white mb-2">Connected!</h2>
              <p className="text-slate-aug text-sm">Taking you to your dashboard...</p>
            </div>
          ) : (
            <div className="glass gold-border rounded-2xl p-8 gold-glow fade-up">
              {/* Method: API Key */}
              <div className="mb-6">
                <label className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3 block">
                  Stripe Secret Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={stripeKey}
                    onChange={e => setStripeKey(e.target.value)}
                    placeholder="sk_live_... or sk_test_..."
                    className="w-full bg-obsidian-100 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-aug/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-aug/40" />
                </div>
                <p className="text-xs text-slate-aug/60 mt-2 font-mono">
                  Found in Stripe Dashboard → API Keys
                </p>
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-crimson-aug text-sm mb-4 p-3 rounded-lg bg-crimson-aug/10 border border-crimson-aug/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={!stripeKey || status === 'connecting'}
                className="w-full py-3.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-gold/25 flex items-center justify-center gap-2"
              >
                {status === 'connecting' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Connect Stripe
                  </>
                )}
              </button>

              {/* Trust signals */}
              <div className="mt-6 pt-6 border-t border-[rgba(201,168,76,0.1)] grid grid-cols-3 gap-4">
                {[
                  { icon: Lock, label: 'Encrypted' },
                  { icon: Shield, label: 'Read-only mode' },
                  { icon: CheckCircle, label: 'Never shared' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                    <Icon className="w-4 h-4 text-slate-aug/60" />
                    <span className="text-xs text-slate-aug/60 font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-aug/40 mt-6 font-mono leading-relaxed">
            We only request read access to your Stripe data.
            <br />
            Your key is stored only in an encrypted httpOnly session cookie.
          </p>
        </div>
      </div>
    </div>
  )
}
