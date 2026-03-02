'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, DollarSign, Users, TrendingUp, Brain,
  Settings, LogOut, RefreshCw, Wifi, WifiOff, Clock,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: BarChart2, label: 'Overview', href: '/dashboard' },
  { icon: DollarSign, label: 'Revenue', href: '/dashboard/revenue' },
  { icon: Users, label: 'Customers', href: '/dashboard/customers' },
  { icon: TrendingUp, label: 'Forecasts', href: '/dashboard/forecasts' },
  { icon: Brain, label: 'AI Insights', href: '/dashboard/insights' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
] as const

export default function DashboardShell({
  children,
  title,
  subtitle,
  headerAction,
  error,
  lastRefreshed,
  loading,
  onRefresh,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
  error: string | null
  lastRefreshed: Date | null
  loading: boolean
  onRefresh: () => Promise<void>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleDisconnect = async () => {
    try {
      await fetch('/api/stripe/disconnect', { method: 'POST' })
    } finally {
      router.push('/')
    }
  }

  const doRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 glass-strong border-r border-[rgba(201,168,76,0.1)] flex flex-col fixed h-full left-0 top-0 z-40">
        <div className="p-6 border-b border-[rgba(201,168,76,0.1)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === href
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-slate-aug hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 mx-4 mb-2 rounded-xl border border-[rgba(201,168,76,0.1)] bg-white/2">
          <div className="flex items-center gap-2">
            {error ? <WifiOff className="w-3 h-3 text-crimson-aug" /> : <Wifi className="w-3 h-3 text-emerald-aug" />}
            <span className="text-xs font-mono text-slate-aug">{error ? 'Disconnected' : 'Stripe connected'}</span>
          </div>
          {lastRefreshed && !error && (
            <p className="text-xs text-slate-aug/50 font-mono mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(Math.floor(lastRefreshed.getTime() / 1000))}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[rgba(201,168,76,0.1)] space-y-1">
          <button
            type="button"
            onClick={handleDisconnect}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-aug hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />Disconnect
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8 min-h-screen">
        {(title || headerAction) && (
          <div className="flex items-center justify-between mb-8">
            <div>
              {title && <h1 className="font-display text-2xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="text-slate-aug text-sm mt-1">{subtitle}</p>}
            </div>
            {headerAction ?? (
              <button
                onClick={doRefresh}
                disabled={loading || refreshing}
                className="flex items-center gap-2 px-4 py-2 glass gold-border rounded-xl text-sm text-slate-aug hover:text-white transition-all hover:border-gold/40 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
                Sync Stripe
              </button>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
