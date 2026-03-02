'use client'

import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

type Variant = 'info' | 'warning' | 'success' | 'error'

const STYLES: Record<Variant, { wrap: string; icon: any; iconColor: string; title: string }> = {
  info: {
    wrap: 'bg-white/3 border-[rgba(201,168,76,0.12)]',
    icon: Info,
    iconColor: 'text-slate-aug',
    title: 'Info',
  },
  warning: {
    wrap: 'bg-yellow-500/6 border-yellow-500/25',
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    title: 'Warning',
  },
  success: {
    wrap: 'bg-emerald-aug/6 border-emerald-aug/25',
    icon: CheckCircle2,
    iconColor: 'text-emerald-aug',
    title: 'Success',
  },
  error: {
    wrap: 'bg-crimson-aug/10 border-crimson-aug/30',
    icon: AlertTriangle,
    iconColor: 'text-crimson-aug',
    title: 'Error',
  },
}

export default function InlineNotice({
  variant,
  message,
  action,
}: {
  variant: Variant
  message: React.ReactNode
  action?: React.ReactNode
}) {
  const s = STYLES[variant]
  const Icon = s.icon
  return (
    <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${s.wrap}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
        <div className="text-slate-aug text-sm">{message}</div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}

