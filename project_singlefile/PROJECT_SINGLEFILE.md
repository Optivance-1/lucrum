# Lucrum Project Singlefile

Generated: 2026-03-02 03:09:38 UTC

This file stitches together the core files (the 'heart') of the Lucrum codebase for AI review.

## Included Files
- README.md
- package.json
- next.config.js
- tailwind.config.js
- postcss.config.js
- tsconfig.json
- src/app/layout.tsx
- src/app/globals.css
- src/app/page.tsx
- src/app/connect/page.tsx
- src/app/dashboard/layout.tsx
- src/app/dashboard/page.tsx
- src/app/api/stripe/connect/route.ts
- src/app/api/stripe/data/route.ts
- src/app/api/stripe/disconnect/route.ts
- src/app/api/stripe/webhook/route.ts
- src/app/api/ai/cfo/route.ts
- src/app/api/ai/insights/route.ts
- src/hooks/useStripeData.ts
- src/lib/stripe.ts
- src/lib/utils.ts
- src/types/index.ts

---

## FILE: README.md

```md
# Lucrum — AI CFO for Stripe Builders

> Connect your Stripe. Get your AI CFO. Stop guessing, start growing.

## What this is

Lucrum is a financial intelligence layer that sits on top of Stripe. Founders connect their Stripe account and get:

- **Live, accurate MRR** — calculated from subscriptions, not charges
- **Real churn rate** — cancelled subs / active subs at period start
- **Actual cash runway** — balance vs real monthly burn
- **AI-generated insights** — dynamic, based on your real numbers
-- **Conversational AI CFO** — powered by Groq, with your real metrics as context

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom design system
- **Charts**: Recharts
- **Payments Data**: Stripe API v2023-10-16
- **AI Engine**: Groq (primary) with Gemini 1.5 fallback
- **Language**: TypeScript

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
```

Fill in your keys:
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AI_PROVIDER=groq
GROQ_API_KEY=sk_groq_...
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_key   # optional fallback
GEMINI_MODEL=gemini-1.5-flash
NEXT_PUBLIC_APP_URL=http://localhost:3000
COOKIE_ENCRYPTION_KEY=replace_with_a_long_random_secret
```

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Stripe webhook (optional for local dev)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── connect/page.tsx            # Stripe key onboarding
│   ├── dashboard/page.tsx          # Live AI CFO dashboard
│   └── api/
│       ├── stripe/
│       │   ├── connect/route.ts    # Validate + store Stripe key
│       │   ├── data/route.ts       # Fetch + compute live metrics
│       │   └── webhook/route.ts    # Real-time Stripe events
│       └── ai/
│           ├── cfo/route.ts        # Conversational AI CFO
│           └── insights/route.ts   # Auto-generated AI insights
├── hooks/
│   └── useStripeData.ts            # Data fetching hook (auto-refresh)
├── lib/
│   ├── stripe.ts                   # Stripe client + pinned API version
│   └── utils.ts                    # Formatting + financial calculations
└── types/
    └── index.ts                    # Full TypeScript types
```

## What Was Fixed (Phase 1 → Phase 1.5)

| Bug | Fix |
|-----|-----|
| Logo showed "A" not "L" | Fixed everywhere (nav, footer, connect page, sidebar, favicon) |
| Copyright said 2024 | Updated to 2026 |
| Stripe API version mismatch (2023 vs 2024) | Pinned to `2023-10-16` in `lib/stripe.ts`, imported everywhere |
| Next.js config compatibility warning | Using `experimental.serverComponentsExternalPackages` for Next 14 compatibility |
| Dashboard never fetched real data | `useStripeData` hook wires dashboard to `/api/stripe/data` |
| AI CFO chat had hardcoded context | Now passes real live metrics as context |
| AI insights were static strings | New `/api/ai/insights` generates dynamic insights from real data |
| MRR included one-time charges | MRR now calculated only from active subscriptions |
| Churn rate was hardcoded 2.1% | Calculated: cancelled subs (30d) / active at start |
| Runway was hardcoded 47 days | Calculated: balance / (burn - MRR) |
| Daily revenue chart ordering broken | Date-keyed `YYYY-MM-DD` array, always in chronological order |
| No loading states in dashboard | Full skeleton loading UI for every data section |
| No error handling in dashboard | Error banner with retry, connection status in sidebar |

## Phase 2 Roadmap

- [ ] Auth system (Clerk or NextAuth)
- [ ] Postgres + Prisma for metric snapshots
- [ ] Encrypted Stripe key storage
- [ ] Daily email AI briefings
- [ ] True 90-day cash flow model
- [ ] Churn prediction ML model
- [ ] Pricing recommendation engine
- [ ] Multi-account support

## Phase 3 Roadmap

- [ ] Subscription billing (Stripe for Lucrum itself)
- [ ] Freemium feature gating
- [ ] Team accounts
- [ ] Slack / Discord alerts
- [ ] API for power users

## Security Notes (Beta)

Current beta behavior:

1. Stripe key is encrypted server-side and stored in an `httpOnly` cookie
2. Cookie is `secure` in production and scoped to your app path
3. API routes run server-side only (no client-side Stripe secret exposure)

Before full production:

1. Add proper auth (Clerk, NextAuth, or equivalent)
2. Move encrypted key storage to DB + per-user association
3. Add rate limiting on all API routes
4. Add audit logging around key connect/disconnect events
5. Use test keys in staging, live keys only in production

```

---

## FILE: package.json

```json
{
  "name": "lucrum",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18",
    "stripe": "^14.21.0",
    "recharts": "^2.12.7",
    "framer-motion": "^11.3.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "14.2.35"
  }
}

```

---

## FILE: next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Stripe bundled in server components/runtime in Next 14.
    serverComponentsExternalPackages: ['stripe'],
  },
}

module.exports = nextConfig

```

---

## FILE: tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        obsidian: {
          DEFAULT: '#0A0A0F',
          50: '#1A1A2E',
          100: '#16162A',
          200: '#0F0F1A',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C97A',
          dark: '#9A7A2E',
        },
        emerald: {
          aug: '#00D084',
          dim: '#00A066',
        },
        crimson: {
          aug: '#FF3B5C',
        },
        slate: {
          aug: '#8B8FA8',
        }
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'number-tick': 'numberTick 0.3s ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        numberTick: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}

```

---

## FILE: postcss.config.js

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

---

## FILE: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

---

## FILE: src/app/layout.tsx

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lucrum — Financial OS for AI Builders',
  description: 'Connect your Stripe. Get your AI CFO. Stop guessing, start growing.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-obsidian text-white font-body antialiased">
        {children}
      </body>
    </html>
  )
}

```

---

## FILE: src/app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --obsidian: #0A0A0F;
  --obsidian-50: #1A1A2E;
  --obsidian-100: #16162A;
  --gold: #C9A84C;
  --gold-light: #E8C97A;
  --emerald: #00D084;
  --crimson: #FF3B5C;
  --slate: #8B8FA8;
  --border: rgba(201, 168, 76, 0.15);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--obsidian);
  background-image: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 168, 76, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0, 208, 132, 0.04) 0%, transparent 50%);
  min-height: 100vh;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--obsidian); }
::-webkit-scrollbar-thumb { background: rgba(201, 168, 76, 0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(201, 168, 76, 0.5); }

/* Selection */
::selection { background: rgba(201, 168, 76, 0.2); color: var(--gold-light); }

/* Grain overlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.4;
}

@layer components {
  .glass {
    background: rgba(26, 26, 46, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
  }

  .glass-strong {
    background: rgba(22, 22, 42, 0.85);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid rgba(201, 168, 76, 0.2);
  }

  .gold-border {
    border: 1px solid rgba(201, 168, 76, 0.25);
  }

  .gold-glow {
    box-shadow: 0 0 40px rgba(201, 168, 76, 0.08), 0 0 80px rgba(201, 168, 76, 0.04);
  }

  .emerald-glow {
    box-shadow: 0 0 30px rgba(0, 208, 132, 0.15);
  }

  .text-gradient-gold {
    background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, #A07830 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .text-gradient-white {
    background: linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .card-hover {
    transition: all 0.3s ease;
  }

  .card-hover:hover {
    transform: translateY(-2px);
    border-color: rgba(201, 168, 76, 0.35);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(201, 168, 76, 0.06);
  }

  .shimmer-bg {
    background: linear-gradient(90deg, transparent 0%, rgba(201, 168, 76, 0.08) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
  }
  
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
  .stagger-5 { animation-delay: 0.5s; }

  .fade-up {
    opacity: 0;
    animation: fadeUp 0.7s ease forwards;
  }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}

.animate-float { animation: float 6s ease-in-out infinite; }
.animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }

```

---

## FILE: src/app/page.tsx

```tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Brain, TrendingUp, Shield, ChevronRight, Check } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Connect in 60 seconds',
    desc: 'Plug in your Stripe account. No forms. No jargon. No finance degree required.',
    color: 'gold',
  },
  {
    icon: Brain,
    title: 'AI CFO on demand',
    desc: 'Your revenue, categorized. Your cash flow, predicted. Your taxes, estimated — automatically.',
    color: 'emerald',
  },
  {
    icon: TrendingUp,
    title: 'Growth intelligence',
    desc: '"Raise your price 12%." "Offer annual plans now." Real decisions, not dashboards.',
    color: 'gold',
  },
  {
    icon: Shield,
    title: 'Built for AI builders',
    desc: 'Solo founders. Micro-SaaS. Indie hackers. We understand how you actually build.',
    color: 'emerald',
  },
]

const INSIGHTS = [
  '"You will run out of runway in 47 days at current burn."',
  '"Raise your starter plan price by 15% — churn risk is low."',
  '"3 customers are likely to cancel this month. Offer them a discount."',
  '"Annual plan conversion is 2× higher on Tuesdays. Send the email."',
  '"Your MRR growth is outpacing costs by 34%. Good time to hire."',
]

const PLANS = [
  {
    name: 'Seed',
    price: '$0',
    period: 'forever',
    desc: 'Get started, no credit card.',
    features: [
      'Connect 1 Stripe account',
      'Revenue & MRR dashboard',
      'Basic cash flow view',
      '30-day AI insights',
      'Email support',
    ],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$29',
    period: '/month',
    desc: 'For builders making money.',
    features: [
      'Everything in Seed',
      'Full AI CFO engine',
      'Cash flow forecasting (90 days)',
      'Pricing recommendations',
      'Churn prediction alerts',
      'Tax estimation',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$99',
    period: '/month',
    desc: 'When you\'re serious about growing.',
    features: [
      'Everything in Growth',
      'Unlimited Stripe accounts',
      'Automated decision execution',
      'Custom AI prompts',
      'Revenue forecasting (12 months)',
      'Slack & Discord alerts',
      'Dedicated support',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
]

export default function HomePage() {
  const [insightIdx, setInsightIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setInsightIdx(i => (i + 1) % INSIGHTS.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-[rgba(201,168,76,0.12)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-aug">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-slate-aug hover:text-white transition-colors hidden md:block">
              Sign in
            </Link>
            <Link
              href="/connect"
              className="px-4 py-2 rounded-lg bg-gold text-obsidian font-semibold text-sm hover:bg-gold-light transition-all duration-200 hover:shadow-lg hover:shadow-gold/20"
            >
              Connect Stripe
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-aug/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
            <span className="text-xs text-slate-aug font-mono uppercase tracking-widest">AI CFO for indie builders</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 fade-up stagger-1">
            <span className="text-white">Your Stripe.</span>
            <br />
            <span className="text-gradient-gold">Your AI CFO.</span>
            <br />
            <span className="text-white">Zero complexity.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-aug max-w-2xl mx-auto mb-10 leading-relaxed fade-up stagger-2">
            Connect your Stripe account in 60 seconds. Get an AI financial brain that categorizes your revenue, forecasts your cash flow, and tells you exactly what to do next.
          </p>

          {/* Rotating insights */}
          <div className="max-w-xl mx-auto mb-10 fade-up stagger-3">
            <div className="glass gold-border rounded-2xl px-6 py-4 min-h-[64px] flex items-center justify-center">
              <p
                className={`text-sm font-mono text-gold-light text-center transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transition: 'opacity 0.4s ease, transform 0.4s ease' }}
              >
                {INSIGHTS[insightIdx]}
              </p>
            </div>
            <p className="text-xs text-slate-aug mt-2 font-mono">↑ real insights from your AI CFO</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up stagger-4">
            <Link
              href="/connect"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold text-base hover:bg-gold-light transition-all duration-200 hover:shadow-2xl hover:shadow-gold/25 w-full sm:w-auto justify-center"
            >
              Connect Stripe — Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-8 py-4 rounded-xl glass gold-border text-white font-medium text-base hover:border-gold/40 transition-all duration-200 w-full sm:w-auto justify-center"
            >
              View demo dashboard
            </Link>
          </div>

          <p className="text-xs text-slate-aug mt-5 fade-up stagger-5">
            Free forever plan. No credit card. Takes 60 seconds.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '$0', label: 'Processing fees from us' },
            { val: '60s', label: 'To connect Stripe' },
            { val: 'AI', label: 'Powered CFO engine' },
            { val: '∞', label: 'Insights on your data' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-gradient-gold mb-1">{s.val}</div>
              <div className="text-xs text-slate-aug uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Stripe gives you tools.
              <br />
              <span className="text-gradient-gold">We give you outcomes.</span>
            </h2>
            <p className="text-slate-aug text-lg max-w-xl mx-auto">
              Stop staring at dashboards. Start getting decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass gold-border rounded-2xl p-8 card-hover gold-glow fade-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center ${
                  f.color === 'gold' 
                    ? 'bg-gold/10 border border-gold/20' 
                    : 'bg-emerald-aug/10 border border-emerald-aug/20'
                }`}>
                  <f.icon className={`w-6 h-6 ${f.color === 'gold' ? 'text-gold' : 'text-emerald-aug'}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-aug leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-y border-[rgba(201,168,76,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">Three steps to your AI CFO</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Stripe', desc: 'Click connect, authorize with Stripe OAuth. That\'s literally it. We pull your historical data automatically.' },
              { step: '02', title: 'AI analyzes everything', desc: 'Our engine categorizes every transaction, maps your revenue patterns, and builds your financial model.' },
              { step: '03', title: 'Get your briefing', desc: 'Wake up to a daily AI CFO briefing. Cash position, risks, opportunities — all in plain English.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="font-mono text-5xl font-bold text-gold/10 mb-4 leading-none">{s.step}</div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-slate-aug leading-relaxed text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Simple pricing.
              <br />
              <span className="text-gradient-gold">Start free.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 card-hover relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 gold-glow'
                    : 'glass gold-border'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold rounded-full text-obsidian text-xs font-bold uppercase tracking-widest">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-slate-aug text-sm font-mono uppercase tracking-widest mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-aug text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-aug text-sm mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                      <span className="text-slate-aug">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/connect"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-gold text-obsidian hover:bg-gold-light hover:shadow-lg hover:shadow-gold/25'
                      : 'glass gold-border text-white hover:border-gold/40'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-xs">L</span>
            </div>
            <span className="font-display font-bold text-gradient-gold">Lucrum</span>
          </div>
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders © 2026</p>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="mailto:hello@lucrum.app" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

```

---

## FILE: src/app/connect/page.tsx

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Zap, Shield, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConnectPage() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [stripeKey, setStripeKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleConnect = async () => {
    if (!stripeKey.trim()) return
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
          window.location.href = '/dashboard'
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

```

---

## FILE: src/app/dashboard/layout.tsx

```tsx
import { StripeDataProvider } from '@/contexts/StripeDataContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-obsidian">
      <StripeDataProvider>{children}</StripeDataProvider>
    </div>
  )
}

```

---

## FILE: src/app/dashboard/page.tsx

```tsx
'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Zap,
  Brain, AlertTriangle, CheckCircle, ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { useStripeData } from '@/hooks/useStripeData'
import { formatCurrency, formatPercent, timeAgo } from '@/lib/utils'
import DashboardShell from '@/components/DashboardShell'
import InlineNotice from '@/components/InlineNotice'
import type { InsightSeverity } from '@/types'

// ─── Design tokens ─────────────────────────────────────────────────────────

const INSIGHT_STYLES: Record<InsightSeverity, {
  border: string; bg: string; icon: React.ElementType; iconColor: string; dot: string
}> = {
  critical:    { border: 'border-red-500/40',      bg: 'bg-red-500/8',      icon: AlertTriangle, iconColor: 'text-red-400',    dot: 'bg-red-400' },
  warning:     { border: 'border-yellow-500/35',   bg: 'bg-yellow-500/6',   icon: AlertTriangle, iconColor: 'text-yellow-400', dot: 'bg-yellow-400' },
  opportunity: { border: 'border-gold/30',         bg: 'bg-gold/5',         icon: TrendingUp,    iconColor: 'text-gold',       dot: 'bg-gold' },
  win:         { border: 'border-emerald-aug/30',  bg: 'bg-emerald-aug/5',  icon: CheckCircle,   iconColor: 'text-emerald-aug',dot: 'bg-emerald-aug' },
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
  )
}

function KPICard({
  label, value, change, positive, icon: Icon, loading,
}: {
  label: string; value: string; change: string; positive: boolean
  icon: React.ElementType; loading: boolean
}) {
  return (
    <div className="glass gold-border rounded-2xl p-5 card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gold" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : (
        <>
          <div className="font-display text-2xl font-bold text-white mb-1">{value}</div>
          <div className={`flex items-center gap-1 text-xs font-mono ${positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        </>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass gold-border rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-aug font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ─── Main dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiProvider, setAiProvider] = useState<'groq' | 'gemini' | 'fallback' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) return
    setAiLoading(true)
    setAiResponse('')
    try {
      const res = await fetch('/api/ai/cfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          // Pass REAL metrics as context — not hardcoded values
          context: metrics ? {
            mrr: metrics.mrr,
            mrrGrowth: metrics.mrrGrowth,
            revenue30d: metrics.revenue30d,
            revenueGrowth: metrics.revenueGrowth,
            activeSubscriptions: metrics.activeSubscriptions,
            newSubscriptions30d: metrics.newSubscriptions30d,
            churnRate: metrics.churnRate,
            newCustomers30d: metrics.newCustomers30d,
            availableBalance: metrics.availableBalance,
            runway: metrics.runway,
            cancelledSubscriptions30d: metrics.cancelledSubscriptions30d,
          } : undefined,
        }),
      })
      const data = await res.json()
      setAiProvider(data.provider ?? 'fallback')
      setAiResponse(data.answer ?? 'Could not get a response right now.')
    } catch {
      setAiProvider('fallback')
      setAiResponse('AI advisor is running in local fallback mode right now. Try again in a few seconds.')
    } finally {
      setAiLoading(false)
    }
  }, [metrics])

  // ── Derived display values (from real metrics or sensible fallbacks) ───────
  const runwayDisplay = !metrics ? '—'
    : metrics.runway >= 9999 ? '∞'
    : `${metrics.runway}d`

  const runwayPositive = !metrics ? true : metrics.runway > 90 || metrics.runway >= 9999

  return (
    <DashboardShell
      title={`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}. ☀️`}
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : loading ? 'Loading your financial data...' : `Last synced ${lastRefreshed ? timeAgo(Math.floor(lastRefreshed.getTime() / 1000)) : 'just now'} · auto-refreshes every 60s`}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >

        {/* Error state */}
        {error && (
          <InlineNotice
            variant="error"
            message={error}
            action={(
              <button
                onClick={() => refresh()}
                className="text-gold text-sm hover:text-gold-light transition-colors"
              >
                Try again →
              </button>
            )}
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="MRR" icon={DollarSign} loading={loading}
            value={metrics ? formatCurrency(metrics.mrr) : '—'}
            change={metrics ? `${formatPercent(metrics.mrrGrowth)} MoM` : '—'}
            positive={(metrics?.mrrGrowth ?? 0) >= 0}
          />
          <KPICard
            label="Active Subs" icon={Users} loading={loading}
            value={metrics ? metrics.activeSubscriptions.toString() : '—'}
            change={metrics ? `+${metrics.newSubscriptions30d} new (30d)` : '—'}
            positive={true}
          />
          <KPICard
            label="Churn Rate" icon={TrendingDown} loading={loading}
            value={metrics ? `${metrics.churnRate}%` : '—'}
            change={metrics ? `${metrics.cancelledSubscriptions30d} cancelled (30d)` : '—'}
            positive={(metrics?.churnRate ?? 0) < 5}
          />
          <KPICard
            label="Cash Runway" icon={Zap} loading={loading}
            value={runwayDisplay}
            change={metrics ? `$${metrics.availableBalance.toLocaleString()} available` : '—'}
            positive={runwayPositive}
          />
        </div>

        <div className="glass gold-border rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Decision-grade Forecasting</p>
            <p className="text-sm text-white">Monte Carlo Scenario Lab is live in Forecasts (P10/P50/P90 + action advice).</p>
          </div>
          <Link
            href="/dashboard/forecasts"
            className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm font-semibold whitespace-nowrap"
          >
            Open Forecasts
          </Link>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* MRR Growth Chart */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">MRR Growth</h3>
                <p className="text-slate-aug text-xs font-mono">Monthly recurring revenue</p>
              </div>
              {metrics && (
                <span className={`text-sm font-mono font-bold ${metrics.mrrGrowth >= 0 ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                  {formatPercent(metrics.mrrGrowth)} MoM
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : metrics?.mrrHistory.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metrics.mrrHistory}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
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
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No subscription data yet</div>
            )}
          </div>

          {/* Daily Revenue (last 7 days — properly ordered) */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">Last 7 Days</h3>
                <p className="text-slate-aug text-xs font-mono">Daily revenue</p>
              </div>
              {metrics && (
                <span className="text-white text-sm font-mono font-bold">
                  {formatCurrency(metrics.dailyRevenue.reduce((s, d) => s + d.revenue, 0))} total
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : metrics?.dailyRevenue.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metrics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B8FA8', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {metrics.dailyRevenue.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.revenue > 0 ? 'rgba(0, 208, 132, 0.65)' : 'rgba(139, 143, 168, 0.3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No revenue in last 7 days</div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* AI CFO Insights + Chat */}
          <div className="lg:col-span-2 glass gold-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-gold" />
              <h3 className="font-display text-base font-bold text-white">AI CFO Insights</h3>
              {insightsLoading && (
                <span className="ml-2 text-xs font-mono text-slate-aug flex items-center gap-1">
                  <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
                  Analyzing your data...
                </span>
              )}
              {insights.length > 0 && !insightsLoading && (
                <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {insights.length} active
                </span>
              )}
            </div>

            {/* Insights list */}
            <div className="space-y-3 mb-5">
              {insightsLoading && insights.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))
              ) : insights.length > 0 ? (
                insights.map((insight) => {
                  const style = INSIGHT_STYLES[insight.type]
                  const Icon  = style.icon
                  return (
                    <div key={insight.id} className={`rounded-xl p-4 border ${style.border} ${style.bg} flex items-start gap-3`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white">{insight.title}</p>
                          {insight.metric && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${style.bg} border ${style.border} ${style.iconColor}`}>
                              {insight.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-aug leading-relaxed">{insight.body}</p>
                      </div>
                      <button className="text-xs text-slate-aug hover:text-white flex items-center gap-0.5 flex-shrink-0 transition-colors">
                        {insight.action}<ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              ) : !loading && (
                <p className="text-slate-aug text-sm text-center py-4">
                  AI insights are warming up. Refresh to regenerate recommendations.
                </p>
              )}
            </div>

            {/* Ask AI CFO */}
            <div className="border-t border-[rgba(201,168,76,0.1)] pt-5">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Ask your AI CFO</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  placeholder="Should I raise prices? When do I hit $10k MRR? How's my churn?"
                  className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 transition-all"
                  onKeyDown={e => e.key === 'Enter' && askAI(aiQuestion)}
                />
                <button
                  onClick={() => askAI(aiQuestion)}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading
                    ? <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    : <Brain className="w-4 h-4" />
                  }
                  Ask
                </button>
              </div>

              {aiResponse && (
                <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20 fade-up">
                  <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
                  {aiProvider && (
                    <p className="text-[11px] font-mono uppercase tracking-widest text-slate-aug mt-2">
                      Source: {aiProvider}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'Should I raise my prices?',
                  'When do I run out of cash?',
                  'How is my churn trending?',
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

          {/* Live events feed */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base font-bold text-white">Live Events</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-aug font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
                Live
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : metrics?.recentEvents.length ? (
              <div className="space-y-0">
                {metrics.recentEvents.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.positive ? 'bg-emerald-aug' : 'bg-crimson-aug'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{event.description}</p>
                      <p className="text-xs text-slate-aug font-mono">
                        {event.customerEmail ? `${event.customerEmail} · ` : ''}{timeAgo(event.created)}
                      </p>
                    </div>
                    <span className={`text-xs font-mono font-bold flex-shrink-0 ${event.positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                      {event.positive ? '+' : '-'}{formatCurrency(event.amount, event.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-aug text-sm text-center py-8">No recent events</p>
            )}

            {metrics?.recentEvents.length ? (
              <Link
                href="/dashboard/revenue"
                className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-aug hover:text-gold transition-colors pt-3 border-t border-[rgba(201,168,76,0.07)]"
              >
                View all events <ArrowUpRight className="w-3 h-3" />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Financial summary row */}
        {metrics && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '30d Revenue',    value: formatCurrency(metrics.revenue30d),                        sub: `vs ${formatCurrency(metrics.revenuePrev30d)} prior`, good: metrics.revenueGrowth >= 0 },
              { label: 'New Customers',  value: metrics.newCustomers30d.toString(),                        sub: 'joined in last 30 days',                             good: true },
              { label: 'Available Cash', value: formatCurrency(metrics.availableBalance),                  sub: `+ ${formatCurrency(metrics.pendingBalance)} pending`, good: metrics.availableBalance > 0 },
              { label: 'Est. Tax (ann)', value: formatCurrency(metrics.mrr * 12 * 0.25),                   sub: '~25% of annualized MRR',                             good: true },
            ].map(({ label, value, sub, good }) => (
              <div key={label} className="glass gold-border rounded-xl p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">{label}</p>
                <p className={`font-display text-xl font-bold ${good ? 'text-white' : 'text-crimson-aug'}`}>{value}</p>
                <p className="text-xs text-slate-aug mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}
    </DashboardShell>
  )
}

```

---

## FILE: src/app/api/stripe/connect/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server'
import {
  createStripeClient,
  encryptStripeKey,
  isValidStripeKey,
  STRIPE_KEY_COOKIE,
} from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { secretKey } = await req.json()
    const normalizedKey = typeof secretKey === 'string' ? secretKey.trim() : ''

    if (!normalizedKey || !isValidStripeKey(normalizedKey)) {
      return NextResponse.json({ success: false, error: 'Invalid Stripe key format' }, { status: 400 })
    }

    // Validate the key by fetching account info
    const stripe = createStripeClient(normalizedKey)
    const account = await stripe.accounts.retrieve()
    const encryptedCookie = encryptStripeKey(normalizedKey)

    if (!encryptedCookie && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Server security configuration missing' },
        { status: 500 }
      )
    }

    // In production: encrypt and store key in DB, associate with user session
    // For Phase 1: store in session/cookie (demo)
    const response = NextResponse.json({
      success: true,
      account: {
        id: account.id,
        business_profile: account.business_profile,
        country: account.country,
      },
    })

    response.cookies.set(STRIPE_KEY_COOKIE, encryptedCookie ?? secretKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Stripe connect error:', error)
    return NextResponse.json(
      { success: false, error: 'Connection failed' },
      { status: 400 }
    )
  }
}

```

---

## FILE: src/app/api/stripe/data/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import { calculateChurnRate, calculateMRRGrowth, calculateRunway, getLastNDays } from '@/lib/utils'
import type { StripeMetrics, DailyRevenue, StripeEvent } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secretKey = getStripeKeyFromCookies(req.cookies)
    if (!secretKey) {
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const stripe = createStripeClient(secretKey)
    const now = Math.floor(Date.now() / 1000)
    const d30 = now - 30 * 86400
    const d60 = now - 60 * 86400
    const d7  = now - 7  * 86400

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [
      allActiveSubs,
      newSubs30d,
      cancelledSubs30d,
      charges30d,
      chargesPrev30d,
      charges7d,
      allCustomers,
      newCustomers30d,
      balance,
      payouts30d,
    ] = await Promise.all([
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
      stripe.subscriptions.list({ created: { gte: d30 }, limit: 100 }),
      stripe.subscriptions.list({ status: 'canceled', created: { gte: d30 }, limit: 100 }),
      stripe.charges.list({ created: { gte: d30 }, limit: 100 }),
      stripe.charges.list({ created: { gte: d60, lte: d30 }, limit: 100 }),
      stripe.charges.list({ created: { gte: d7 }, limit: 100 }),
      stripe.customers.list({ limit: 1 }),     // just need total_count
      stripe.customers.list({ created: { gte: d30 }, limit: 100 }),
      stripe.balance.retrieve(),
      stripe.payouts.list({ created: { gte: d30 }, limit: 100 }),
    ])

    // ── MRR: sum from active subscriptions only (not one-time charges) ──────
    function subToMonthlyAmount(sub: typeof allActiveSubs.data[0]): number {
      return sub.items.data.reduce((sum, item) => {
        const price = item.price
        const qty = item.quantity ?? 1
        const unit = price.unit_amount ?? 0
        if (price.recurring?.interval === 'month') return sum + unit * qty
        if (price.recurring?.interval === 'year')  return sum + (unit * qty) / 12
        if (price.recurring?.interval === 'week')  return sum + unit * qty * 4.33
        return sum
      }, 0) / 100
    }

    const mrr = allActiveSubs.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)

    // Approximate previous MRR by removing new subs and adding back cancelled ones
    const newSubsMRR = newSubs30d.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
    const cancelledMRR = cancelledSubs30d.data.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
    const mrrPrevious = Math.max(0, mrr - newSubsMRR + cancelledMRR)
    const mrrGrowth = calculateMRRGrowth(mrr, mrrPrevious)

    // ── Revenue: paid charges only, no refunds ───────────────────────────────
    const paidFilter = (c: typeof charges30d.data[0]) => c.paid && !c.refunded && c.status === 'succeeded'
    const revenue30d = charges30d.data.filter(paidFilter).reduce((sum, c) => sum + c.amount, 0) / 100
    const revenuePrev30d = chargesPrev30d.data.filter(paidFilter).reduce((sum, c) => sum + c.amount, 0) / 100
    const revenueGrowth = calculateMRRGrowth(revenue30d, revenuePrev30d)

    // ── Churn rate ───────────────────────────────────────────────────────────
    const activeAtStart = allActiveSubs.data.length + cancelledSubs30d.data.length
    const churnRate = calculateChurnRate(cancelledSubs30d.data.length, activeAtStart)

    // ── Cash & runway ────────────────────────────────────────────────────────
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100
    const pendingBalance   = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100

    // Estimate monthly burn from payouts (what went out the door)
    const payoutTotal = payouts30d.data.reduce((sum, p) => sum + p.amount, 0) / 100
    const refundTotal = charges30d.data.filter(c => c.refunded).reduce((sum, c) => sum + (c.amount_refunded ?? 0), 0) / 100
    const estimatedMonthlyBurn = payoutTotal + refundTotal
    const runway = calculateRunway(availableBalance, estimatedMonthlyBurn - mrr)

    // ── Daily revenue for chart (last 7 days, properly date-ordered) ─────────
    const last7Days = getLastNDays(7)
    const dailyMap: Record<string, number> = {}
    last7Days.forEach(d => { dailyMap[d] = 0 })

    charges7d.data.filter(paidFilter).forEach(charge => {
      const date = new Date(charge.created * 1000).toISOString().split('T')[0]
      if (date in dailyMap) dailyMap[date] += charge.amount / 100
    })

    const dailyRevenue: DailyRevenue[] = last7Days.map(date => {
      const d = new Date(date)
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
      return { date, label, revenue: Math.round(dailyMap[date]) }
    })

    // ── MRR history (build from current + derive backwards — Phase 1 approx) ─
    // For Phase 1 we build a 6-month synthetic history based on growth rate
    // Phase 2 will store snapshots in DB
    const growthFactor = mrrGrowth / 100
    const mrrHistory = Array.from({ length: 7 }, (_, i) => {
      const monthsBack = 6 - i
      const historicalMrr = mrr / Math.pow(1 + growthFactor, monthsBack)
      const d = new Date()
      d.setMonth(d.getMonth() - monthsBack)
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        mrr: Math.round(Math.max(0, historicalMrr)),
      }
    })

    // ── Recent events feed ───────────────────────────────────────────────────
    const recentEvents: StripeEvent[] = charges30d.data.slice(0, 15).map(charge => {
      const isRefund = !!charge.refunded
      return {
        id: charge.id,
        type: isRefund ? 'refund' : 'payment',
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        description: charge.description || charge.billing_details?.name || 'Payment',
        customerId: typeof charge.customer === 'string' ? charge.customer : null,
        customerEmail: charge.billing_details?.email ?? null,
        created: charge.created,
        status: charge.status,
        positive: charge.paid && !charge.refunded,
      }
    })

    // ── Add subscription events ──────────────────────────────────────────────
    newSubs30d.data.slice(0, 5).forEach(sub => {
      recentEvents.push({
        id: sub.id,
        type: 'subscription',
        amount: subToMonthlyAmount(sub),
        currency: sub.currency?.toUpperCase() ?? 'USD',
        description: 'New subscription',
        customerId: typeof sub.customer === 'string' ? sub.customer : null,
        customerEmail: null,
        created: sub.created,
        status: 'active',
        positive: true,
      })
    })

    // Sort all events by most recent
    recentEvents.sort((a, b) => b.created - a.created)

    const metrics: StripeMetrics = {
      mrr: Math.round(mrr),
      mrrPrevious: Math.round(mrrPrevious),
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      revenue30d: Math.round(revenue30d),
      revenuePrev30d: Math.round(revenuePrev30d),
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      activeSubscriptions: allActiveSubs.data.length,
      newSubscriptions30d: newSubs30d.data.length,
      cancelledSubscriptions30d: cancelledSubs30d.data.length,
      churnRate: Math.round(churnRate * 10) / 10,
      totalCustomers: allCustomers.data.length,
      newCustomers30d: newCustomers30d.data.length,
      availableBalance: Math.round(availableBalance),
      pendingBalance: Math.round(pendingBalance),
      estimatedMonthlyBurn: Math.round(estimatedMonthlyBurn),
      runway,
      dailyRevenue,
      mrrHistory,
      recentEvents: recentEvents.slice(0, 20),
      currency: balance.available[0]?.currency?.toUpperCase() ?? 'USD',
      fetchedAt: now,
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[stripe/data] error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch Stripe data' },
      { status: error.statusCode ?? 500 }
    )
  }
}

```

---

## FILE: src/app/api/stripe/disconnect/route.ts

```ts
import { NextResponse } from 'next/server'
import { STRIPE_KEY_COOKIE } from '@/lib/stripe'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STRIPE_KEY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  })

  return response
}

```

---

## FILE: src/app/api/stripe/webhook/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        console.log(`[webhook] 💰 Payment succeeded: $${pi.amount / 100} ${pi.currency.toUpperCase()}`)
        // Phase 2: store in DB, invalidate metrics cache, push real-time update
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`[webhook] ✅ Charge succeeded: $${charge.amount / 100}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`[webhook] 🔄 Charge refunded: $${(charge.amount_refunded ?? 0) / 100}`)
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] 🎉 New subscription: ${sub.id}`)
        // Phase 2: trigger AI insight regeneration
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] 📝 Subscription updated: ${sub.id} → ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`[webhook] ❌ Subscription cancelled: ${sub.id}`)
        // Phase 2: log churn event, update metrics, trigger churn alert
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhook] ⚠️ Payment failed for invoice: ${invoice.id}`)
        // Phase 2: flag customer as at-risk, trigger dunning flow
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhook] ✅ Invoice paid: $${(invoice.amount_paid ?? 0) / 100}`)
        break
      }

      default:
        // Not an error — just log unhandled events
        break
    }
  } catch (handlerErr) {
    console.error('[webhook] Handler error:', handlerErr)
    // Still return 200 so Stripe doesn't retry
  }

  return NextResponse.json({ received: true })
}

```

---

## FILE: src/app/api/ai/cfo/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server'
import type { CFOContext } from '@/types'
import { callChatAI } from '@/lib/ai-client'

function fmtNumber(value: number | undefined, suffix = ''): string {
  if (value == null || Number.isNaN(value)) return 'unknown'
  return `${value}${suffix}`
}

function buildFallbackAnswer(question: string, ctx: Partial<CFOContext>): string {
  const q = question.toLowerCase()
  const runway = ctx.runway
  const churn = ctx.churnRate
  const mrr = ctx.mrr
  const growth = ctx.mrrGrowth
  const revenue = ctx.revenue30d

  if (/runway|cash|burn/.test(q)) {
    if (runway == null) {
      return 'Cash timing data is incomplete. Track payouts, refunds, and fixed costs daily so runway projections stop guessing.'
    }
    if (runway < 90) {
      return `You have about ${runway} days of runway. Freeze non-core spend and cut one expense this week to extend runway before you chase growth.`
    }
    return `You have roughly ${runway} days of runway. Keep burn disciplined and push one high-confidence growth channel instead of broad experimentation.`
  }

  if (/price|pricing|raise/.test(q)) {
    if (churn != null && churn > 6) {
      return `Don't raise prices yet. Churn is ${churn}%, so improve retention first or you'll leak customers faster than pricing lifts MRR.`
    }
    if (mrr != null && growth != null) {
      return `Test a controlled 8-12% price lift on new signups. MRR is $${mrr} with ${growth}% MoM growth, so run the test and watch churn for 2 billing cycles.`
    }
  }

  if (/churn|cancel/.test(q)) {
    return `Focus on saves before acquisition. Current churn is ${fmtNumber(churn, '%')}; trigger win-back offers for at-risk accounts and audit failed-payment recovery weekly.`
  }

  return `Current snapshot: MRR $${fmtNumber(mrr)}, 30-day revenue $${fmtNumber(revenue)}, runway ${fmtNumber(runway, ' days')}. Pick one lever this week: cut low-ROI spend, improve retention, or test pricing on new users only.`
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({})) as {
    question?: string
    context?: Partial<CFOContext>
  }
  const question = payload.question ?? ''
  const context = payload.context

  try {
    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const ctx = context ?? {}

    const system = `You are Lucrum's AI CFO — a sharp, direct financial advisor for indie hackers, micro-SaaS founders, and AI builders.

You speak like a brilliant CFO who's also been a founder — blunt, practical, data-driven, zero fluff. Give specific, actionable advice. Never hedge excessively. Always use the real numbers when available.

LIVE FINANCIAL DATA FOR THIS BUSINESS:
- MRR: $${ctx.mrr ?? 'unknown'} (${ctx.mrrGrowth != null ? (ctx.mrrGrowth > 0 ? '+' : '') + ctx.mrrGrowth + '% MoM' : 'growth unknown'})
- 30-day Revenue: $${ctx.revenue30d ?? 'unknown'}
- Revenue Growth: ${ctx.revenueGrowth != null ? (ctx.revenueGrowth > 0 ? '+' : '') + ctx.revenueGrowth + '%' : 'unknown'}
- Active Subscriptions: ${ctx.activeSubscriptions ?? 'unknown'}
- New Subscriptions (30d): ${ctx.newSubscriptions30d ?? 'unknown'}
- Churn Rate: ${ctx.churnRate ?? 'unknown'}%
- New Customers (30d): ${ctx.newCustomers30d ?? 'unknown'}
- Available Cash: $${ctx.availableBalance ?? 'unknown'}
- Cash Runway: ${ctx.runway === 9999 ? 'Profitable / infinite' : (ctx.runway ?? 'unknown') + ' days'}
- Cancelled Subs (30d): ${ctx.cancelledSubscriptions30d ?? 'unknown'}

RESPONSE RULES:
1. Under 130 words unless a breakdown is genuinely required
2. Reference the actual numbers above when they're relevant
3. Sound like a human texting, not a report generator
4. If data is missing, say exactly what you'd need to answer better
5. Never start with "Great question" or any fluff opener`

    const answer = await callChatAI(system, question)

    return NextResponse.json({ answer, provider: 'lucrum-ai' })
  } catch (error: any) {
    console.error('[ai/cfo] error:', error)
    return NextResponse.json({
      answer: buildFallbackAnswer(question, context ?? {}),
      provider: 'fallback',
    })
  }
}

```

---

## FILE: src/app/api/ai/insights/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server'
import type { CFOContext, AIInsight } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'

function toMetric(label: string, value: string): string {
  return `${value} ${label}`.trim()
}

function buildFallbackInsights(context: CFOContext): AIInsight[] {
  const runwayCritical = context.runway < 60
  const churnWarning = context.churnRate > 5
  const growthPositive = context.mrrGrowth > 0

  const insights: AIInsight[] = [
    {
      id: 'fallback_cash',
      type: runwayCritical ? 'critical' : 'opportunity',
      title: runwayCritical ? 'Runway is tight' : 'Runway is stable',
      body: runwayCritical
        ? `You have ${context.runway} days of runway. Cut one non-core expense this week to buy decision time.`
        : `You have ${context.runway} days of runway. Protect this by avoiding fixed-cost increases without clear payback.`,
      action: runwayCritical ? 'Cut spend' : 'Protect runway',
      metric: toMetric('days', String(context.runway)),
      priority: 1,
    },
    {
      id: 'fallback_churn',
      type: churnWarning ? 'warning' : 'win',
      title: churnWarning ? 'Retention leak detected' : 'Retention holding',
      body: churnWarning
        ? `Churn is ${context.churnRate}%. Focus on failed-payment recovery and targeted save offers before buying more traffic.`
        : `Churn is ${context.churnRate}%, which is manageable. Keep onboarding tight and monitor cancellation reasons weekly.`,
      action: 'Review churn',
      metric: toMetric('churn', `${context.churnRate}%`),
      priority: 2,
    },
    {
      id: 'fallback_growth',
      type: growthPositive ? 'win' : 'warning',
      title: growthPositive ? 'MRR trend is up' : 'Growth is soft',
      body: growthPositive
        ? `MRR grew ${context.mrrGrowth}% MoM. Double down on the acquisition channel driving the highest retained subscribers.`
        : `MRR is ${context.mrrGrowth}% MoM. Run one pricing or packaging test before increasing paid spend.`,
      action: 'Test pricing',
      metric: toMetric('MoM', `${context.mrrGrowth}%`),
      priority: 3,
    },
    {
      id: 'fallback_opportunity',
      type: 'opportunity',
      title: 'Next best action',
      body: `With $${context.revenue30d} in 30-day revenue and ${context.newCustomers30d} new customers, ship one retention experiment and one pricing experiment this month.`,
      action: 'Run experiments',
      metric: toMetric('new', `${context.newCustomers30d} customers`),
      priority: 3,
    },
  ]

  return insights
}

export async function POST(req: NextRequest) {
  const contextRaw: Partial<CFOContext> = await req.json().catch(() => ({}))
  const context: CFOContext = {
    mrr: Number(contextRaw.mrr ?? 0),
    mrrGrowth: Number(contextRaw.mrrGrowth ?? 0),
    revenue30d: Number(contextRaw.revenue30d ?? 0),
    revenueGrowth: Number(contextRaw.revenueGrowth ?? 0),
    activeSubscriptions: Number(contextRaw.activeSubscriptions ?? 0),
    newSubscriptions30d: Number(contextRaw.newSubscriptions30d ?? 0),
    churnRate: Number(contextRaw.churnRate ?? 0),
    newCustomers30d: Number(contextRaw.newCustomers30d ?? 0),
    availableBalance: Number(contextRaw.availableBalance ?? 0),
    runway: Number(contextRaw.runway ?? 0),
    cancelledSubscriptions30d: Number(contextRaw.cancelledSubscriptions30d ?? 0),
  }

  try {
    const prompt = `You are Lucrum's AI CFO engine. Analyze this founder's financial data and generate exactly 4 insights.

FINANCIAL DATA:
- MRR: $${context.mrr} (${context.mrrGrowth > 0 ? '+' : ''}${context.mrrGrowth}% MoM)
- 30-day Revenue: $${context.revenue30d} (${context.revenueGrowth > 0 ? '+' : ''}${context.revenueGrowth}% vs prior period)
- Active Subscriptions: ${context.activeSubscriptions}
- New Subscriptions (30d): ${context.newSubscriptions30d}
- Cancelled Subscriptions (30d): ${context.cancelledSubscriptions30d}
- Churn Rate: ${context.churnRate}%
- New Customers (30d): ${context.newCustomers30d}
- Available Cash: $${context.availableBalance}
- Estimated Monthly Burn: (derived from payouts)
- Runway: ${context.runway === 9999 ? 'Profitable / Infinite' : context.runway + ' days'}

RULES:
- Generate exactly 4 insights: 1 about cash/runway, 1 about churn/retention, 1 about growth, 1 opportunity
- Each insight must be specific to the numbers above — no generic advice
- If runway < 60 days: type = "critical". If churn > 5%: type = "warning". Wins get type = "win". Otherwise "opportunity"
- Metric field: pull the single most important number from that insight (e.g. "47 days", "8.2% churn")
- Keep body to 1-2 sentences max. Be blunt, specific, actionable.
- Action = short 2-3 word CTA like "Review pricing" or "View customers"

Respond ONLY with valid JSON array, no markdown, no preamble:
[
  {
    "id": "insight_1",
    "type": "critical|warning|opportunity|win",
    "title": "...",
    "body": "...",
    "action": "...",
    "metric": "...",
    "priority": 1
  },
  ...
]`

    const rawText = await callHeavyAI(undefined, prompt)
    const raw = rawText || '[]'

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const insights: AIInsight[] = JSON.parse(clean)

    // Sort by priority
    insights.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({ insights, provider: 'lucrum-ai' })
  } catch (error: any) {
    console.error('[ai/insights] error:', error)
    return NextResponse.json({
      insights: buildFallbackInsights(context),
      provider: 'fallback',
    })
  }
}

```

---

## FILE: src/hooks/useStripeData.ts

```ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { StripeMetrics, AIInsight, CFOContext } from '@/types'

interface UseStripeDataReturn {
  metrics: StripeMetrics | null
  insights: AIInsight[]
  loading: boolean
  insightsLoading: boolean
  error: string | null
  isDemoData: boolean
  lastRefreshed: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL_MS = 60_000 // auto-refresh every 60s
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const STRIPE_DATA_URL = DEMO_MODE ? '/api/stripe/data?demo=1' : '/api/stripe/data'
const STRIPE_DEMO_URL = '/api/stripe/data?demo=1'

export function useStripeData(): UseStripeDataReturn {
  const [metrics, setMetrics]           = useState<StripeMetrics | null>(null)
  const [insights, setInsights]         = useState<AIInsight[]>([])
  const [loading, setLoading]           = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isDemoData, setIsDemoData]     = useState<boolean>(DEMO_MODE)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cacheKeyRef = useRef<string>('lucrum:lastInsights:v1')
  const usingDemoFallbackRef = useRef<boolean>(DEMO_MODE)

  const fetchInsights = useCallback(async (ctx: CFOContext) => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
      if (res.ok) {
        const data = await res.json()
        const next = data.insights ?? []
        setInsights(next)
        try {
          localStorage.setItem(cacheKeyRef.current, JSON.stringify({ savedAt: Date.now(), insights: next }))
        } catch {
          // ignore
        }
      } else {
        // If AI fails, try cached insights
        try {
          const raw = localStorage.getItem(cacheKeyRef.current)
          const parsed = raw ? JSON.parse(raw) : null
          if (parsed?.insights?.length) setInsights(parsed.insights)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err)
      // If offline or API fails, try cached insights
      try {
        const raw = localStorage.getItem(cacheKeyRef.current)
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed?.insights?.length) setInsights(parsed.insights)
      } catch {
        // ignore
      }
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const primaryUrl = usingDemoFallbackRef.current ? STRIPE_DEMO_URL : STRIPE_DATA_URL
      let res = await fetch(primaryUrl)

      // If Stripe is disconnected, transparently switch to demo payloads.
      if (!res.ok && res.status === 401 && !usingDemoFallbackRef.current) {
        const demoRes = await fetch(STRIPE_DEMO_URL)
        if (demoRes.ok) {
          usingDemoFallbackRef.current = true
          res = demoRes
        }
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data: StripeMetrics = await res.json()
      setMetrics(data)
      setError(null)
      setIsDemoData(usingDemoFallbackRef.current || primaryUrl.includes('demo=1'))
      setLastRefreshed(new Date())

      // After we have metrics, fetch AI insights with the real context
      const ctx: CFOContext = {
        mrr: data.mrr,
        mrrGrowth: data.mrrGrowth,
        revenue30d: data.revenue30d,
        revenueGrowth: data.revenueGrowth,
        activeSubscriptions: data.activeSubscriptions,
        newSubscriptions30d: data.newSubscriptions30d,
        churnRate: data.churnRate,
        newCustomers30d: data.newCustomers30d,
        availableBalance: data.availableBalance,
        runway: data.runway,
        cancelledSubscriptions30d: data.cancelledSubscriptions30d,
      }
      fetchInsights(ctx)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Stripe data')
    } finally {
      setLoading(false)
    }
  }, [fetchInsights])

  // Initial load
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(fetchMetrics, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMetrics])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchMetrics()
  }, [fetchMetrics])

  return { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh }
}

```

---

## FILE: src/lib/stripe.ts

```ts
import Stripe from 'stripe'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Pinned API version — used everywhere for consistency
export const STRIPE_API_VERSION = '2023-10-16' as const
export const STRIPE_KEY_COOKIE = 'stripe_key'
const ENCRYPTION_PREFIX = 'v1'

// Server-side Stripe instance (uses env key for webhooks & server ops)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: STRIPE_API_VERSION,
})

// Create a user-scoped Stripe client from their stored key
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}

// Validate Stripe key format before making any API calls
export function isValidStripeKey(key: string): boolean {
  return (
    key.startsWith('sk_live_') ||
    key.startsWith('sk_test_') ||
    key.startsWith('rk_live_') ||
    key.startsWith('rk_test_')
  )
}

function getCookieEncryptionKey(): Buffer | null {
  const raw = process.env.COOKIE_ENCRYPTION_KEY
  if (!raw) return null
  // Normalize arbitrary-length env secret into a fixed 32-byte key.
  return createHash('sha256').update(raw).digest()
}

export function encryptStripeKey(secretKey: string): string | null {
  const key = getCookieEncryptionKey()
  if (!key) return null

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secretKey, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decryptStripeKey(ciphertext: string): string | null {
  if (!ciphertext.startsWith(`${ENCRYPTION_PREFIX}.`)) return null

  const key = getCookieEncryptionKey()
  if (!key) return null

  const [, ivB64, tagB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !dataB64) return null

  try {
    const iv = Buffer.from(ivB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')
    const encrypted = Buffer.from(dataB64, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

// Get Stripe key from request cookies (encrypted in production).
export function getStripeKeyFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined }
): string | null {
  const raw = cookies.get(STRIPE_KEY_COOKIE)?.value
  if (!raw) return null

  if (raw.startsWith(`${ENCRYPTION_PREFIX}.`)) {
    return decryptStripeKey(raw)
  }

  // Backward compatibility for local dev sessions created before encryption.
  if (process.env.NODE_ENV !== 'production') {
    return raw
  }

  return null
}

```

---

## FILE: src/lib/utils.ts

```ts
import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, showPlus = true): string {
  const prefix = showPlus && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

/**
 * Calculate days of runway.
 * balance = current cash available
 * monthlyNetBurn = expenses - revenue (positive = burning cash)
 */
export function calculateRunway(balance: number, monthlyNetBurn: number): number {
  if (monthlyNetBurn <= 0) return 9999 // profitable or breakeven = infinite runway
  return Math.floor((balance / monthlyNetBurn) * 30)
}

/**
 * MoM MRR growth as a percentage
 */
export function calculateMRRGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Churn rate = cancelled subs in period / active subs at start of period
 */
export function calculateChurnRate(cancelled: number, activeAtStart: number): number {
  if (activeAtStart === 0) return 0
  return (cancelled / activeAtStart) * 100
}

/**
 * Rough self-employment / income tax estimate (US)
 * Uses tiered brackets as a guide, not legal advice
 */
export function estimateTax(annualRevenue: number): { federal: number; selfEmployment: number; total: number } {
  const selfEmployment = annualRevenue * 0.153 * 0.9235 // SE tax on 92.35% of net
  let federal = 0
  if (annualRevenue <= 11600) federal = annualRevenue * 0.10
  else if (annualRevenue <= 47150) federal = 1160 + (annualRevenue - 11600) * 0.12
  else if (annualRevenue <= 100525) federal = 5426 + (annualRevenue - 47150) * 0.22
  else federal = 17168 + (annualRevenue - 100525) * 0.24
  return {
    federal: Math.round(federal),
    selfEmployment: Math.round(selfEmployment),
    total: Math.round(federal + selfEmployment),
  }
}

/**
 * Return last N days as YYYY-MM-DD strings, most recent last
 */
export function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

/**
 * Format a UNIX timestamp as a relative time string
 */
export function timeAgo(unixTs: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixTs
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/**
 * Compact number formatter: 1200 → "1.2K", 1500000 → "1.5M"
 */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

```

---

## FILE: src/types/index.ts

```ts
// ─── Stripe Data ────────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string      // YYYY-MM-DD  (not weekday name — ordered correctly)
  label: string     // "Mon 3", "Tue 4" etc — display label
  revenue: number
}

export interface MonthlyMRR {
  month: string     // "Jan", "Feb" etc
  mrr: number
}

export interface StripeMetrics {
  // Core financials
  mrr: number
  mrrPrevious: number
  mrrGrowth: number          // % change MoM
  revenue30d: number         // total paid charges last 30 days
  revenuePrev30d: number     // total paid charges 31-60 days ago
  revenueGrowth: number      // % change

  // Subscriptions
  activeSubscriptions: number
  newSubscriptions30d: number
  cancelledSubscriptions30d: number
  churnRate: number          // % of subs that cancelled

  // Customers
  totalCustomers: number
  newCustomers30d: number

  // Cash
  availableBalance: number
  pendingBalance: number
  estimatedMonthlyBurn: number  // expenses approximated from payouts + refunds
  runway: number                // days

  // Charts
  dailyRevenue: DailyRevenue[]
  mrrHistory: MonthlyMRR[]

  // Activity feed
  recentEvents: StripeEvent[]

  // Meta
  currency: string
  fetchedAt: number  // unix timestamp
}

export interface StripeEvent {
  id: string
  type: 'payment' | 'subscription' | 'refund' | 'dispute' | 'payout' | 'other'
  amount: number
  currency: string
  description: string
  customerId: string | null
  customerEmail: string | null
  created: number
  status: string
  positive: boolean
}

// ─── AI ─────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'win'

export interface AIInsight {
  id: string
  type: InsightSeverity
  title: string
  body: string
  action: string
  metric?: string   // e.g. "47 days"
  priority: 1 | 2 | 3  // 1 = highest
}

export interface CFOContext {
  mrr: number
  mrrGrowth: number
  revenue30d: number
  revenueGrowth: number
  activeSubscriptions: number
  newSubscriptions30d: number
  churnRate: number
  newCustomers30d: number
  availableBalance: number
  runway: number
  cancelledSubscriptions30d: number
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

```
