# Lucrum — AI CFO for Stripe Builders

> Connect your Stripe. Get your AI CFO. Stop guessing, start growing.

## What this is

Lucrum is a financial intelligence layer that sits on top of Stripe. Founders connect their Stripe account and get:

- Live MRR, revenue, and growth dashboards
- AI-powered cash flow forecasting
- Churn prediction and pricing recommendations
- A conversational AI CFO powered by Claude

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Payments Data**: Stripe API
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

Fill in:

```env
# Your Stripe key (for webhooks & server ops)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Anthropic API key for AI CFO
ANTHROPIC_API_KEY=sk-ant-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Set up Stripe webhook (optional for Phase 1)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── connect/page.tsx      # Stripe connect / onboarding
│   ├── dashboard/page.tsx    # Main AI CFO dashboard
│   └── api/
│       ├── stripe/
│       │   ├── connect/      # POST: validate + store Stripe key
│       │   ├── data/         # GET: fetch live Stripe metrics
│       │   └── webhook/      # POST: handle Stripe events
│       └── ai/
│           └── cfo/          # POST: AI CFO question answering
├── lib/
│   ├── stripe.ts             # Stripe client helpers
│   └── utils.ts              # Formatting, calculations
└── types/
    └── index.ts              # TypeScript types
```

## Phase 1 Roadmap (Complete)

- [x] Landing page with pricing
- [x] Stripe key onboarding flow
- [x] Live metrics dashboard (MRR, revenue, customers)
- [x] AI CFO chat (powered by Claude)
- [x] Webhook handler for real-time events
- [x] Charts (MRR growth, daily revenue)

## Phase 2 Roadmap (Next)

- [ ] Auth system (NextAuth.js)
- [ ] Database (Postgres + Prisma)
- [ ] Encrypted key storage
- [ ] Email briefings (daily AI CFO report)
- [ ] Cash flow forecasting (90-day model)
- [ ] Churn prediction model
- [ ] Pricing recommendation engine
- [ ] Multi-account support

## Phase 3 Roadmap (Revenue Layer)

- [ ] Subscription billing (Stripe for Lucrum)
- [ ] Freemium gating
- [ ] Team accounts
- [ ] API access for power users
- [ ] Slack/Discord integrations

## Notes on Security (Important for Production)

Phase 1 stores the Stripe key in an httpOnly cookie for demo purposes. Before going live you must:

1. Add proper auth (NextAuth, Clerk, etc.)
2. Encrypt keys at rest (use `@anthropic-ai/sdk` encryption or a KMS)
3. Store in a database with user association
4. Add rate limiting on API routes
5. Use environment-specific Stripe keys
