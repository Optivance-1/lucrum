'use client'

import { useState, useCallback } from 'react'
import { X, AlertTriangle, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import type { ActionCard } from '@/types'

type ModalStep = 'configure' | 'preview' | 'confirm' | 'executing' | 'result'

const STEP_LABELS: Record<ModalStep, string> = {
  configure: 'Configure',
  preview: 'Preview',
  confirm: 'Confirm',
  executing: 'Executing',
  result: 'Result',
}
const STEPS: ModalStep[] = ['configure', 'preview', 'confirm', 'executing', 'result']

export default function ActionModal({
  card,
  onClose,
}: {
  card: ActionCard
  onClose: () => void
}) {
  const [step, setStep] = useState<ModalStep>('configure')
  const [params, setParams] = useState<Record<string, any>>(card.params)
  const [preview, setPreview] = useState<Record<string, any> | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPreview = useCallback(async () => {
    setStep('preview')
    try {
      const res = await fetch('/api/actions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: card.actionType, params }),
      })
      const data = await res.json()
      setPreview(data.preview ?? data)
    } catch (err: any) {
      setPreview({ error: err.message })
    }
  }, [card.actionType, params])

  const executeAction = useCallback(async () => {
    setStep('executing')
    setError(null)
    try {
      const res = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: card.actionType,
          params,
          userConfirmed: true,
          confirmText: card.requiresConfirmText ? confirmText : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || data.result?.error || 'Action failed')
      }
      setResult(data)
      setStep('result')
    } catch (err: any) {
      setError(err.message)
      setStep('result')
    }
  }, [card, params, confirmText])

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass gold-border rounded-2xl w-full max-w-lg mx-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-aug hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-lg font-bold text-white mb-1">{card.title}</h2>
        <p className="text-sm text-slate-aug mb-4">{card.context}</p>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                i <= stepIndex ? 'bg-gold text-obsidian' : 'bg-white/10 text-slate-aug'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs font-mono ${i === stepIndex ? 'text-white' : 'text-slate-aug/50'}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-aug/30" />}
            </div>
          ))}
        </div>

        {/* Configure */}
        {step === 'configure' && (
          <div>
            <p className="text-sm text-white mb-3">Action: <span className="text-gold">{card.actionType}</span></p>
            <p className="text-sm text-white mb-3">Estimated impact: <span className="text-emerald-aug">{card.estimatedImpact}</span></p>
            {card.affectedCustomerCount != null && (
              <p className="text-sm text-white mb-3">Affected customers: <span className="text-gold">{card.affectedCustomerCount}</span></p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={fetchPreview} className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
                Preview
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-xl glass gold-border text-white text-sm hover:border-gold/40 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <div>
            {preview ? (
              <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-xl p-4 overflow-auto max-h-48 mb-4">
                {JSON.stringify(preview, null, 2)}
              </pre>
            ) : (
              <div className="flex items-center gap-2 text-slate-aug text-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep('confirm')} className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
                Continue
              </button>
              <button onClick={() => setStep('configure')} className="px-4 py-2 rounded-xl glass gold-border text-white text-sm hover:border-gold/40 transition-all">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && (
          <div>
            {card.isDestructive && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">This is a destructive action. Type <strong>CONFIRM</strong> to proceed.</p>
              </div>
            )}
            {card.requiresConfirmText && (
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "CONFIRM"'
                className="w-full bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 transition-all mb-4"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={executeAction}
                disabled={card.requiresConfirmText && confirmText !== 'CONFIRM'}
                className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Execute
              </button>
              <button onClick={() => setStep('preview')} className="px-4 py-2 rounded-xl glass gold-border text-white text-sm hover:border-gold/40 transition-all">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Executing */}
        {step === 'executing' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
            <p className="text-sm text-white">Executing action...</p>
          </div>
        )}

        {/* Result */}
        {step === 'result' && (
          <div>
            {error ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-aug/10 border border-emerald-aug/30 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-aug">Action completed successfully.</p>
              </div>
            )}
            {result && (
              <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-xl p-4 overflow-auto max-h-48 mb-4">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
