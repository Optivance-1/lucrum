'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { useStripeData } from '@/hooks/useStripeData'
import { useUserPlan } from '@/hooks/useUserPlan'
import { Plus, Save, SlidersHorizontal, Trash2, CheckCircle, Crown, Lock, CreditCard, Key, Bell } from 'lucide-react'

type SettingsState = {
  taxRateOverride?: number
  payoutDelayDaysOverride?: number
}

const STORAGE_KEY = 'lucrum:dashboardSettings:v1'

export default function DashboardSettingsPage() {
  const { loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const { plan, interval } = useUserPlan()
  const [state, setState] = useState<SettingsState>({})
  const [saved, setSaved] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; label: string; active: boolean }[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const loadAccounts = async () => {
    const res = await fetch('/api/stripe/accounts')
    const data = await res.json()
    setAccounts(data.accounts ?? [])
  }

  useEffect(() => { loadAccounts().catch(() => {}) }, [])

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const openPortal = useCallback(async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } finally {
      setPortalLoading(false)
    }
  }, [])

  const subtitle = useMemo(() => {
    if (error) return <span className="text-crimson-aug">{error}</span>
    return 'Manage your plan, billing, connected accounts, and preferences'
  }, [error])

  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'solo' ? 'Solo Dev' : 'Demo'
  const planColor = plan === 'enterprise' ? 'text-gold' : plan === 'solo' ? 'text-emerald-aug' : 'text-slate-aug'

  return (
    <DashboardShell
      title="Settings"
      subtitle={subtitle}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
      headerAction={
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
          <Save className="w-4 h-4" /> {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      {/* Plan & Billing */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">Plan & Billing</h3>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`font-display text-xl font-bold ${planColor}`}>{planLabel}</span>
              {interval && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {interval === 'year' ? 'Annual' : 'Monthly'}
                </span>
              )}
            </div>
            {plan === 'demo' && (
              <p className="text-sm text-slate-aug mt-1">You are on the demo plan. Upgrade to unlock all features.</p>
            )}
            {plan === 'solo' && (
              <p className="text-sm text-slate-aug mt-1">5 MAX prompts/day with all features. Upgrade to Enterprise for unlimited prompts and 10 Stripe accounts.</p>
            )}
            {plan === 'enterprise' && (
              <p className="text-sm text-slate-aug mt-1">Full access to all features including Action Execution and Priority AI.</p>
            )}
          </div>
          <div className="flex gap-3">
            {plan !== 'demo' && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="px-4 py-2 rounded-xl glass gold-border text-white font-semibold text-sm hover:border-gold/40 transition-all disabled:opacity-50"
              >
                {portalLoading ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
            {plan === 'demo' && (
              <Link href="/pricing" className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
                View Plans
              </Link>
            )}
            {plan === 'solo' && (
              <Link href="/pricing?plan=enterprise" className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all flex items-center gap-2">
                <Crown className="w-4 h-4" /> Upgrade to Enterprise
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Connected Stripe Accounts */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <h3 className="font-display text-base font-bold text-white mb-4">Connected Stripe Accounts</h3>
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
                  <button disabled={busy || a.active} onClick={async () => {
                    setBusy(true)
                    try {
                      await fetch('/api/stripe/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'switch', id: a.id }) })
                      await loadAccounts()
                      window.location.href = '/dashboard'
                    } finally { setBusy(false) }
                  }} className="px-3 py-2 rounded-xl text-sm font-semibold bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 disabled:opacity-40">Switch</button>
                  <button disabled={busy} onClick={async () => {
                    setBusy(true)
                    try {
                      await fetch('/api/stripe/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id: a.id }) })
                      await loadAccounts()
                    } finally { setBusy(false) }
                  }} className="px-3 py-2 rounded-xl text-sm font-semibold bg-crimson-aug/10 border border-crimson-aug/20 text-crimson-aug hover:bg-crimson-aug/15 disabled:opacity-40 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Add account</p>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Lucrum Prod)" className="bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40" />
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sk_live_... or sk_test_..." className="md:col-span-2 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 font-mono" />
          </div>
          <button disabled={busy || !newKey.trim()} onClick={async () => {
            setBusy(true)
            try {
              const res = await fetch('/api/stripe/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', label: newLabel, secretKey: newKey }) })
              const data = await res.json()
              if (data?.success) { setNewKey(''); setNewLabel(''); await loadAccounts(); window.location.href = '/dashboard' }
            } finally { setBusy(false) }
          }} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40">
            <Plus className="w-4 h-4" /> Add & Switch
          </button>
          {plan !== 'enterprise' && accounts.length >= 1 && (
            <p className="text-xs text-slate-aug mt-3 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Multi-account (up to 10) requires Enterprise plan.
            </p>
          )}
        </div>
      </div>

      {/* Team Members — Enterprise only */}
      <div className="glass gold-border rounded-2xl p-6 mb-6 relative">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display text-base font-bold text-white">Team Members</h3>
          {plan !== 'enterprise' && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center gap-1"><Lock className="w-3 h-3" /> Enterprise</span>
          )}
        </div>
        {plan === 'enterprise' ? (
          <div>
            <p className="text-slate-aug text-sm mb-3">Add team members who can access this Lucrum workspace (max 5).</p>
            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4 text-center text-sm text-slate-aug">
              Team member management coming soon.
            </div>
          </div>
        ) : (
          <div className="opacity-40 pointer-events-none">
            <p className="text-slate-aug text-sm">Up to 5 team members can share a single Lucrum workspace on Enterprise.</p>
            <Link href="/pricing?plan=enterprise" className="mt-3 inline-block text-sm text-gold">Upgrade to Enterprise</Link>
          </div>
        )}
      </div>

      {/* API Access — Enterprise only */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">API Access</h3>
          {plan !== 'enterprise' && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center gap-1"><Lock className="w-3 h-3" /> Enterprise</span>
          )}
        </div>
        {plan === 'enterprise' ? (
          <div>
            <p className="text-slate-aug text-sm mb-3">Use the Lucrum REST API to access metrics, insights, and actions programmatically.</p>
            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
              <p className="text-xs font-mono text-slate-aug mb-2">Rate limit: 1,000 requests/day</p>
              <p className="text-sm text-slate-aug">API key management coming soon.</p>
            </div>
          </div>
        ) : (
          <div className="opacity-40 pointer-events-none">
            <p className="text-slate-aug text-sm">REST API with bearer token authentication. 1,000 requests/day.</p>
            <Link href="/pricing?plan=enterprise" className="mt-3 inline-block text-sm text-gold">Upgrade to Enterprise</Link>
          </div>
        )}
      </div>

      {/* Assumptions */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">Assumptions</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Tax rate override</p>
            <p className="text-slate-aug text-sm mb-3">Optional override for tax estimate calculations.</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={60} step={0.5} value={state.taxRateOverride ?? ''} onChange={(e) => setState((s) => ({ ...s, taxRateOverride: e.target.value === '' ? undefined : Number(e.target.value) }))} className="w-28 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40" placeholder="e.g. 28" />
              <span className="text-slate-aug text-sm">%</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Payout delay override</p>
            <p className="text-slate-aug text-sm mb-3">Optional override for Stripe payout schedule assumption.</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={30} step={1} value={state.payoutDelayDaysOverride ?? ''} onChange={(e) => setState((s) => ({ ...s, payoutDelayDaysOverride: e.target.value === '' ? undefined : Number(e.target.value) }))} className="w-28 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40" placeholder="e.g. 2" />
              <span className="text-slate-aug text-sm">days</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-aug mt-4">Stored locally in your browser.</p>
      </div>
    </DashboardShell>
  )
}
