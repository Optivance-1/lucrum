'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { useStripeData } from '@/hooks/useStripeData'
import { Plus, Save, SlidersHorizontal, Trash2, CheckCircle } from 'lucide-react'

type SettingsState = {
  taxRateOverride?: number
  payoutDelayDaysOverride?: number
}

const STORAGE_KEY = 'lucrum:dashboardSettings:v1'

export default function DashboardSettingsPage() {
  const { loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const [state, setState] = useState<SettingsState>({})
  const [saved, setSaved] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; label: string; active: boolean }[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  const loadAccounts = async () => {
    const res = await fetch('/api/stripe/accounts')
    const data = await res.json()
    setAccounts(data.accounts ?? [])
  }

  useEffect(() => {
    loadAccounts().catch(() => {})
  }, [])

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const subtitle = useMemo(() => {
    if (error) return <span className="text-crimson-aug">⚠ {error}</span>
    return 'Assumptions that control forecasts, runway, and tax estimate'
  }, [error])

  return (
    <DashboardShell
      title="Dashboard Settings"
      subtitle={subtitle}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
      headerAction={(
        <button
          onClick={save}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved' : 'Save'}
        </button>
      )}
    >
      <div className="glass gold-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">Assumptions</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Tax rate override</p>
            <p className="text-slate-aug text-sm mb-3">
              Optional. If set, UI will prefer this over heuristic brackets when showing tax estimates.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={state.taxRateOverride ?? ''}
                onChange={(e) => setState((s) => ({ ...s, taxRateOverride: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className="w-28 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
                placeholder="e.g. 28"
              />
              <span className="text-slate-aug text-sm">%</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Payout delay override</p>
            <p className="text-slate-aug text-sm mb-3">
              Optional. If Stripe payout schedule can’t be detected, use this for your “lands in bank” assumption.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={state.payoutDelayDaysOverride ?? ''}
                onChange={(e) => setState((s) => ({ ...s, payoutDelayDaysOverride: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className="w-28 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
                placeholder="e.g. 2"
              />
              <span className="text-slate-aug text-sm">days</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-aug mt-4">
          Stored locally in your browser. No server-side persistence yet.
        </p>
      </div>

      <div className="glass gold-border rounded-2xl p-6 mt-6">
        <h3 className="font-display text-base font-bold text-white mb-2">AI Runtime</h3>
        <p className="text-slate-aug text-sm">
          End-users do not need to provide Groq or Gemini keys. Lucrum uses server-managed providers and
          gracefully falls back to deterministic CFO logic if providers are unavailable.
        </p>
      </div>

      <div className="glass gold-border rounded-2xl p-6 mt-6">
        <h3 className="font-display text-base font-bold text-white mb-4">Stripe Accounts</h3>
        <p className="text-slate-aug text-sm mb-4">
          Add up to 3 Stripe accounts and switch instantly. Keys are stored only in an encrypted httpOnly cookie.
        </p>

        <div className="space-y-2 mb-6">
          {accounts.length === 0 ? (
            <p className="text-slate-aug text-sm">No saved accounts yet. Add one below.</p>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{a.label}</p>
                    {a.active && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-aug/10 border border-emerald-aug/20 text-emerald-aug flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-aug mt-1">{a.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy || a.active}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await fetch('/api/stripe/accounts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'switch', id: a.id }),
                        })
                        await loadAccounts()
                        window.location.href = '/dashboard'
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 disabled:opacity-40"
                  >
                    Switch
                  </button>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await fetch('/api/stripe/accounts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'remove', id: a.id }),
                        })
                        await loadAccounts()
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-crimson-aug/10 border border-crimson-aug/20 text-crimson-aug hover:bg-crimson-aug/15 disabled:opacity-40 flex items-center gap-2"
                    aria-label="Remove account"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Add account</p>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Lucrum Prod)"
              className="bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
            />
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="sk_live_... or sk_test_..."
              className="md:col-span-2 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 font-mono"
            />
          </div>
          <button
            disabled={busy || !newKey.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                const res = await fetch('/api/stripe/accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'add', label: newLabel, secretKey: newKey }),
                })
                const data = await res.json()
                if (data?.success) {
                  setNewKey('')
                  setNewLabel('')
                  await loadAccounts()
                  window.location.href = '/dashboard'
                }
              } finally {
                setBusy(false)
              }
            }}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add & Switch
          </button>
        </div>
      </div>
    </DashboardShell>
  )
}
