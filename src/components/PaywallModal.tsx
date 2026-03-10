'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Zap, Crown } from 'lucide-react'

interface PaywallModalProps {
  isOpen: boolean
  onClose?: () => void
  trigger: 'demo_exhausted' | 'feature_locked' | 'manual'
  lockedFeature?: string
  requiredPlan?: 'solo' | 'enterprise'
  lastMaxAnswer?: string
}

export default function PaywallModal({
  isOpen,
  onClose,
  trigger,
  lockedFeature,
  requiredPlan = 'solo',
  lastMaxAnswer,
}: PaywallModalProps) {
  const router = useRouter()
  const canDismiss = trigger !== 'demo_exhausted'

  useEffect(() => {
    if (!isOpen) return
    if (!canDismiss) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, canDismiss, onClose])

  const handleBackdropClick = useCallback(() => {
    if (canDismiss) onClose?.()
  }, [canDismiss, onClose])

  if (!isOpen) return null

  const goToPricing = (plan: 'solo' | 'enterprise') => {
    router.push(`/pricing?plan=${plan}`)
  }

  if (trigger === 'demo_exhausted') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/90 backdrop-blur-sm" />
        <div className="relative max-w-lg w-full rounded-2xl glass border-2 border-gold/50 p-8 animate-pulse-border">
          <style jsx>{`
            @keyframes pulse-border {
              0%, 100% { border-color: rgba(201, 168, 76, 0.5); }
              50% { border-color: rgba(201, 168, 76, 0.9); }
            }
            .animate-pulse-border {
              animation: pulse-border 2s ease-in-out infinite;
            }
          `}</style>

          <h2 className="font-display text-2xl font-bold text-white mb-2">
            You just met MAX.
          </h2>
          <p className="text-slate-aug text-sm mb-5 leading-relaxed">
            That&apos;s one question and MAX already knows more about your business
            than most founders do after a month of spreadsheets.
          </p>

          {lastMaxAnswer && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 mb-6">
              <p className="text-xs font-mono uppercase tracking-widest text-gold/60 mb-2">MAX said:</p>
              <p className="text-sm text-white italic leading-relaxed line-clamp-4">
                &ldquo;{lastMaxAnswer}&rdquo;
              </p>
            </div>
          )}

          <p className="text-sm text-white mb-5 font-semibold">
            To keep talking to MAX, pick a plan:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => goToPricing('solo')}
              className="rounded-xl glass gold-border p-4 text-left hover:border-gold/50 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-gold" />
                <span className="text-xs font-mono uppercase tracking-widest text-gold">Solo Dev</span>
              </div>
              <p className="font-display text-xl font-bold text-white">$12<span className="text-sm font-normal text-slate-aug">/mo</span></p>
              <p className="text-xs text-slate-aug mt-1">5 prompts/day + all features</p>
              <span className="mt-3 inline-block text-xs font-semibold text-gold group-hover:text-gold-light transition-colors">
                Start &rarr;
              </span>
            </button>

            <button
              onClick={() => goToPricing('enterprise')}
              className="rounded-xl bg-gradient-to-b from-gold/15 to-gold/5 border-2 border-gold/40 p-4 text-left hover:border-gold/60 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-gold" />
                <span className="text-xs font-mono uppercase tracking-widest text-gold">Enterprise</span>
              </div>
              <p className="font-display text-xl font-bold text-white">$99<span className="text-sm font-normal text-slate-aug">/mo</span></p>
              <p className="text-xs text-slate-aug mt-1">Unlimited + 10 accounts</p>
              <span className="mt-3 inline-block text-xs font-semibold text-gold group-hover:text-gold-light transition-colors">
                Start &rarr;
              </span>
            </button>
          </div>

          <p className="text-xs text-slate-aug text-center">
            14-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    )
  }

  // Feature locked variant
  const planLabel = requiredPlan === 'enterprise' ? 'Enterprise' : 'Solo Dev'
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={handleBackdropClick} />
      <div className="relative max-w-md w-full rounded-2xl glass gold-border p-6">
        {canDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-aug hover:text-white transition-colors text-lg"
          >
            &times;
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              {requiredPlan === 'enterprise' ? 'Enterprise feature' : 'Paid feature'}
            </h3>
            {lockedFeature && (
              <p className="text-gold text-sm font-semibold">{lockedFeature}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-aug mb-6 leading-relaxed">
          {requiredPlan === 'enterprise'
            ? 'Unlimited MAX prompts, multi-account (10 Stripe accounts), team seats, and priority AI are available on the Enterprise plan.'
            : 'This feature requires a Solo Dev or Enterprise subscription to unlock.'}
        </p>

        <button
          onClick={() => goToPricing(requiredPlan)}
          className="w-full py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all"
        >
          Upgrade to {planLabel}
        </button>
        <p className="text-xs text-slate-aug text-center mt-3">
          14-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
