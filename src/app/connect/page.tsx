'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Shield, Building2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

const STRIPE_LOGO = (
  <svg viewBox="0 0 60 25" className="h-6 w-auto" fill="currentColor">
    <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.73c-1.1 0-1.85.82-2.01 2.19h4.06c-.12-1.34-.79-2.19-2.05-2.19zM41.95 19.5h-4.12V5.57h4.12V19.5zM32.73 5.57l-.1 1.55a4.62 4.62 0 0 0-3.83-1.8c-3.47 0-6.3 3.22-6.3 7.5s2.75 7.5 6.3 7.5c1.5 0 2.83-.52 3.78-1.67v1.35h4.12V5.57h-3.97zm-3.34 10.95c-1.86 0-3.05-1.47-3.05-3.7 0-2.24 1.19-3.7 3.05-3.7s3.04 1.5 3.04 3.7c0 2.23-1.18 3.7-3.04 3.7zM16.8 5.57V3.24l-4.18.72v1.61h-2.01v3.28h2.01v5.28c0 3.87 1.73 5.37 6.18 4.78v-3.36c-1.65.08-2-.36-2-1.73V8.85h2V5.57h-2zm-9.01 0l-.06.88a3.56 3.56 0 0 0-3.2-1.13c-3.1 0-4.5 2.28-4.5 5.3v8.88h4.12v-8.1c0-1.4.67-2.23 1.83-2.23 1.02 0 1.68.7 1.68 1.93v8.4h4.17V9.03c0-2.15-1.66-3.76-4.04-3.76v.3z" />
  </svg>
)

function ConnectPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded, userId } = useAuth()
  const [connecting, setConnecting] = useState(false)
  const error = searchParams.get('error')

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-up?redirect_url=/connect')
    }
  }, [isLoaded, router, userId])

  const handleConnect = () => {
    setConnecting(true)
    window.location.href = '/api/stripe/connect'
  }

  const errorMessages: Record<string, string> = {
    denied: 'You declined the Stripe authorization. Try again when ready.',
    expired: 'Session expired. Please try connecting again.',
    invalid: 'Invalid request. Please try again.',
    token_exchange_failed: 'Connection failed. Please try again.',
  }

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass gold-border rounded-2xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Preparing</p>
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
            <h1 className="font-display text-3xl font-bold text-white mb-2">Connect your Stripe account</h1>
            <p className="text-slate-aug text-sm">
              Lucrum never sees your secret key.<br />
              You authorize on Stripe&apos;s own website.
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-crimson-aug/10 border border-crimson-aug/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-crimson-aug flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-crimson-aug font-semibold text-sm">Connection failed</p>
                <p className="text-crimson-aug/80 text-sm mt-1">
                  {errorMessages[error] || 'Something went wrong. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Main card */}
          <div className="glass gold-border rounded-2xl p-8 gold-glow fade-up">
            {/* Trust signals */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-aug/10 border border-emerald-aug/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-emerald-aug" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Read-only access by default</h3>
                  <p className="text-slate-aug text-sm mt-0.5">
                    We request only the permissions we need. Action execution requires explicit upgrade.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-[#635BFF]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Authorized on stripe.com</h3>
                  <p className="text-slate-aug text-sm mt-0.5">
                    You approve access on Stripe&apos;s own domain, not on our website.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-crimson-aug/10 border border-crimson-aug/20 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-crimson-aug" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Disconnect anytime</h3>
                  <p className="text-slate-aug text-sm mt-0.5">
                    One click removes all access permanently. Also revokable from Stripe Dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Connect button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-4 rounded-xl bg-[#635BFF] text-white font-bold text-base hover:bg-[#5851ea] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-[#635BFF]/25"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  {STRIPE_LOGO}
                  Connect with Stripe
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-aug/60 mt-4">
              This opens stripe.com to authorize access
            </p>
          </div>

          {/* Demo mode bypass */}
          <div className="mt-6 text-center">
            <Link 
              href="/dashboard?demo=true" 
              className="text-sm text-slate-aug hover:text-white transition-colors"
            >
              Or try with demo data →
            </Link>
          </div>

          {/* Bottom text */}
          <p className="text-center text-xs text-slate-aug/40 mt-6 font-mono leading-relaxed">
            Lucrum uses Stripe Connect OAuth.<br />
            Your secret key never touches our servers.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass gold-border rounded-2xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug">Loading...</p>
        </div>
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  )
}
