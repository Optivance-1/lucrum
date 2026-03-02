# Lucrum — AI CFO for Stripe Builders

> Connect your Stripe. Get your AI CFO. Stop guessing, start growing.

## What this is

Lucrum is a financial intelligence layer that sits on top of Stripe. Founders connect their Stripe account and get:

- **Live, accurate MRR** — calculated from subscriptions, not charges
- **Real churn rate** — cancelled subs / active subs at period start
- **Actual cash runway** — balance vs real monthly burn
- **AI-generated insights** — dynamic, based on your real numbers
- **Conversational AI CFO** — powered by Claude, with your real metrics as context

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom design system
- **Charts**: Recharts
- **Payments Data**: Stripe API v2023-10-16
- **AI Engine**: Anthropic Claude (claude-sonnet-4-20250514)
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
ANTHROPIC_API_KEY=sk-ant-...
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

## Market-Leader Execution Plan

- Full 20-workstream execution backlog:
  - `docs/MARKET_LEADER_BACKLOG.md`

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
