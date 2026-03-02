'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Zap,
  Brain, AlertTriangle, CheckCircle, ArrowUpRight,
  BarChart2, Settings, LogOut, RefreshCw, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

// --- Mock data (replaced by real Stripe data in production) ---
const MRR_DATA = [
  { month: 'Aug', mrr: 1200 },
  { month: 'Sep', mrr: 1800 },
  { month: 'Oct', mrr: 2400 },
  { month: 'Nov', mrr: 2200 },
  { month: 'Dec', mrr: 3100 },
  { month: 'Jan', mrr: 3800 },
  { month: 'Feb', mrr: 4600 },
]

const REVENUE_DATA = [
  { day: 'Mon', revenue: 340 },
  { day: 'Tue', revenue: 520 },
  { day: 'Wed', revenue: 290 },
  { day: 'Thu', revenue: 680 },
  { day: 'Fri', revenue: 750 },
  { day: 'Sat', revenue: 410 },
  { day: 'Sun', revenue: 380 },
]

const AI_INSIGHTS = [
  {
    type: 'warning',
    title: 'Cash runway alert',
    body: 'At current burn, you have ~47 days of runway. Consider raising prices or reducing spend.',
    action: 'View cash flow',
    priority: 'high',
  },
  {
    type: 'opportunity',
    title: 'Pricing opportunity',
    body: 'Your Starter plan has a 94% retention rate — strong signal to raise price by 15% without churn risk.',
    action: 'See analysis',
    priority: 'medium',
  },
  {
    type: 'risk',
    title: '3 customers likely to churn',
    body: 'Usage patterns suggest 3 accounts haven\'t logged in for 21+ days. Reach out now.',
    action: 'View customers',
    priority: 'medium',
  },
  {
    type: 'win',
    title: 'MRR milestone incoming',
    body: 'You\'re on track to hit $5,000 MRR by March at current growth velocity.',
    action: 'View forecast',
    priority: 'low',
  },
]

const RECENT_EVENTS = [
  { id: 1, type: 'payment', desc: 'New subscription — Growth plan', amount: '+$29.00', time: '2m ago', positive: true },
  { id: 2, type: 'payment', desc: 'Renewal — Seed plan', amount: '+$0.00', time: '14m ago', positive: true },
  { id: 3, type: 'churn', desc: 'Cancellation — Growth plan', amount: '-$29.00', time: '1h ago', positive: false },
  { id: 4, type: 'payment', desc: 'New subscription — Scale plan', amount: '+$99.00', time: '3h ago', positive: true },
  { id: 5, type: 'payment', desc: 'Renewal — Growth plan', amount: '+$29.00', time: '5h ago', positive: true },
]

type InsightType = 'warning' | 'opportunity' | 'risk' | 'win'

const INSIGHT_STYLES: Record<InsightType, { border: string; bg: string; icon: React.ElementType; iconColor: string }> = {
  warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', icon: AlertTriangle, iconColor: 'text-yellow-400' },
  opportunity: { border: 'border-gold/30', bg: 'bg-gold/5', icon: TrendingUp, iconColor: 'text-gold' },
  risk: { border: 'border-crimson-aug/30', bg: 'bg-crimson-aug/5', icon: AlertTriangle, iconColor: 'text-crimson-aug' },
  win: { border: 'border-emerald-aug/30', bg: 'bg-emerald-aug/5', icon: CheckCircle, iconColor: 'text-emerald-aug' },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass gold-border rounded-xl px-4 py-3 text-sm">
        <p className="text-slate-aug font-mono text-xs mb-1">{label}</p>
        <p className="text-white font-bold">${payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const askAI = async (question: string) => {
    if (!question.trim()) return
    setAiLoading(true)
    setAiResponse('')
    try {
      const res = await fetch('/api/ai/cfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            mrr: 4600,
            mrrGrowth: 21,
            revenue: 4600,
            customers: 47,
            churnRate: 2.1,
            runway: 47,
          },
        }),
      })
      const data = await res.json()
      setAiResponse(data.answer || 'Unable to get insight right now.')
    } catch {
      setAiResponse('Unable to connect to AI CFO. Please check your API key.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 1200))
    setRefreshing(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-strong border-r border-[rgba(201,168,76,0.1)] flex flex-col fixed h-full left-0 top-0 z-40">
        <div className="p-6 border-b border-[rgba(201,168,76,0.1)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold">A</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: BarChart2, label: 'Overview', href: '/dashboard', active: true },
            { icon: DollarSign, label: 'Revenue', href: '/dashboard/revenue', active: false },
            { icon: Users, label: 'Customers', href: '/dashboard/customers', active: false },
            { icon: TrendingUp, label: 'Forecasts', href: '/dashboard/forecasts', active: false },
            { icon: Brain, label: 'AI Insights', href: '/dashboard/insights', active: false },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-slate-aug hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[rgba(201,168,76,0.1)] space-y-1">
          <Link href="/connect" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-aug hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-aug hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" />
            Disconnect
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Good morning. ☀️</h1>
            <p className="text-slate-aug text-sm mt-1">Here's your financial briefing for today.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 glass gold-border rounded-xl text-sm text-slate-aug hover:text-white transition-all hover:border-gold/40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sync Stripe
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'MRR', value: '$4,600', change: '+21%', positive: true, icon: DollarSign },
            { label: 'Active Customers', value: '47', change: '+3', positive: true, icon: Users },
            { label: 'Churn Rate', value: '2.1%', change: '-0.3%', positive: true, icon: TrendingDown },
            { label: 'Cash Runway', value: '47 days', change: '-5', positive: false, icon: Zap },
          ].map(({ label, value, change, positive, icon: Icon }, i) => (
            <div
              key={label}
              className={`glass gold-border rounded-2xl p-5 card-hover fade-up`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gold" />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-white mb-1">{value}</div>
              <div className={`flex items-center gap-1 text-xs font-mono ${positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change} this month
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* MRR Chart */}
          <div className="glass gold-border rounded-2xl p-6 fade-up stagger-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">MRR Growth</h3>
                <p className="text-slate-aug text-xs font-mono">Monthly recurring revenue</p>
              </div>
              <span className="text-emerald-aug text-sm font-mono font-bold">+283% YTD</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={MRR_DATA}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Revenue */}
          <div className="glass gold-border rounded-2xl p-6 fade-up stagger-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">This Week</h3>
                <p className="text-slate-aug text-xs font-mono">Daily revenue</p>
              </div>
              <span className="text-white text-sm font-mono font-bold">$3,370 total</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="rgba(0, 208, 132, 0.6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2 glass gold-border rounded-2xl p-6 fade-up stagger-4">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-gold" />
              <h3 className="font-display text-base font-bold text-white">AI CFO Insights</h3>
              <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                {AI_INSIGHTS.length} active
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {AI_INSIGHTS.map((insight, i) => {
                const style = INSIGHT_STYLES[insight.type as InsightType]
                const Icon = style.icon
                return (
                  <div key={i} className={`rounded-xl p-4 border ${style.border} ${style.bg} flex items-start gap-3`}>
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-0.5">{insight.title}</p>
                      <p className="text-xs text-slate-aug leading-relaxed">{insight.body}</p>
                    </div>
                    <button className="text-xs text-slate-aug hover:text-white flex items-center gap-1 flex-shrink-0 transition-colors">
                      {insight.action}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Ask AI */}
            <div className="border-t border-[rgba(201,168,76,0.1)] pt-5">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Ask your AI CFO</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  placeholder="Should I raise prices? How's my cash flow? When do I hit $10k MRR?"
                  className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 transition-all"
                  onKeyDown={e => e.key === 'Enter' && askAI(aiQuestion)}
                />
                <button
                  onClick={() => askAI(aiQuestion)}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading ? <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
                  Ask
                </button>
              </div>
              {aiResponse && (
                <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20 fade-up">
                  <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'How is my MRR trending?',
                  'When do I run out of cash?',
                  'Should I raise prices?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setAiQuestion(q); askAI(q) }}
                    className="text-xs px-3 py-1.5 rounded-lg glass gold-border text-slate-aug hover:text-white transition-all hover:border-gold/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="glass gold-border rounded-2xl p-6 fade-up stagger-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base font-bold text-white">Live Events</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-aug font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
                Live
              </span>
            </div>
            <div className="space-y-3">
              {RECENT_EVENTS.map(event => (
                <div key={event.id} className="flex items-center gap-3 py-2 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.positive ? 'bg-emerald-aug' : 'bg-crimson-aug'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{event.desc}</p>
                    <p className="text-xs text-slate-aug font-mono">{event.time}</p>
                  </div>
                  <span className={`text-xs font-mono font-bold flex-shrink-0 ${event.positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                    {event.amount}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/revenue" className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-aug hover:text-gold transition-colors pt-3 border-t border-[rgba(201,168,76,0.07)]">
              View all events
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
