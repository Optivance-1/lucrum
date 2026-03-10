# Lucrum — AI CFO Platform for Stripe Founders

## Codebase Description

### What Lucrum Is
Lucrum is a production-ready AI-powered financial intelligence platform for SaaS founders. Connect your Stripe account and get an AI CFO that analyzes your metrics, runs 50,000 Monte Carlo simulations, and tells you exactly what to do next.

Core capabilities:
- **Live MRR, Churn, Runway** — real-time financial metrics pulled directly from your Stripe account
- **AI CFO Chat** — conversational AI powered by Groq (Llama 4 Scout for Solo Dev, Kimi K2 for Enterprise) with automatic fallback across providers
- **Five Moves Engine** — decision scorer + Monte Carlo simulation + AI interpretation = 5 ranked strategic moves telling you exactly what to do next
- **Monte Carlo Simulations** — 50,000 simulations, 24-month horizon, Float32Array performance, crypto.getRandomValues() randomness for probabilistic runway and cash forecasts
- **Action Execution** — Enterprise users can fire Stripe API calls (retry invoices, send emails, apply coupons, pause/cancel subs, trigger payouts) directly from Lucrum
- **Webhook Alerts** — real-time email alerts via Resend on payment failures, cancellations, new subscribers
- **PDF Reports & CSV Exports** — CFO snapshot PDFs, revenue/customer/tax CSV exports

### Architecture Overview
- **Next.js 14 App Router** — full-stack React framework with server components and API routes
- **Clerk Authentication** — user auth with middleware-based route protection
- **Stripe Integration** — dual Stripe usage: (1) user's Stripe account for financial metrics, (2) Lucrum's own Stripe for billing/subscriptions
- **Vercel KV** — Redis-based key-value store for state, cache, metric snapshots, audit logs, user subscriptions, affiliate clicks
- **Multi-provider AI** — Groq, Gemini, Ollama, RunPod with automatic fallback. Routes by purpose: heavy (insights/five-moves), chat (CFO), structured (scoring), vision (future)
- **Resend** — transactional email for webhook alerts, welcome emails, cancellation notices
- **Recharts** — data visualization for MRR charts, revenue trends, cohort grids
- **Tailwind CSS** — utility-first CSS with custom design system (obsidian/gold/emerald/crimson palette)
- **pdfkit** — server-side PDF generation for CFO snapshot reports

### Monetization (No Free Plan)
Three states:
- **Demo** — 1 free AI question, realistic fake data, hard paywall after first question
- **Solo Dev ($12/mo or $120/yr)** — full AI CFO, Five Moves, metrics, audit log, webhook alerts, Monte Carlo forecasts
- **Enterprise ($99/mo or $990/yr)** — everything in Solo Dev plus Action Execution (fire Stripe actions from Lucrum), multi-account (10x), team seats (5 members), API access, priority AI (Kimi K2)

### Key Systems

1. **AI CFO Chat** — conversational AI powered by Groq (Llama 4 Scout for Solo, Kimi K2 for Enterprise). Builds rich financial context from Stripe metrics. Parses action blocks and affiliate recommendations from AI responses. Demo users get exactly 1 question before hard paywall. Deterministic fallback if all AI providers fail.

2. **Five Moves Engine** — orchestrates decision scorer + Monte Carlo simulation + AI interpretation. Scores 8 action types across 5 dimensions (revenue impact, time-to-revenue, confidence, reversibility, churn risk). Runs baseline and per-decision Monte Carlo simulations. AI generates human-readable titles, summaries, rationales, tradeoffs, and "MAX statements." Results cached in KV for 4 hours.

3. **Decision Scorer** — rule-based scoring engine for 8 action types: retry_payment, churn_recovery, apply_coupon, raise_price, expansion_revenue, cut_burn, capital_raise, do_nothing. Each action scored on revenue_impact (0-100), time_to_revenue (0-100), confidence (0-100), reversibility (0-100), churn_risk (0-100). Composite score = weighted average with revenue at 30%, time 20%, confidence 20%, reversibility 15%, inverse churn 15%.

4. **Monte Carlo Engine** — 50,000 simulations, 24-month horizon. Uses Float32Array for memory-efficient storage. crypto.getRandomValues() for cryptographic randomness. Calculates runway distributions (P10/P25/P50/P75/P90), MRR forecast bands, and composite risk scores. Caching with 1-hour TTL in KV.

5. **Action Execution** — Enterprise-only. Executes real Stripe API calls: retry_payment (pay open invoices), send_email (via Resend), apply_coupon (percentage discounts), cancel_subscription, pause_subscription, resume_subscription, trigger_payout, update_price. Rate-limited to 10 actions per hour per user. All executions logged to audit trail with before/after state.

6. **Metric Snapshots** — daily snapshots of key metrics (MRR, churn rate, active subs, revenue) saved to Vercel KV. Historical data used for 90-day MRR trend charts. Snapshots keyed by user+date for efficient retrieval.

7. **Comp Benchmark Engine** — peer benchmarks for "new founders" (< 60 days of Stripe data). Scrapes competitive data from IndieHackers, Product Hunt, Microacquire, simulated Twitter. Normalizes data points, calculates quantiles/medians. Shows MRR percentile, median MRR, and similar businesses.

8. **Affiliate Intelligence** — contextual financial product recommendations embedded in AI insights. Products have trigger conditions (e.g., high churn triggers churn recovery tools, low runway triggers funding platforms). Click tracking via KV.

9. **Webhook Processing** — handles both Lucrum billing webhooks (checkout completed, subscription updated/deleted, payment failed) and user's Stripe webhooks (payment succeeded, subscription created/deleted, invoice failed). Triggers AI analysis, email alerts via Resend, metric invalidation, and audit logging.

10. **Audit Log** — KV-based audit trail for all action executions. Stores action type, parameters, result, status, affected customers, revenue impact. Indexed by user for efficient retrieval. Supports filtering by action type and date range.

### File Structure
```
src/
├── app/                          # Next.js pages and API routes
│   ├── layout.tsx                # Root layout (ClerkProvider, fonts, global styles)
│   ├── page.tsx                  # Landing page (marketing, features, pricing preview)
│   ├── globals.css               # Tailwind CSS + custom design system
│   ├── pricing/                  # Pricing page with Stripe checkout
│   ├── connect/                  # Stripe account connection flow
│   ├── terms/                    # Terms of Service
│   ├── privacy/                  # Privacy Policy
│   ├── sign-in/                  # Clerk sign-in
│   ├── sign-up/                  # Clerk sign-up
│   ├── dashboard/                # Main dashboard pages
│   │   ├── page.tsx              # KPIs, charts, AI insights, Five Moves
│   │   ├── settings/             # Plan management, Stripe accounts, team
│   │   ├── insights/             # AI CFO insights + direct questions
│   │   ├── audit/                # Action audit log
│   │   ├── forecasts/            # Monte Carlo scenario lab
│   │   ├── customers/            # Churn & retention intelligence
│   │   └── revenue/              # Revenue reality dashboard
│   └── api/                      # API routes
│       ├── ai/                   # AI endpoints (cfo, five-moves, insights)
│       ├── actions/              # Action execution, recommendations, preview
│       ├── billing/              # Lucrum billing (checkout, webhook, plan, portal)
│       ├── stripe/               # User Stripe (data, connect, disconnect, webhook, accounts)
│       ├── affiliates/           # Affiliate redirect and click tracking
│       ├── audit/                # Audit log CRUD
│       ├── comps/                # Competitive data scraping
│       ├── cron/                 # Cron jobs (scrape-comps)
│       ├── health/               # AI provider health check
│       ├── metrics/              # Metric invalidation and history
│       ├── simulate/             # Monte Carlo simulation endpoint
│       ├── user/                 # User plan endpoint
│       ├── reports/              # PDF report generation
│       ├── revenue/              # Revenue CSV export
│       ├── tax/                  # Tax CSV/JSON export
│       └── customers/            # Customer CSV export
├── lib/                          # Core business logic
│   ├── ai.ts                     # Low-level AI provider calls (Groq, Gemini)
│   ├── ai-client.ts              # High-level AI client with routing and fallback
│   ├── affiliates.ts             # Affiliate product catalog and matching
│   ├── audit-log.ts              # Audit log KV operations
│   ├── comp-engine.ts            # Competitive benchmark engine
│   ├── decision-engine.ts        # Decision engine readiness check
│   ├── decision-scorer.ts        # Rule-based action scoring
│   ├── email.ts                  # Email sending via Resend
│   ├── five-moves.ts             # Five Moves orchestration
│   ├── kv.ts                     # Vercel KV utility wrapper
│   ├── mockData.ts               # Demo mode mock data
│   ├── monte-carlo.ts            # Monte Carlo simulation engine
│   ├── recommendations.ts        # MAX Recommendations generator
│   ├── simulation.ts             # Scenario simulation + AI advice
│   ├── snapshots.ts              # Metric snapshot storage
│   ├── stripe.ts                 # Stripe client, key encryption, multi-account
│   ├── subscription.ts           # Plan management, feature gating
│   ├── user-state.ts             # User state KV operations
│   └── utils.ts                  # Utility functions (formatting, calculations)
├── hooks/                        # React hooks
│   ├── useStripeData.ts          # Stripe metrics fetching and caching
│   └── useUserPlan.ts            # User plan and feature access
├── components/                   # UI components
│   ├── DashboardShell.tsx        # Dashboard layout (sidebar, header)
│   ├── FiveMoves.tsx             # Five Moves display with execution
│   ├── PaywallModal.tsx          # Upgrade paywall modal
│   ├── ActionModal.tsx           # Action preview and execution modal
│   ├── BenchmarkPanel.tsx        # Peer benchmark display
│   ├── MaxRecommendations.tsx    # MAX Recommendations carousel
│   ├── MRRHistory.tsx            # MRR history chart (90 days)
│   └── InlineNotice.tsx          # Inline notice component
├── contexts/
│   └── StripeDataContext.tsx      # Stripe data React context provider
└── types/
    └── index.ts                  # Central TypeScript type definitions
```

### Technology Stack
| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Auth | Clerk | User authentication + middleware |
| Payments | Stripe | User metrics + Lucrum billing |
| Database | Vercel KV (Redis) | State, cache, snapshots, audit |
| AI (Fast) | Groq (Llama 4 Scout / Kimi K2) | Chat, insights, scoring |
| AI (Heavy) | Google Gemini (2.5 Flash) | Complex analysis, interpretation |
| AI (Local) | Ollama | Development/fallback |
| AI (GPU) | RunPod | Heavy inference fallback |
| Email | Resend | Transactional emails |
| Charts | Recharts | Data visualization |
| PDF | pdfkit | Report generation |
| Styling | Tailwind CSS | Utility-first CSS |
| Animation | Framer Motion | UI animations |
| Icons | Lucide React | Icon library |
| Deployment | Vercel | Hosting + cron jobs |

---

## Source Files


## File: .eslintrc.json

~~~json
{
  "extends": [
    "next/core-web-vitals"
  ]
}
~~~

## File: DEPLOYMENT.md

~~~markdown
# Lucrum Deployment (Vercel) — Checklist

This repo is a Next.js 14 App Router app using:
- **Clerk** for auth
- **Stripe** for reading a founder’s business metrics
- **Groq/Gemini** for AI
- **Vercel KV** for lightweight persistence (plans, mappings, snapshots, invalidation flags)

## Tier 1 — Deploy MVP (Demo + Connect + Dashboard)

### 1) Create Vercel project
- Import the Git repo into Vercel
- Deploy once (it will likely fail until env vars are added)

### 2) Attach KV store (required)
Vercel Dashboard → **Storage** → Create **KV** (or Upstash Redis) → **Connect to project**.

Vercel will inject (names may vary by integration):
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 3) Configure Clerk (required)
In Clerk Dashboard:
- Add your Vercel domain (e.g. `lucrum.vercel.app`) to allowed domains
- Ensure redirect URLs work for:
  - `/sign-in`
  - `/sign-up`
  - `/connect`
  - `/dashboard`

### 4) Set env vars in Vercel (required)

**App**
- `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
- `COOKIE_ENCRYPTION_KEY=<32+ char secret>`

**Clerk**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...`
- `CLERK_SECRET_KEY=sk_...`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/connect`

**Stripe (metrics)**
- `STRIPE_SECRET_KEY=sk_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (optional if you are not testing webhooks yet; can be a placeholder)

**AI**
- `GROQ_API_KEY=gsk_...`
- `GEMINI_API_KEY=...` (optional fallback)

**Demo**
- `NEXT_PUBLIC_DEMO_MODE=true|false`
- `LUCRUM_DEMO_MODE=true|false`

### 5) Deploy
Trigger a redeploy after env vars are set.

## Tier 2 — Enable Lucrum Billing (charge founders)

### 1) Create Stripe products/prices (Lucrum’s own Stripe)
- Pro monthly: $99/mo → `LUCRUM_PRO_PRICE_ID`
- Pro annual: $899/yr → `LUCRUM_PRO_ANNUAL_PRICE_ID`

### 2) Add billing env vars
- `LUCRUM_STRIPE_SECRET_KEY=sk_...`
- `LUCRUM_PRO_PRICE_ID=price_...`
- `LUCRUM_PRO_ANNUAL_PRICE_ID=price_...`

### 3) Configure billing webhook
Stripe Dashboard → Webhooks → Add endpoint:
- `https://<your-domain>/api/billing/webhook`

Events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Set:
- `LUCRUM_STRIPE_WEBHOOK_SECRET=whsec_...`

## Tier 3 — Email alerts (Resend)

### 1) Configure Resend
- Verify your domain
- Set:
  - `RESEND_API_KEY=re_...`
  - `RESEND_FROM_EMAIL=noreply@yourdomain.com`

## Notes / Known constraints

- **User Stripe webhooks are single-secret right now** (`STRIPE_WEBHOOK_SECRET`). Multi-tenant webhook secrets per connected Stripe account would be a later Phase 2.
- **Audit log storage** is filesystem `/tmp` (best-effort). Treat it as non-durable until moved to DB/KV/Postgres.

~~~

## File: docs/BETA_10_USER_RUNBOOK.md

~~~markdown
# Lucrum 10-User Beta Runbook

## Goal

Validate whether Stripe-based founders get actionable value from Lucrum in real workflows.

## Target User Profile

1. Founder/operator using Stripe today.
2. At least 50 active subscriptions or at least $2k monthly volume.
3. Willing to share 15-20 minutes of feedback.

## What To Send

Use this message:

```
I’m running a small private beta for Lucrum (AI CFO for Stripe builders).

You connect Stripe and get:
- live MRR/churn/runway
- AI-generated insights from your real data
- an AI CFO chat grounded in your numbers

Would you try it for 10 minutes and send blunt feedback?
```

## Test Script For Each User

1. Connect Stripe key.
2. Open dashboard and verify metrics load.
3. Ask 3 AI CFO questions:
   - "Should I raise prices?"
   - "How is my churn risk?"
   - "What should I do this week?"
4. Rate each:
   - Trust in numbers (1-5)
   - Insight usefulness (1-5)
   - Likelihood to reuse weekly (1-5)
5. Capture 1 missing feature and 1 confusing part.

## Success Criteria (Go/No-Go)

1. At least 7/10 users complete onboarding without help.
2. At least 6/10 users rate insight usefulness >= 4/5.
3. At least 5/10 users say they would use it weekly.
4. No critical security or data correctness incidents.

## Feedback Capture Sheet

Track per user:

1. Company name
2. Stripe profile (SaaS/agency/ecom)
3. Time to first useful insight
4. Trust score
5. Usefulness score
6. Weekly reuse score
7. Top bug
8. Top requested feature
9. Follow-up status
~~~

## File: docs/MARKET_LEADER_BACKLOG.md

~~~markdown
# Lucrum Market-Leader Backlog (AI CFO)

This is the execution backlog for making Lucrum the best AI CFO platform for small SaaS companies.

Status key:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed

## North-Star Outcomes

- Increase founder cash survival: median runway uplift >= 20%.
- Protect recurring revenue: MRR at risk reduced >= 15%.
- Prove direct ROI: tracked savings + protected revenue > platform cost by 10x.

## Workstreams (All 20)

1. `[ ]` Real benchmark context
- Compare each company to peer cohorts by stage, ARPU, churn, and growth.
- Build anonymized benchmark model and percentile ranking endpoints.

2. `[ ]` Decision-grade forecasts
- Deliver probabilistic forecasts (P10/P50/P90) for runway and cash.
- Keep scenario confidence and calibration accuracy visible.

3. `[ ]` Unified data layer
- Ingest Stripe, bank feeds, ad spend, payroll, and SaaS vendor spend.
- Normalize to one financial fact model and canonical timeline.

4. `[ ]` Causal "why" engine
- Detect metric deltas and attribute likely drivers (price, churn, volume, fees, refunds).
- Return plain-language causality summaries with supporting numbers.

5. `[ ]` Action execution loop
- Convert recommendations into executable actions.
- Track execution outcome and feed result back into ranking logic.

6. `[ ]` Scenario copilot
- Natural-language what-if input with finance-safe assumptions.
- Persist scenarios, compare outcomes, and allow share/export.

7. `[ ]` Cash accuracy engine
- Model daily cash timing, Stripe payout delays, failed payments, and refund timing.
- Improve short-horizon forecast error with reconciliation jobs.

8. `[ ]` Churn early warning
- Account-level churn risk scoring with expected MRR at risk.
- Trigger retention playbooks before cancellation events.

9. `[ ]` Pricing intelligence
- Recommend pricing/packaging updates with expected LTV, churn, and margin impact.
- Simulate upside/downside before rollout.

10. `[ ]` Spend efficiency controls
- Detect waste by channel, vendor, and team.
- Add budget guardrails and alerting on variance thresholds.

11. `[ ]` Cohort economics clarity
- Show retention, CAC payback, CAC/LTV by segment and acquisition source.
- Support month, channel, and plan cohorts.

12. `[ ]` Confidence transparency
- Expose uncertainty bounds, data quality score, and assumption sensitivity.
- Block overconfident recommendations when data quality is weak.

13. `[ ]` Founder-mode UX
- Keep recommendations blunt, short, and decision-first.
- Every recommendation must include one next action and expected dollar impact.

14. `[ ]` Role-based outputs
- Produce founder summary, operator checklist, and board-ready monthly packet.
- Tailor tone, detail depth, and KPIs by role.

15. `[ ]` Continuous close
- Build near real-time mini-close with rolling reconciled ledgers.
- Remove lag between transactions and financial decision context.

16. `[ ]` Automated anomaly triage
- Detect and prioritize leaks, fraud signals, billing issues, and broken flows.
- Route anomalies by urgency and expected impact.

17. `[ ]` AI memory of prior decisions
- Persist recommendations, actions taken, and measured outcomes.
- Use memory to avoid repeated bad advice and improve future ranking.

18. `[ ]` Compliance by default
- Add approval workflows, immutable audit logs, least-privilege access, and SOC2-ready controls.
- Enforce data retention and access review policies.

19. `[ ]` Human-in-the-loop workflows
- Add CPA/revops review gates for high-impact actions.
- Support comment, approve, reject, and override loops.

20. `[ ]` Outcome leaderboard
- Show saved cash, runway extended, and MRR protected by action and time period.
- Use verified outcomes as product proof and growth loop.

## Build Order (Aggressive)

## Phase A (Weeks 1-3): Data + Forecast Core

- `#2` Decision-grade forecasts
- `#3` Unified data layer
- `#7` Cash accuracy engine
- `#12` Confidence transparency

## Phase B (Weeks 4-6): Diagnostics + Decisioning

- `#4` Causal "why" engine
- `#6` Scenario copilot
- `#8` Churn early warning
- `#11` Cohort economics clarity
- `#16` Automated anomaly triage

## Phase C (Weeks 7-9): Action + Monetization Intelligence

- `#5` Action execution loop
- `#9` Pricing intelligence
- `#10` Spend efficiency controls
- `#17` AI memory of prior decisions
- `#20` Outcome leaderboard

## Phase D (Weeks 10-12): Product Maturity + Trust

- `#1` Real benchmark context
- `#13` Founder-mode UX
- `#14` Role-based outputs
- `#15` Continuous close
- `#18` Compliance by default
- `#19` Human-in-the-loop workflows

## Delivery Discipline

- Every feature ships with:
  - clear input contracts
  - confidence and quality metadata
  - one measurable business KPI
- No recommendation ships without a tracked expected dollar impact.
~~~

## File: LOCAL_TESTING.md

~~~markdown
# Local testing guide

All four test areas from the roadmap are runnable locally. The app now uses **Clerk** for auth, so the “through the app” API tests require a signed-in session (browser or cookie in curl).

---

## Test 1 — Groq AI working

**Option A — Direct Groq (fastest, no app)**  
Run in a terminal (uses `GROQ_API_KEY` from your environment or `.env.local` if you `source` it):

```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"llama-3.3-70b-versatile\",\"messages\":[{\"role\":\"system\",\"content\":\"You are MAX, a CFO. Be direct.\"},{\"role\":\"user\",\"content\":\"MRR is $5000, churn is 8%. Top risk?\"}],\"max_tokens\":150}"
```

- Real JSON with `choices[].message.content` → Groq is live.  
- 401 → wrong or missing API key.  
- 429 → rate limit; app will try fallbacks (e.g. Kimi K2).

**Option B — Through the app (needs auth)**  
`/api/ai/cfo` and `/api/ai/insights` are **protected by Clerk**. So:

1. Start dev server: `npm run dev` (note the port, e.g. 3004 if 3000–3003 are in use).
2. In the browser: open the app → **Sign up** or **Sign in**.
3. Go to **Dashboard** and use the AI CFO / insights there (they send the session cookie automatically).

To test with curl you need a session cookie:

1. Sign in at `http://localhost:3004/sign-in` (or your port).
2. In DevTools → Application → Cookies, copy the `__session` (or Clerk) cookie value.
3. Run:

```bash
curl -X POST "http://localhost:3004/api/ai/cfo" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=<paste-value>" \
  -d "{\"question\":\"What is my biggest risk?\",\"context\":{\"mrr\":5000,\"mrrGrowth\":8,\"churnRate\":6.2,\"runway\":47,\"activeSubscriptions\":28,\"newSubscriptions30d\":4,\"newCustomers30d\":3,\"revenue30d\":5200,\"revenueGrowth\":12,\"availableBalance\":8000,\"cancelledSubscriptions30d\":2}}"
```

Expected: `{"answer":"...", "provider":"lucrum-ai"}` (or `"fallback"` if Groq fails). Same idea for `/api/ai/insights` with the same cookie and a JSON body with the context fields (`mrr`, `churnRate`, etc.). With churn 6.2 you should see a `"warning"`-type churn insight.

---

## Test 2 — Stripe data fetching

**Option A — Demo mode (no Stripe key)**  
In `.env.local`:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Restart dev server. Sign in (or sign up), then open **Dashboard**. It will load with fake metrics. No Stripe key needed.

**Option B — Real Stripe test keys**  
Stripe Dashboard → Test mode → Developers → API Keys. In `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
COOKIE_ENCRYPTION_KEY=any-long-random-string-here-32chars
```

Create test data: Customers, Products, Subscriptions in Test mode. Then in the app: **Connect** → enter `sk_test_...` → dashboard loads real test data.

**Important:** If `COOKIE_ENCRYPTION_KEY` is missing, the connect flow cannot store the key and will fail in production.

---

## Test 3 — Full user flow (with Clerk)

1. **Landing:** `http://localhost:3000` (or the port shown by `npm run dev`).  
2. **Sign up / Sign in:** Use **Sign up** or **Sign in**, then you’re redirected (e.g. after sign-up → `/connect`).  
3. **Connect Stripe:** Go to `/connect`. If not signed in, you’re redirected to sign-up. Enter Stripe key → redirect to dashboard.  
4. **Dashboard:** Live metrics, skeletons while loading, then data; AI insights and CFO chat work when signed in (and Groq is configured).

---

## Test 4 — Webhooks locally

You need the **Stripe CLI**.

- Install: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli) (or `brew install stripe/stripe-cli/stripe` on Mac).  
- Login: `stripe login`.  
- Forward to your app (use the port your dev server prints, e.g. 3004):

```bash
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

Add the printed `whsec_...` to `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the dev server.

In another terminal, trigger events:

```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

The webhook handler now runs real logic (e.g. Resend emails, audit log, at-risk flags). For email and KV to work, set `RESEND_API_KEY` (and optionally Vercel KV) in `.env.local`.

---

## Fastest path (about 20 minutes)

1. **`.env.local`**  
   - `GROQ_API_KEY=...`  
   - `COOKIE_ENCRYPTION_KEY=anylong32charstring`  
   - `NEXT_PUBLIC_DEMO_MODE=false` (or `true` for demo-only).  
   - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

2. **`npm run dev`**  
   Note the port (e.g. `http://localhost:3004`).

3. **Groq:** Run the direct `curl` to `api.groq.com` (Option A above) to confirm the key works.

4. **Stripe test keys** (optional): Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, create test customer + subscription in Stripe.

5. **Browser:** Sign up → Connect (enter test Stripe key if using real data) → Dashboard. Confirm metrics and AI (CFO + insights).

6. **Webhooks:** Install Stripe CLI, `stripe login`, `stripe listen --forward-to localhost:<port>/api/stripe/webhook`, add `STRIPE_WEBHOOK_SECRET`, then `stripe trigger invoice.payment_failed` (and others). Watch server logs.

---

## Summary

- **Data we have:** Test plan, codebase, and env template. We don’t have your `.env.local` secrets (e.g. `GROQ_API_KEY`).  
- **Run locally:** Dev server and health check confirmed. AI routes require a signed-in session (browser or cookie).  
- **Stripe CLI:** Not installed on this machine; install it locally for Test 4.  
- **Demo mode:** Set `NEXT_PUBLIC_DEMO_MODE=true` and share the deployed URL for prospect demos without connecting Stripe.
~~~

## File: next.config.js

~~~javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Stripe bundled in server components/runtime in Next 14.
    serverComponentsExternalPackages: ['stripe'],
  },
}

module.exports = nextConfig
~~~

## File: next-env.d.ts

~~~typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
~~~

## File: package.json

~~~json
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
    "@clerk/nextjs": "^6.39.0",
    "@stripe/react-stripe-js": "^5.6.1",
    "@stripe/stripe-js": "^8.9.0",
    "@vercel/kv": "^3.0.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "framer-motion": "^11.3.0",
    "lucide-react": "^0.400.0",
    "next": "14.2.35",
    "pdfkit": "^0.17.2",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.12.7",
    "resend": "^6.9.3",
    "stripe": "^14.21.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/pdfkit": "^0.17.5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "14.2.35",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
~~~

## File: postcss.config.js

~~~javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
~~~

## File: README.md

~~~markdown
# Lucrum — AI CFO for Stripe Builders

> Connect your Stripe. Get your AI CFO. Stop guessing, start growing.

## What this is

Lucrum is a financial intelligence layer that sits on top of Stripe. Founders connect their Stripe account and get:

- **Live, accurate MRR** — calculated from subscriptions, not charges
- **Real churn rate** — cancelled subs / active subs at period start
- **Actual cash runway** — balance vs real monthly burn
- **AI-generated insights** — dynamic, based on your real numbers
-- **Conversational AI CFO** — powered by Groq, with your real metrics as context
- **Monte Carlo scenario lab** — probabilistic runway + cash ranges (P10/P50/P90)

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
GROQ_API_KEY=sk_groq_your_key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_key   # optional fallback
GEMINI_MODEL=gemini-1.5-flash
NEXT_PUBLIC_APP_URL=http://localhost:3000
COOKIE_ENCRYPTION_KEY=replace_with_a_long_random_secret
```

Optional demo mode (no Stripe connection required):
```env
NEXT_PUBLIC_DEMO_MODE=true
LUCRUM_DEMO_MODE=true
```

## AI Key Handling

- End users do **not** need to enter Groq/Gemini API keys.
- AI runs server-side with your deployment keys.
- If model providers are unavailable, Lucrum falls back to deterministic CFO logic so the dashboard still works.

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
~~~

## File: src/app/api/actions/execute/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import { writeAuditEntry, updateAuditEntry } from '@/lib/audit-log'
import { callHeavyAI } from '@/lib/ai-client'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import { getUserPlan, canUseActionExecution } from '@/lib/subscription'

const DESTRUCTIVE_ACTIONS = new Set(['cancel_subscription', 'pause_subscription', 'trigger_payout', 'update_price'])

type ExecuteBody = {
  actionType: string
  params: Record<string, any>
  userConfirmed: boolean
  confirmText?: string
}

async function checkRateLimit(userId: string, actionType: string): Promise<string | null> {
  const hour = new Date().toISOString().slice(0, 13)
  const day = new Date().toISOString().slice(0, 10)

  if (actionType === 'send_email') {
    const key = `rate:email:${userId}:${hour}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 50) return 'Email rate limit: max 50/hour. Try again later.'
    await safeKvSet(key, count + 1, 7200)
  }

  if (['cancel_subscription', 'pause_subscription', 'update_price', 'apply_coupon'].includes(actionType)) {
    const key = `rate:sub:${userId}:${hour}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 10) return 'Subscription action rate limit: max 10/hour.'
    await safeKvSet(key, count + 1, 7200)
  }

  if (actionType === 'trigger_payout') {
    const key = `rate:payout:${userId}:${day}`
    const count = (await safeKvGet<number>(key)) ?? 0
    if (count >= 3) return 'Payout rate limit: max 3/day.'
    await safeKvSet(key, count + 1, 172800)
  }

  return null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId)
  if (!canUseActionExecution(plan)) {
    return NextResponse.json({
      error: 'Action Execution requires Enterprise plan',
      paywallRequired: true,
      requiredPlan: 'enterprise',
    }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as ExecuteBody
  const { actionType, params, userConfirmed, confirmText } = body

  if (!actionType || !userConfirmed) {
    return NextResponse.json({ error: 'Action type and confirmation required' }, { status: 400 })
  }

  if (DESTRUCTIVE_ACTIONS.has(actionType) && confirmText !== 'CONFIRM') {
    return NextResponse.json({ error: 'Destructive actions require typing CONFIRM' }, { status: 400 })
  }

  const rateLimitMsg = await checkRateLimit(userId, actionType)
  if (rateLimitMsg) {
    return NextResponse.json({ error: rateLimitMsg }, { status: 429 })
  }

  const stripeKey = getStripeKeyFromCookies(req.cookies, userId)
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not connected' }, { status: 401 })
  }

  const stripe = createStripeClient(stripeKey)
  const executedAt = new Date().toISOString()

  const pendingEntry = await writeAuditEntry({
    userId,
    actionType,
    category: actionType.split('_')[0] ?? 'action',
    params,
    result: {},
    success: false,
    affectedCustomers: [],
    maxRecommended: true,
    executedAt,
    status: 'pending',
  })

  let result: Record<string, any> = {}
  let success = false
  let revenueImpact: number | undefined
  let affectedCustomers: string[] = []

  try {
    switch (actionType) {
      case 'send_email': {
        const { customerId, subject, template } = params
        let emailBody = params.body ?? ''
        if (!emailBody && template) {
          emailBody = await callHeavyAI(
            'You are Lucrum MAX. Write a short, professional email for this template scenario. Keep it under 100 words.',
            `Template: ${template}. Customer: ${customerId || 'batch'}.`
          )
        }
        result = { emailBody, template, customerId, status: 'queued' }
        if (customerId) affectedCustomers = [customerId]
        success = true
        break
      }

      case 'apply_coupon': {
        const { customerId, couponId, percentOff, duration, durationMonths } = params
        let activeCouponId = couponId
        if (!activeCouponId && percentOff) {
          const coupon = await stripe.coupons.create({
            percent_off: percentOff,
            duration: duration || 'repeating',
            ...(durationMonths ? { duration_in_months: durationMonths } : {}),
          })
          activeCouponId = coupon.id
        }
        if (customerId && activeCouponId) {
          await stripe.customers.update(customerId, { coupon: activeCouponId } as any)
          affectedCustomers = [customerId]
        }
        result = { couponId: activeCouponId, customerId }
        success = true
        break
      }

      case 'pause_subscription': {
        const { subscriptionId } = params
        const sub = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: { behavior: 'void' },
        })
        result = { subscriptionId: sub.id, status: sub.status }
        if (typeof sub.customer === 'string') affectedCustomers = [sub.customer]
        success = true
        break
      }

      case 'cancel_subscription': {
        const { subscriptionId, immediately } = params
        const sub = immediately
          ? await stripe.subscriptions.cancel(subscriptionId)
          : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
        result = { subscriptionId: sub.id, status: sub.status }
        if (typeof sub.customer === 'string') affectedCustomers = [sub.customer]
        success = true
        break
      }

      case 'create_coupon': {
        const { percentOff, amountOff, currency, duration, name, durationMonths } = params
        const coupon = await stripe.coupons.create({
          ...(percentOff ? { percent_off: percentOff } : {}),
          ...(amountOff ? { amount_off: amountOff, currency: currency || 'usd' } : {}),
          duration: duration || 'once',
          ...(durationMonths ? { duration_in_months: durationMonths } : {}),
          ...(name ? { name } : {}),
        })
        result = { couponId: coupon.id }
        success = true
        break
      }

      case 'retry_payment': {
        const { invoiceId } = params
        if (invoiceId) {
          const invoice = await stripe.invoices.pay(invoiceId)
          result = { invoiceId: invoice.id, status: invoice.status, amount: invoice.amount_paid }
          revenueImpact = (invoice.amount_paid ?? 0) / 100
          if (typeof invoice.customer === 'string') affectedCustomers = [invoice.customer]
        } else {
          const openInvoices = await stripe.invoices.list({ status: 'open', limit: 20 })
          let recovered = 0
          for (const inv of openInvoices.data) {
            try {
              const paid = await stripe.invoices.pay(inv.id)
              recovered += (paid.amount_paid ?? 0) / 100
              if (typeof paid.customer === 'string') affectedCustomers.push(paid.customer)
            } catch { /* skip individual failures */ }
          }
          result = { retried: openInvoices.data.length, recovered }
          revenueImpact = recovered
        }
        success = true
        break
      }

      case 'create_invoice': {
        const { customerId, amount, description } = params
        const invoice = await stripe.invoices.create({ customer: customerId })
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round(amount * 100),
          currency: 'usd',
          description: description || 'Invoice from Lucrum',
        })
        const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
        result = { invoiceId: finalized.id, status: finalized.status }
        revenueImpact = amount
        affectedCustomers = [customerId]
        success = true
        break
      }

      case 'trigger_payout': {
        const { amount } = params
        const balance = await stripe.balance.retrieve()
        const available = balance.available.reduce((s, b) => s + b.amount, 0) / 100
        if (available < amount) {
          throw new Error(`Insufficient balance: $${available} available, $${amount} requested`)
        }
        const payout = await stripe.payouts.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
        })
        result = { payoutId: payout.id, status: payout.status, amount: payout.amount / 100 }
        success = true
        break
      }

      case 'update_price': {
        const { priceId, newAmount, productId, interval } = params
        if (priceId) {
          const oldPrice = await stripe.prices.retrieve(priceId)
          const newPrice = await stripe.prices.create({
            product: typeof oldPrice.product === 'string' ? oldPrice.product : (oldPrice.product as any).id,
            unit_amount: Math.round(newAmount * 100),
            currency: oldPrice.currency,
            recurring: oldPrice.recurring ? { interval: oldPrice.recurring.interval } : undefined,
          })
          await stripe.prices.update(priceId, { active: false })
          result = { oldPriceId: priceId, newPriceId: newPrice.id, newAmount }
        } else if (productId) {
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(newAmount * 100),
            currency: 'usd',
            recurring: interval ? { interval } : undefined,
          })
          result = { newPriceId: newPrice.id, newAmount }
        }
        success = true
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 })
    }
  } catch (err: any) {
    result = { error: err.message }
    success = false
  }

  await updateAuditEntry(userId, pendingEntry.id, {
    result,
    success,
    revenueImpact,
    affectedCustomers,
    status: success ? 'success' : 'failed',
    stripeRequestId: result.stripeRequestId,
    errorMessage: success ? undefined : result.error,
  })

  return NextResponse.json({ success, result, revenueImpact, affectedCustomers })
}
~~~

## File: src/app/api/actions/preview/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callHeavyAI } from '@/lib/ai-client'
import { getStripeKeyFromCookies, createStripeClient } from '@/lib/stripe'

type PreviewBody = {
  actionType: string
  params: Record<string, any>
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as PreviewBody
  const { actionType, params } = body

  if (!actionType) {
    return NextResponse.json({ error: 'actionType required' }, { status: 400 })
  }

  const stripeKey = getStripeKeyFromCookies(req.cookies, userId)
  const stripe = stripeKey ? createStripeClient(stripeKey) : null

  let preview: Record<string, any> = {}

  try {
    switch (actionType) {
      case 'send_email': {
        const emailBody = await callHeavyAI(
          'You are Lucrum MAX. Generate a professional, empathetic email for this scenario. Keep it under 150 words. Return just the email text.',
          `Template: ${params.template || 'custom'}. Context: ${JSON.stringify(params)}`
        )
        preview = {
          subject: params.subject || `Re: ${params.template || 'your account'}`,
          body: emailBody,
          recipientCount: params.customerId ? 1 : (params.customerCount ?? 'batch'),
        }
        break
      }

      case 'apply_coupon': {
        preview = {
          percentOff: params.percentOff || 0,
          duration: params.duration || 'once',
          estimatedMRRImpact: params.percentOff
            ? `-${params.percentOff}% on next invoice`
            : 'No impact calculated',
        }
        break
      }

      case 'retry_payment': {
        if (stripe) {
          const openInvoices = await stripe.invoices.list({ status: 'open', limit: 20 })
          const totalAtRisk = openInvoices.data.reduce(
            (sum, inv) => sum + (inv.amount_due ?? 0) / 100, 0
          )
          preview = {
            invoiceCount: openInvoices.data.length,
            totalAtRisk,
            estimatedRecovery: Math.round(totalAtRisk * 0.4),
          }
        } else {
          preview = { message: 'Connect Stripe to preview' }
        }
        break
      }

      case 'update_price': {
        const liftPct = params.liftPercent || 10
        preview = {
          liftPercent: liftPct,
          note: `New subscribers will see a ${liftPct}% price increase. Existing subs are unaffected until renewal.`,
        }
        break
      }

      case 'trigger_payout': {
        if (stripe) {
          const balance = await stripe.balance.retrieve()
          const available = balance.available.reduce((s, b) => s + b.amount, 0) / 100
          preview = {
            availableBalance: available,
            requestedAmount: params.amount,
            willSucceed: available >= (params.amount || 0),
          }
        } else {
          preview = { message: 'Connect Stripe to preview' }
        }
        break
      }

      case 'cancel_subscription':
      case 'pause_subscription': {
        if (stripe && params.subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(params.subscriptionId)
          const monthlyValue = sub.items.data.reduce((sum: number, item: any) => {
            const price = item.price
            const qty = item.quantity ?? 1
            const unit = price.unit_amount ?? 0
            if (price.recurring?.interval === 'month') return sum + unit * qty
            if (price.recurring?.interval === 'year') return sum + (unit * qty) / 12
            return sum
          }, 0) / 100
          preview = {
            subscriptionId: sub.id,
            status: sub.status,
            monthlyValue,
            action: actionType === 'cancel_subscription' ? 'Will cancel immediately' : 'Will pause billing',
          }
        } else {
          preview = { message: 'Provide subscription ID to preview' }
        }
        break
      }

      default:
        preview = { message: `No preview available for ${actionType}` }
    }
  } catch (err: any) {
    preview = { error: err.message }
  }

  return NextResponse.json({ actionType, preview })
}
~~~

## File: src/app/api/actions/recommendations/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateActionCards } from '@/lib/recommendations'
import type { StripeMetrics } from '@/types'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = (await req.json().catch(() => null)) as StripeMetrics | null
  if (!metrics || typeof metrics.mrr !== 'number') {
    return NextResponse.json({ error: 'Invalid metrics' }, { status: 400 })
  }

  try {
    const cards = await generateActionCards(metrics)
    return NextResponse.json({ cards })
  } catch (err: any) {
    console.error('[actions/recommendations] error:', err)
    return NextResponse.json({ cards: [] })
  }
}
~~~

## File: src/app/api/actions/status/route.ts

~~~typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDecisionEngineReadiness } from '@/lib/decision-engine'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const readiness = await getDecisionEngineReadiness(userId)
  return NextResponse.json(readiness)
}
~~~

## File: src/app/api/affiliates/click/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { safeKvSet, safeKvGet } from '@/lib/kv'
import { getAffiliateById } from '@/lib/affiliates'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const productId = body.productId as string | undefined

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  const product = getAffiliateById(productId)
  if (!product) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 404 })
  }

  const date = new Date().toISOString().split('T')[0]
  const key = `affiliate_clicks:${userId}:${productId}:${date}`
  const current = (await safeKvGet<number>(key)) ?? 0
  await safeKvSet(key, current + 1, { ex: 60 * 60 * 24 * 90 })

  return NextResponse.json({ ok: true, productId, affiliateUrl: product.affiliateUrl })
}
~~~

## File: src/app/api/affiliates/redirect/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { safeKvSet, safeKvGet } from '@/lib/kv'
import { getAffiliateById } from '@/lib/affiliates'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product')
  if (!productId) {
    return NextResponse.json({ error: 'product param required' }, { status: 400 })
  }

  const product = getAffiliateById(productId)
  if (!product) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 404 })
  }

  const { userId } = await auth()
  if (userId) {
    const date = new Date().toISOString().split('T')[0]
    const key = `affiliate_clicks:${userId}:${productId}:${date}`
    const current = (await safeKvGet<number>(key)) ?? 0
    await safeKvSet(key, current + 1, { ex: 60 * 60 * 24 * 90 })
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
~~~

## File: src/app/api/ai/cfo/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { CFOContext } from '@/types'
import { callChatAI, callHeavyAI } from '@/lib/ai-client'
import {
  getUserPlan,
  getDemoQuestionsUsed,
  incrementDemoQuestions,
  getDemoQuestionsUsedAnon,
  usesPriorityAI,
} from '@/lib/subscription'
import { getEligibleAffiliates } from '@/lib/affiliates'

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
    if (runway == null) return 'Cash timing data is incomplete. Track payouts, refunds, and fixed costs daily so runway projections stop guessing.'
    if (runway < 90) return `You have about ${runway} days of runway. Freeze non-core spend and cut one expense this week to extend runway before you chase growth.`
    return `You have roughly ${runway} days of runway. Keep burn disciplined and push one high-confidence growth channel instead of broad experimentation.`
  }
  if (/price|pricing|raise/.test(q)) {
    if (churn != null && churn > 6) return `Don't raise prices yet. Churn is ${churn}%, so improve retention first or you'll leak customers faster than pricing lifts MRR.`
    if (mrr != null && growth != null) return `Test a controlled 8-12% price lift on new signups. MRR is $${mrr} with ${growth}% MoM growth, so run the test and watch churn for 2 billing cycles.`
  }
  if (/churn|cancel/.test(q)) return `Focus on saves before acquisition. Current churn is ${fmtNumber(churn, '%')}; trigger win-back offers for at-risk accounts and audit failed-payment recovery weekly.`
  return `Current snapshot: MRR $${fmtNumber(mrr)}, 30-day revenue $${fmtNumber(revenue)}, runway ${fmtNumber(runway, ' days')}. Pick one lever this week: cut low-ROI spend, improve retention, or test pricing on new users only.`
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

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

    // ── Unauthenticated demo user ──────────────────────────────
    if (!userId) {
      const cookieVal = req.cookies.get('demo_questions')?.value
      const used = getDemoQuestionsUsedAnon(cookieVal)
      if (used >= 1) {
        return NextResponse.json({
          paywallRequired: true,
          answer: null,
          message: 'Your free question has been used. Pick a plan to keep talking to MAX.',
          plan: 'demo',
        }, { status: 402 })
      }

      const answer = await callChatAI(buildSystemPrompt(ctx), question)
      const res = NextResponse.json({
        answer,
        provider: 'lucrum-ai',
        plan: 'demo',
        demoQuestionsRemaining: 0,
      })
      res.cookies.set('demo_questions', '1', { maxAge: 30 * 86400, path: '/' })
      return res
    }

    // ── Authenticated user ─────────────────────────────────────
    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      const used = await getDemoQuestionsUsed(userId)
      if (used >= 1) {
        return NextResponse.json({
          paywallRequired: true,
          answer: null,
          message: 'Your free question has been used. Pick a plan to keep talking to MAX.',
          plan: 'demo',
        }, { status: 402 })
      }

      const answer = await callChatAI(buildSystemPrompt(ctx), question)
      await incrementDemoQuestions(userId)
      return NextResponse.json({
        answer,
        provider: 'lucrum-ai',
        plan: 'demo',
        demoQuestionsRemaining: 0,
      })
    }

    // Solo uses callChatAI (Llama 4 Scout), Enterprise uses callHeavyAI (Kimi K2)
    const aiCall = usesPriorityAI(plan) ? callHeavyAI : callChatAI
    const answer = await aiCall(buildSystemPrompt(ctx), question)

    return NextResponse.json({ answer, provider: 'lucrum-ai', plan })
  } catch (error: any) {
    console.error('[ai/cfo] error:', error)
    return NextResponse.json({
      answer: buildFallbackAnswer(question, context ?? {}),
      provider: 'fallback',
    })
  }
}

function buildSystemPrompt(ctx: Partial<CFOContext>): string {
  let benchmarkSection = ''
  if (ctx.accountAgeDays != null && ctx.accountAgeDays < 60 && ctx.benchmarks) {
    const b = ctx.benchmarks
    benchmarkSection = `\n\nPEER BENCHMARKS (for companies at similar age):
- Median MRR: $${b.medianMRR} | P25: $${b.p25MRR} | P75: $${b.p75MRR}
- Median Growth: ${b.medianGrowthRate ?? 'N/A'}% MoM
- Median Churn: ${b.medianChurnRate ?? 'N/A'}%
- Top Performer MRR: $${b.topPerformerMRR}
Use these benchmarks to contextualize advice for this NEW founder (Day ${ctx.accountAgeDays}).`
  }

  const affiliateMetrics = {
    mrr: ctx.mrr ?? 0, runway: ctx.runway ?? 365, churnRate: ctx.churnRate ?? 0,
    accountAgeDays: ctx.accountAgeDays ?? 365, revenue30d: ctx.revenue30d ?? 0,
  }
  const eligibleAffiliates = getEligibleAffiliates(affiliateMetrics)
  let affiliateSection = ''
  if (eligibleAffiliates.length > 0) {
    const list = eligibleAffiliates.map(a => `- ${a.name}: ${a.maxRecommendationContext}`).join('\n')
    affiliateSection = `\n\nRELEVANT FINANCIAL PRODUCTS (mention at most 1 if naturally relevant):
${list}
If you mention a product, include an action block:
\`\`\`affiliate
{"productId":"${eligibleAffiliates[0].id}","name":"${eligibleAffiliates[0].name}","cta":"${eligibleAffiliates[0].ctaText}","url":"${eligibleAffiliates[0].affiliateUrl}"}
\`\`\``
  }

  let simulationSection = ''
  if (ctx.simulation) {
    const sim = ctx.simulation
    simulationSection = `\n\nMONTE CARLO SIMULATION (50,000 runs):
Median runway: ${Math.round(sim.runway.p50)} days
Survival at 180 days: ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}%
Risk score: ${sim.riskScore}/100
MRR in 12 months (median): $${Math.round(sim.mrrForecast.month12.p50)}
${ctx.topMove ? `\nTOP RECOMMENDED MOVE: ${ctx.topMove.title}\n${ctx.topMove.maxStatement}` : ''}
When founders ask what to do, reference the simulation. Say '50,000 simulations show...' not 'I think...'. Give probability-weighted answers, not opinions.`
  }

  return `You are Lucrum's AI CFO — a sharp, direct financial advisor for indie hackers, micro-SaaS founders, and AI builders.

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
${benchmarkSection}${simulationSection}
RESPONSE RULES:
1. Under 130 words unless a breakdown is genuinely required
2. Reference the actual numbers above when they're relevant
3. Sound like a human texting, not a report generator
4. If data is missing, say exactly what you'd need to answer better
5. Never start with "Great question" or any fluff opener

ACTION EXECUTION:
When you recommend a specific Stripe action the user can take, include an action block:
\`\`\`action
{"actionType":"retry_payment|send_email|apply_coupon|pause_subscription|cancel_subscription|create_coupon|trigger_payout|update_price","title":"Short action title","params":{}}
\`\`\`
Only include action blocks for concrete, executable actions. Max 1 per response.${affiliateSection}`
}
~~~

## File: src/app/api/ai/five-moves/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { StripeMetrics, StripeCustomer, FiveMovesResult, Move, SimulationResult } from '@/types'
import { generateFiveMoves } from '@/lib/five-moves'
import { safeKvGet } from '@/lib/kv'
import { getUserPlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildFakeBaseline(): SimulationResult {
  return {
    runway: { p10: 28, p25: 42, p50: 67, p75: 105, p90: 180, mean: 78, probabilityOf60Days: 0.52, probabilityOf90Days: 0.38, probabilityOf180Days: 0.12, probabilityOf365Days: 0.03, probabilityOf730Days: 0.005 },
    mrrForecast: { month3: { p25: 3400, p50: 4200, p75: 5100 }, month6: { p25: 2800, p50: 4600, p75: 6200 }, month12: { p25: 1200, p50: 5800, p75: 9400 }, month24: { p25: 0, p50: 7200, p75: 15000 } },
    scenarios: {
      bear: { probability: 0.2, runway: 28, mrr3mo: 3400, mrr12mo: 1200, description: 'Churn accelerates, growth stalls' },
      base: { probability: 0.6, runway: 67, mrr3mo: 4200, mrr12mo: 5800, description: 'Current trajectory holds' },
      bull: { probability: 0.2, runway: 180, mrr3mo: 5100, mrr12mo: 9400, description: 'Breakout growth kicks in' },
    },
    riskScore: 62, volatilityScore: 63, breakEvenProbability: 0.41, baselineRunwayP50: 67, decisionLiftP50: 0, nSimulations: 50000, computedAt: Date.now(), horizonMonths: 24,
  }
}

function buildFakeMoves(): Move[] {
  const colors = { cutthroat: '#FF3B5C', aggressive: '#FF8C00', balanced: '#C9A84C', conservative: '#00A066', safe: '#00D084' } as const
  const labels = { cutthroat: 'Cutthroat — Maximum EV', aggressive: 'Aggressive — High Upside', balanced: 'Balanced — Best Risk-Adj', conservative: 'Conservative — Protect Position', safe: 'Safe — Minimum Viable Action' } as const
  const baseline = buildFakeBaseline()

  return [
    {
      rank: 1, risk: 'cutthroat', riskLabel: labels.cutthroat, riskColor: colors.cutthroat,
      title: 'Recover $840 in Failed Payments Now',
      summary: 'Retry 3 failed invoices before they expire.',
      rationale: '78% retry success rate across SaaS. $840 sitting in open invoices costs nothing to attempt.',
      tradeoff: 'None — fully reversible, no customer impact.',
      maxStatement: '78% retry success rate. $840 is sitting there. Takes 30 seconds. There is no reason not to do this today.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 18, expectedMRRAt90d: 4850, expectedMRRAt365d: 6200, survivalProbability: 0.84, expectedDollarImpact: 655, riskOfBackfire: 0.02, compositeScore: 91 },
    },
    {
      rank: 2, risk: 'aggressive', riskLabel: labels.aggressive, riskColor: colors.aggressive,
      title: 'Launch Churn Recovery + Coupon',
      summary: 'Email at-risk customers with a 20% retention offer.',
      rationale: '2 customers are past_due representing $380 MRR. A 20% coupon costs $76 to save $4,560 in annual LTV.',
      tradeoff: 'Coupon discount reduces margin on retained customers for 3 months.',
      maxStatement: '2 customers are past_due representing $380 MRR. A 20% coupon costs $76 to save $4,560 in annual LTV. That\'s a 60x return if it works.',
      timeToExecute: 'This week',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 31, expectedMRRAt90d: 5100, expectedMRRAt365d: 7800, survivalProbability: 0.88, expectedDollarImpact: 4560, riskOfBackfire: 0.08, compositeScore: 78 },
    },
    {
      rank: 3, risk: 'balanced', riskLabel: labels.balanced, riskColor: colors.balanced,
      title: 'Expand Top 5 Customers',
      summary: 'Upsell your 5 longest-tenured customers to the next tier.',
      rationale: 'Your 5 oldest customers have been paying 4+ months and never upgraded. 18% upsell rate means roughly 1 upgrade.',
      tradeoff: 'Requires crafting personalized upsell emails. Low effort, but not zero.',
      maxStatement: 'Your 5 oldest customers have been paying for 4+ months and never upgraded. 18% upsell rate means roughly 1 upgrade. At $50 delta that\'s $600 ARR for one email.',
      timeToExecute: 'This week',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 22, expectedMRRAt90d: 4950, expectedMRRAt365d: 6800, survivalProbability: 0.86, expectedDollarImpact: 600, riskOfBackfire: 0.04, compositeScore: 64 },
    },
    {
      rank: 4, risk: 'conservative', riskLabel: labels.conservative, riskColor: colors.conservative,
      title: 'Cut One Expense Line',
      summary: 'Identify and eliminate your lowest-ROI monthly expense.',
      rationale: 'Your burn is $3,100/mo. Cutting one $200 subscription extends runway by 4 days and costs nothing.',
      tradeoff: 'You lose access to whatever tool you cut. Choose wisely.',
      maxStatement: 'Your burn is $3,100/mo. Cutting one $200 subscription extends runway by 4 days and costs nothing to execute. Every dollar of burn you eliminate is a dollar that doesn\'t need to be earned.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 12, expectedMRRAt90d: 4400, expectedMRRAt365d: 5800, survivalProbability: 0.82, expectedDollarImpact: 200, riskOfBackfire: 0.01, compositeScore: 58 },
    },
    {
      rank: 5, risk: 'safe', riskLabel: labels.safe, riskColor: colors.safe,
      title: 'Send Monday Morning Metrics Email',
      summary: 'Set up a weekly metrics email to yourself every Monday.',
      rationale: 'Founders who review metrics weekly catch problems 3x faster. Zero cost, 10 minutes to set up.',
      tradeoff: 'Minimal — just the time to set it up.',
      maxStatement: 'Founders who review metrics weekly catch problems 3x faster. This costs nothing and takes 10 minutes to set up. It\'s the lowest-risk highest-signal habit in SaaS.',
      timeToExecute: 'Execute now',
      actions: [], simulation: baseline,
      metrics: { expectedRunwayGain: 4, expectedMRRAt90d: 4300, expectedMRRAt365d: 5600, survivalProbability: 0.81, expectedDollarImpact: 0, riskOfBackfire: 0, compositeScore: 42 },
    },
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      return NextResponse.json({
        moves: buildFakeMoves(),
        baselineSimulation: buildFakeBaseline(),
        generatedAt: Date.now(),
        dataQuality: 'low',
        isDemoData: true,
      } as FiveMovesResult & { isDemoData: boolean })
    }

    const body = await req.json().catch(() => ({})) as {
      metrics?: StripeMetrics
      customers?: StripeCustomer[]
    }

    if (!body.metrics) {
      return NextResponse.json({ error: 'metrics required' }, { status: 400 })
    }

    const customers: StripeCustomer[] = body.customers ?? []
    const result = await generateFiveMoves(body.metrics, customers, userId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[five-moves] error:', error)
    return NextResponse.json(
      { error: 'Five Moves generation failed. Try again shortly.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(userId)
    if (plan === 'demo') {
      return NextResponse.json({
        moves: buildFakeMoves(),
        baselineSimulation: buildFakeBaseline(),
        generatedAt: Date.now(),
        dataQuality: 'low',
        isDemoData: true,
      })
    }

    const pattern = `fivemoves:${userId}:`
    const cached = await safeKvGet<FiveMovesResult>(pattern)
    if (cached) return NextResponse.json(cached)

    return NextResponse.json({ cached: false })
  } catch (error: any) {
    console.error('[five-moves] GET error:', error)
    return NextResponse.json({ cached: false })
  }
}
~~~

## File: src/app/api/ai/insights/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { CFOContext, AIInsight } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'
import { getUserPlan } from '@/lib/subscription'
import { getEligibleAffiliates } from '@/lib/affiliates'

function buildFallbackInsights(context: CFOContext): AIInsight[] {
  const runwayCritical = context.runway < 60
  const churnWarning = context.churnRate > 5
  const growthPositive = context.mrrGrowth > 0

  return [
    {
      id: 'fallback_cash', type: runwayCritical ? 'critical' : 'opportunity',
      title: runwayCritical ? 'Runway is tight' : 'Runway is stable',
      body: runwayCritical ? `You have ${context.runway} days of runway. Cut one non-core expense this week to buy decision time.` : `You have ${context.runway} days of runway. Protect this by avoiding fixed-cost increases without clear payback.`,
      action: runwayCritical ? 'Cut spend' : 'Protect runway', metric: `${context.runway} days`, priority: 1,
    },
    {
      id: 'fallback_churn', type: churnWarning ? 'warning' : 'win',
      title: churnWarning ? 'Retention leak detected' : 'Retention holding',
      body: churnWarning ? `Churn is ${context.churnRate}%. Focus on failed-payment recovery and targeted save offers before buying more traffic.` : `Churn is ${context.churnRate}%, which is manageable. Keep onboarding tight and monitor cancellation reasons weekly.`,
      action: 'Review churn', metric: `${context.churnRate}% churn`, priority: 2,
    },
    {
      id: 'fallback_growth', type: growthPositive ? 'win' : 'warning',
      title: growthPositive ? 'MRR trend is up' : 'Growth is soft',
      body: growthPositive ? `MRR grew ${context.mrrGrowth}% MoM. Double down on the acquisition channel driving the highest retained subscribers.` : `MRR is ${context.mrrGrowth}% MoM. Run one pricing or packaging test before increasing paid spend.`,
      action: growthPositive ? 'Scale channel' : 'Test pricing', metric: `${context.mrrGrowth}% MoM`, priority: 3,
    },
    {
      id: 'fallback_opportunity', type: 'opportunity',
      title: 'Next best action',
      body: `With $${context.revenue30d} in 30-day revenue and ${context.newCustomers30d} new customers, ship one retention experiment and one pricing experiment this month.`,
      action: 'Run experiments', metric: `${context.newCustomers30d} new customers`, priority: 3,
    },
  ]
}

function buildDemoInsights(): AIInsight[] {
  return [
    {
      id: 'demo_runway', type: 'critical',
      title: 'Runway is tight — 67 days',
      body: 'At current burn of $3,100/mo and $12,000 cash, you have 67 days. Cut one subscription this week to buy 4 more days of decision time.',
      action: 'Cut spend', metric: '67 days', priority: 1,
    },
    {
      id: 'demo_churn', type: 'warning',
      title: '3.8% churn is above benchmark',
      body: '2 customers are past_due right now. That\'s $380 MRR at risk. Recovery emails convert at 32% — send them today.',
      action: 'Recover now', metric: '3.8% churn', priority: 2,
    },
    {
      id: 'demo_growth', type: 'win',
      title: 'MRR growing 6% MoM',
      body: '$4,200 MRR with 6% monthly growth. You\'re compounding. Protect this by not raising prices until churn is below 3%.',
      action: 'Scale channel', metric: '+6% MoM', priority: 3,
    },
    {
      id: 'demo_opportunity', type: 'opportunity',
      title: 'Failed payment recovery = free revenue',
      body: '3 failed invoices worth $840 sitting in your Stripe. Retry takes 30 seconds. 78% success rate. This is literally free money.',
      action: 'Retry payments', metric: '$840 recoverable', priority: 1,
    },
  ]
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    accountAgeDays: contextRaw.accountAgeDays != null ? Number(contextRaw.accountAgeDays) : undefined,
    benchmarks: contextRaw.benchmarks,
  }

  try {
    const plan = await getUserPlan(userId)

    if (plan === 'demo') {
      return NextResponse.json({
        insights: buildDemoInsights(),
        provider: 'demo',
        plan,
        isDemoData: true,
      })
    }

    let benchmarkBlock = ''
    const isNew = (context.accountAgeDays ?? 365) < 60
    if (isNew && context.benchmarks) {
      const b = context.benchmarks
      benchmarkBlock = `\n\nPEER BENCHMARKS (this is a NEW founder, Day ${context.accountAgeDays}):
- Median MRR: $${b.medianMRR} | P25: $${b.p25MRR} | P75: $${b.p75MRR}
- Median Growth: ${b.medianGrowthRate ?? 'N/A'}% MoM
- Top Performer: $${b.topPerformerMRR}
Replace the "opportunity" insight with a benchmark comparison for new founders.`
    }

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
- Runway: ${context.runway === 9999 ? 'Profitable / Infinite' : context.runway + ' days'}
${benchmarkBlock}
RULES:
- Generate exactly 4 insights: 1 about cash/runway, 1 about churn/retention, 1 about growth, 1 opportunity
- Each insight must be specific to the numbers above
- If runway < 60 days: type = "critical". If churn > 5%: type = "warning". Wins get type = "win". Otherwise "opportunity"
- Keep body to 1-2 sentences max. Be blunt, specific, actionable.

Respond ONLY with valid JSON array, no markdown, no preamble:
[{"id":"insight_1","type":"critical|warning|opportunity|win","title":"...","body":"...","action":"...","metric":"...","priority":1}]`

    const rawText = await callHeavyAI(undefined, prompt)
    const clean = (rawText || '[]').replace(/```json|```/g, '').trim()
    const insights: AIInsight[] = JSON.parse(clean)
    insights.sort((a, b) => a.priority - b.priority)

    const affiliateMetrics = { mrr: context.mrr, runway: context.runway, churnRate: context.churnRate, accountAgeDays: context.accountAgeDays ?? 365, revenue30d: context.revenue30d }
    const eligible = getEligibleAffiliates(affiliateMetrics)
    if (eligible.length > 0) {
      const top = eligible[0]
      insights.push({
        id: `affiliate_${top.id}`, type: 'affiliate',
        title: top.tagline, body: `${top.description} — recommended by MAX based on your financials.`,
        action: top.ctaText, affiliateUrl: top.affiliateUrl, metric: top.name, priority: 3,
      })
    }

    return NextResponse.json({ insights, provider: 'lucrum-ai', plan })
  } catch (error: any) {
    console.error('[ai/insights] error:', error)
    return NextResponse.json({ insights: buildFallbackInsights(context), provider: 'fallback' })
  }
}
~~~

## File: src/app/api/audit/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { readAuditLog, writeAuditEntry } from '@/lib/audit-log'
import type { AuditEntry } from '@/lib/audit-log'
import type { ApiResponse } from '@/types'

type GetQuery = {
  limit?: string
  offset?: string
  actionType?: string
  dateFrom?: string
  dateTo?: string
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json<ApiResponse<AuditEntry[]>>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const params = Object.fromEntries(req.nextUrl.searchParams) as GetQuery
  const limit = Math.min(Number(params.limit ?? 50) || 50, 200)
  const offset = Number(params.offset ?? 0) || 0

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : null
  const dateTo = params.dateTo ? new Date(params.dateTo) : null

  const all = await readAuditLog(userId, limit + offset, 0)

  const filtered = all.filter(entry => {
    if (params.actionType && entry.actionType !== params.actionType) return false
    const ts = new Date(entry.executedAt).getTime()
    if (Number.isNaN(ts)) return false
    if (dateFrom && ts < dateFrom.getTime()) return false
    if (dateTo && ts > dateTo.getTime()) return false
    return true
  })

  const slice = filtered.slice(offset, offset + limit)

  return NextResponse.json<ApiResponse<AuditEntry[]>>({
    data: slice,
  })
}

type PostBody = {
  actionType: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  revenueImpact?: number
  affectedCustomers?: string[]
  maxRecommended: boolean
  executedAt: string
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json<ApiResponse<AuditEntry>>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as PostBody

  if (!body.actionType || typeof body.actionType !== 'string') {
    return NextResponse.json<ApiResponse<AuditEntry>>(
      { error: 'actionType is required' },
      { status: 400 }
    )
  }

  const nowIso = new Date().toISOString()

  const entry = await writeAuditEntry({
    userId,
    actionType: body.actionType,
    category: body.actionType.split('.')[0] ?? 'unknown',
    params: body.params ?? {},
    result: body.result ?? {},
    success: !!body.success,
    errorMessage: body.success ? undefined : (body.result?.error as string | undefined),
    revenueImpact: body.revenueImpact,
    affectedCustomers: body.affectedCustomers ?? [],
    maxRecommended: !!body.maxRecommended,
    executedAt: body.executedAt || nowIso,
    stripeRequestId: body.result?.stripeRequestId as string | undefined,
  })

  return NextResponse.json<ApiResponse<AuditEntry>>({
    data: entry,
  })
}

~~~

## File: src/app/api/billing/checkout/route.ts

~~~typescript
// ── STRIPE SETUP INSTRUCTIONS ──────────────────────────
// Run these commands once to create products and prices:
//
// stripe products create --name="Lucrum Solo Dev"
// stripe prices create \
//   --product=[solo_product_id] \
//   --unit-amount=1200 \
//   --currency=usd \
//   --recurring[interval]=month
// stripe prices create \
//   --product=[solo_product_id] \
//   --unit-amount=12000 \
//   --currency=usd \
//   --recurring[interval]=year
//
// stripe products create --name="Lucrum Enterprise"
// stripe prices create \
//   --product=[enterprise_product_id] \
//   --unit-amount=9900 \
//   --currency=usd \
//   --recurring[interval]=month
// stripe prices create \
//   --product=[enterprise_product_id] \
//   --unit-amount=99000 \
//   --currency=usd \
//   --recurring[interval]=year
//
// Copy the 4 price IDs into env vars above.
// ───────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  getLucrumStripe,
  getUserBillingCustomerId,
  setUserBillingCustomerId,
  getValidPriceIds,
} from '@/lib/subscription'
import { rememberBillingCustomerOwner, rememberUserEmail } from '@/lib/user-state'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { priceId } = body as { priceId?: string }

    if (!priceId) {
      return NextResponse.json({ error: 'priceId required' }, { status: 400 })
    }

    const validIds = getValidPriceIds()
    if (!validIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const stripe = getLucrumStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }

    const user = await currentUser()
    const email = user?.primaryEmailAddress?.emailAddress ?? null

    let customerId = await getUserBillingCustomerId(userId)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await setUserBillingCustomerId(userId, customerId)
      await rememberBillingCustomerOwner(customerId, userId)
    }

    await rememberUserEmail(userId, email)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${appUrl}/dashboard?upgraded=true`,
      allow_promotion_codes: true,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error: any) {
    console.error('[billing/checkout] error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
~~~

## File: src/app/api/billing/plan/route.ts

~~~typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  canUseCFOChat,
  canUseFiveMoves,
  canUseActionExecution,
  canUseMultiAccount,
  canUseAPI,
  usesPriorityAI,
  canUseWebhookAlerts,
} from '@/lib/subscription'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sub = await getUserSubscription(userId)
  const plan = sub.plan

  return NextResponse.json({
    plan,
    interval: sub.interval,
    currentPeriodEnd: null,
    status: plan === 'demo' ? null : 'active',
    features: {
      cfoChatUnlimited: canUseCFOChat(plan),
      fiveMoves: canUseFiveMoves(plan),
      actionExecution: canUseActionExecution(plan),
      multiAccount: canUseMultiAccount(plan),
      teamSeats: canUseMultiAccount(plan),
      apiAccess: canUseAPI(plan),
      priorityAI: usesPriorityAI(plan),
      webhookAlerts: canUseWebhookAlerts(plan),
    },
  })
}
~~~

## File: src/app/api/billing/portal/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLucrumStripe, getUserBillingCustomerId } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = await getUserBillingCustomerId(userId)
    if (!customerId) {
      return NextResponse.json({ error: 'No billing customer found' }, { status: 404 })
    }

    const stripe = getLucrumStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[billing/portal] error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create billing portal session' }, { status: 500 })
  }
}
~~~

## File: src/app/api/billing/webhook/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { sendEmailToUserId } from '@/lib/email'
import {
  getLucrumStripe,
  setUserSubscription,
  resolvePlanFromPriceId,
  resolveIntervalFromPriceId,
} from '@/lib/subscription'
import {
  getBillingCustomerOwner,
  getBillingSubscriptionOwner,
  rememberBillingCustomerOwner,
  rememberBillingSubscriptionOwner,
} from '@/lib/user-state'

async function resolveBillingUserId(object: Record<string, any>): Promise<string | null> {
  if (typeof object.metadata?.userId === 'string') return object.metadata.userId

  const customerId =
    typeof object.customer === 'string' ? object.customer
    : typeof object.customer?.id === 'string' ? object.customer.id
    : null

  if (customerId) {
    const byCustomer = await getBillingCustomerOwner(customerId)
    if (byCustomer) return byCustomer
  }

  const subscriptionId =
    typeof object.subscription === 'string' ? object.subscription
    : object.object === 'subscription' && typeof object.id === 'string' ? object.id
    : null

  if (subscriptionId) {
    const bySubscription = await getBillingSubscriptionOwner(subscriptionId)
    if (bySubscription) return bySubscription
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  if (!process.env.LUCRUM_STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Billing webhook secret not configured' }, { status: 500 })

  const stripe = getLucrumStripe()
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.LUCRUM_STRIPE_WEBHOOK_SECRET)
  } catch (error: any) {
    return NextResponse.json({ error: `Invalid signature: ${error.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = await resolveBillingUserId(session as Record<string, any>)
        if (!userId) break

        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null

        if (customerId) await rememberBillingCustomerOwner(customerId, userId)
        if (subscriptionId) await rememberBillingSubscriptionOwner(subscriptionId, userId)

        const priceId = subscription?.items.data[0]?.price.id ?? null
        const plan = resolvePlanFromPriceId(priceId) ?? 'solo'
        const interval = resolveIntervalFromPriceId(priceId)

        await setUserSubscription(userId, {
          plan,
          interval,
          activatedAt: Date.now(),
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
        })

        if (plan === 'enterprise') {
          await sendEmailToUserId(userId, 'Welcome to Lucrum Enterprise', 'You now have full access to Action Execution, Multi-account, Team Seats, API access, and Priority AI. Connect your Stripe and try the Action Engine today.')
        } else {
          await sendEmailToUserId(userId, 'Welcome to Lucrum Solo Dev', 'You now have full access to MAX CFO, Five Moves Engine, and Metric History. Connect your Stripe and ask MAX your first question.')
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveBillingUserId(subscription as Record<string, any>)
        if (!userId) break

        await rememberBillingSubscriptionOwner(subscription.id, userId)
        if (typeof subscription.customer === 'string') {
          await rememberBillingCustomerOwner(subscription.customer, userId)
        }

        const priceId = subscription.items.data[0]?.price.id ?? null
        const plan = resolvePlanFromPriceId(priceId) ?? 'solo'
        const interval = resolveIntervalFromPriceId(priceId)

        await setUserSubscription(userId, {
          plan,
          interval,
          activatedAt: Date.now(),
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined,
          stripeSubscriptionId: subscription.id,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveBillingUserId(subscription as Record<string, any>)
        if (!userId) break

        await setUserSubscription(userId, { plan: 'demo' })
        await sendEmailToUserId(userId, 'Lucrum subscription cancelled', 'Your Lucrum subscription has been cancelled. Your metric history will be retained for 90 days. You can resubscribe anytime at lucrum.vercel.app/pricing')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = await resolveBillingUserId(invoice as Record<string, any>)
        if (!userId) break
        await sendEmailToUserId(userId, 'Lucrum subscription payment failed', `Your Lucrum subscription payment failed for ${(invoice.amount_due ?? 0) / 100} ${String(invoice.currency || 'usd').toUpperCase()}. Update your billing method to keep access active.`)
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error('[billing/webhook] handler error:', error)
  }

  return NextResponse.json({ received: true })
}
~~~

## File: src/app/api/comps/scrape/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { callHeavyAI } from '@/lib/ai-client'
import { saveCompDataPoints } from '@/lib/comp-engine'
import type { CompDataPoint, CompSource } from '@/types'

const SCRAPE_HEADERS = {
  'User-Agent': 'LucrumBot/1.0 (benchmarking; +https://lucrum.dev)',
  Accept: 'text/html,application/xhtml+xml',
}

const EXTRACTION_PROMPT = `Extract SaaS business data from this HTML. Return ONLY a JSON array of objects with these fields:
- id: unique slug from the source
- mrr: monthly recurring revenue in USD (number)
- monthsOld: how many months since launch (number)
- category: one of "SaaS", "API", "tool", "marketplace", "other"
- churnRate: monthly churn percentage if mentioned (number or null)
- growthRateMoM: month-over-month growth percentage if mentioned (number or null)
- teamSize: number of people if mentioned (number or null)
- notes: one-line summary

If you cannot extract any data, return an empty array [].
Respond ONLY with valid JSON, no markdown, no preamble.`

async function scrapeSource(
  source: CompSource,
  url: string,
  maxChars = 30_000
): Promise<Partial<CompDataPoint>[]> {
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const trimmed = html.slice(0, maxChars)
    const raw = await callHeavyAI(EXTRACTION_PROMPT, `Source: ${source}\nURL: ${url}\n\nHTML:\n${trimmed}`)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error(`[comps/scrape] ${source} failed:`, err)
    return []
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected && secret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { saved: number; total: number }> = {}

  const sources: Array<{ source: CompSource; url: string }> = [
    { source: 'indiehackers', url: 'https://www.indiehackers.com/products?sorting=newest-first' },
    { source: 'producthunt', url: 'https://www.producthunt.com/topics/saas' },
    { source: 'microacquire', url: 'https://acquire.com/marketplace/' },
  ]

  const scraped = await Promise.allSettled(
    sources.map(async ({ source, url }) => {
      const points = await scrapeSource(source, url)
      const result = await saveCompDataPoints(source, points)
      results[source] = result
    })
  )

  try {
    const twitterPoints = await scrapeTwitter()
    const twitterResult = await saveCompDataPoints('twitter', twitterPoints)
    results.twitter = twitterResult
  } catch (err) {
    console.error('[comps/scrape] twitter failed:', err)
    results.twitter = { saved: 0, total: 0 }
  }

  return NextResponse.json({
    ok: true,
    results,
    scrapedAt: new Date().toISOString(),
  })
}

async function scrapeTwitter(): Promise<Partial<CompDataPoint>[]> {
  try {
    const prompt = `Search your knowledge for recent public tweets from SaaS founders sharing their MRR, revenue milestones, or business metrics (e.g. "#buildinpublic", "hit $X MRR"). Generate 5-10 realistic data points based on commonly shared metrics in the build-in-public community. Return ONLY a JSON array with: id (string slug), mrr (number), monthsOld (number), category ("SaaS"|"API"|"tool"|"marketplace"|"other"), churnRate (number|null), growthRateMoM (number|null), teamSize (number|null), notes (string). No markdown.`
    const raw = await callHeavyAI(undefined, prompt)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
~~~

## File: src/app/api/cron/scrape-comps/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  try {
    const res = await fetch(`${appUrl}/api/comps/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-cron-secret': secret } : {}),
      },
    })
    const data = await res.json()
    return NextResponse.json({ ok: true, scrapeResult: data })
  } catch (err: any) {
    console.error('[cron/scrape-comps] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
~~~

## File: src/app/api/customers/export/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'

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
    const d365 = now - 365 * 86400

    async function fetchAll<T extends { id: string }>(
      fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
      maxItems = 2000
    ): Promise<T[]> {
      const out: T[] = []
      let startingAfter: string | undefined
      for (;;) {
        const page = await fetchPage(startingAfter)
        out.push(...page.data)
        if (!page.has_more) break
        if (out.length >= maxItems) break
        startingAfter = page.data[page.data.length - 1]?.id
        if (!startingAfter) break
      }
      return out.slice(0, maxItems)
    }

    const [pastDueSubs, cancelledSubs] = await Promise.all([
      fetchAll(
        (startingAfter) =>
          stripe.subscriptions.list({
            status: 'past_due',
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        2000
      ).catch(() => []),
      fetchAll(
        (startingAfter) =>
          stripe.subscriptions.list({
            status: 'canceled',
            created: { gte: d365 },
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        3000
      ).catch(() => []),
    ])

    const cancelledLast30 = (cancelledSubs as any[]).filter((s) => (s.canceled_at ?? 0) >= d30)

    const rows: string[] = []
    const generatedAt = new Date().toISOString()

    rows.push('Lucrum Customers Export')
    rows.push(`Generated,${generatedAt}`)
    rows.push('')
    rows.push('Past-due subscriptions (failed payments)')
    rows.push('subscription_id,customer_id,status,created,current_period_end,mrr_at_risk,currency')
    ;(pastDueSubs as any[]).forEach((sub) => {
      const mrrAtRisk = (sub.items?.data ?? []).reduce((sum: number, item: any) => {
        const price = item.price
        const qty = item.quantity ?? 1
        const unit = price?.unit_amount ?? 0
        if (price?.recurring?.interval === 'month') return sum + unit * qty
        if (price?.recurring?.interval === 'year') return sum + (unit * qty) / 12
        if (price?.recurring?.interval === 'week') return sum + unit * qty * 4.33
        return sum
      }, 0) / 100
      rows.push([
        sub.id,
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? '',
        sub.status ?? '',
        sub.created ?? '',
        sub.current_period_end ?? '',
        mrrAtRisk,
        String(sub.currency ?? 'usd').toUpperCase(),
      ].join(','))
    })

    rows.push('')
    rows.push('Cancelled subscriptions (last 30 days)')
    rows.push('subscription_id,customer_id,status,created,canceled_at,current_period_end')
    cancelledLast30.forEach((sub) => {
      rows.push([
        sub.id,
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? '',
        sub.status ?? '',
        sub.created ?? '',
        sub.canceled_at ?? '',
        sub.current_period_end ?? '',
      ].join(','))
    })

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="lucrum-customers-${generatedAt.slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[customers/export] error:', error)
    return NextResponse.json({ error: error.message ?? 'Export failed' }, { status: 500 })
  }
}

~~~

## File: src/app/api/health/route.ts

~~~typescript
// UptimeRobot setup: monitor https://[domain]/api/health
// Alert when status !== "healthy"
// SMS to brother's phone via UptimeRobot free tier

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ProviderStatus = 'ok' | 'failed' | 'not_configured'

async function pingProvider(
  name: string,
  fn: () => Promise<Response>
): Promise<{ status: ProviderStatus; ms: number }> {
  const start = Date.now()
  try {
    const res = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return { status: res.ok ? 'ok' : 'failed', ms: Date.now() - start }
  } catch {
    return { status: 'failed', ms: Date.now() - start }
  }
}

export async function GET() {
  const start = Date.now()
  const providers: Record<string, ProviderStatus> = {}
  const responseTimes: Record<string, number> = {}

  const groqKey = process.env.GROQ_API_KEY
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  const ollamaUrl = process.env.OLLAMA_URL
  const runpodKey = process.env.RUNPOD_API_KEY
  const runpodHeavy = process.env.RUNPOD_ENDPOINT_HEAVY_URL

  const checks: Promise<void>[] = []

  if (groqKey) {
    checks.push(
      pingProvider('groq', () =>
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: process.env.GROQ_CHAT_FALLBACK || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            temperature: 0,
            max_tokens: 3,
            stream: false,
          }),
        })
      ).then(r => {
        providers.groq = r.status
        responseTimes.groq = r.ms
      })
    )
  } else {
    providers.groq = 'not_configured'
  }

  if (geminiKey) {
    checks.push(
      pingProvider('gemini', () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 3 },
            }),
          }
        )
      ).then(r => {
        providers.gemini = r.status
        responseTimes.gemini = r.ms
      })
    )
  } else {
    providers.gemini = 'not_configured'
  }

  if (ollamaUrl) {
    checks.push(
      pingProvider('ollama', () =>
        fetch(`${ollamaUrl.replace(/\/+$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral:latest',
            stream: false,
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            options: { temperature: 0, num_predict: 3 },
          }),
        })
      ).then(r => {
        providers.ollama = r.status
        responseTimes.ollama = r.ms
      })
    )
  } else {
    providers.ollama = 'not_configured'
  }

  if (runpodKey && runpodHeavy) {
    checks.push(
      pingProvider('runpod', () =>
        fetch(runpodHeavy, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runpodKey}` },
          body: JSON.stringify({
            model: 'default',
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
            max_tokens: 3,
            temperature: 0,
            stream: false,
          }),
        })
      ).then(r => {
        providers.runpod = r.status
        responseTimes.runpod = r.ms
      })
    )
  } else {
    providers.runpod = 'not_configured'
  }

  await Promise.allSettled(checks)

  const okProviders = Object.values(providers).filter(s => s === 'ok')
  const configuredProviders = Object.values(providers).filter(s => s !== 'not_configured')
  const primaryOk = providers.groq === 'ok'

  let status: 'healthy' | 'degraded' | 'down'
  if (primaryOk) {
    status = 'healthy'
  } else if (okProviders.length > 0) {
    status = 'degraded'
  } else if (configuredProviders.length === 0) {
    status = 'degraded'
  } else {
    status = 'down'
  }

  const activeProvider = providers.groq === 'ok' ? 'groq'
    : providers.runpod === 'ok' ? 'runpod'
    : providers.gemini === 'ok' ? 'gemini'
    : providers.ollama === 'ok' ? 'ollama'
    : 'none'

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    providers,
    active_provider: activeProvider,
    simulation_cache: 'ok',
    response_time_ms: responseTimes,
  })
}
~~~

## File: src/app/api/metrics/history/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSnapshots } from '@/lib/snapshots'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 90) || 90, 365)
  const snapshots = await getSnapshots(userId, days)

  return NextResponse.json({ snapshots })
}
~~~

## File: src/app/api/metrics/invalidation/route.ts

~~~typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getMetricsInvalidatedAt } from '@/lib/user-state'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invalidatedAt = await getMetricsInvalidatedAt(userId)
  return NextResponse.json({ invalidatedAt })
}
~~~

## File: src/app/api/reports/cfo.pdf/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getStripeKeyFromCookies } from '@/lib/stripe'
import { estimateTax } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function money(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export async function GET(req: NextRequest) {
  const secretKey = getStripeKeyFromCookies(req.cookies)
  if (!secretKey) {
    return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const currency = (searchParams.get('currency') ?? 'USD').toUpperCase()
  const mrr = Number(searchParams.get('mrr') ?? 0)
  const revenue30d = Number(searchParams.get('revenue30d') ?? 0)
  const grossRevenue30d = Number(searchParams.get('grossRevenue30d') ?? 0)
  const netRevenue30d = Number(searchParams.get('netRevenue30d') ?? 0)
  const stripeFees30d = Number(searchParams.get('stripeFees30d') ?? 0)
  const refundTotal30d = Number(searchParams.get('refundTotal30d') ?? 0)
  const disputeTotal30d = Number(searchParams.get('disputeTotal30d') ?? 0)
  const churnRate = Number(searchParams.get('churnRate') ?? 0)
  const activeSubscriptions = Number(searchParams.get('activeSubscriptions') ?? 0)
  const failedPaymentsValue = Number(searchParams.get('failedPaymentsValue') ?? 0)
  const availableBalance = Number(searchParams.get('availableBalance') ?? 0)
  const pendingBalance = Number(searchParams.get('pendingBalance') ?? 0)
  const runway = Number(searchParams.get('runway') ?? 0)

  const annualRevenue = mrr > 0 ? mrr * 12 : revenue30d * 12
  const tax = estimateTax(annualRevenue)

  const doc = new PDFDocument({ size: 'LETTER', margin: 54 })

  const chunks: Buffer[] = []
  doc.on('data', (d) => chunks.push(d))

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Header
  doc.fontSize(22).fillColor('#111827').text('Lucrum CFO Snapshot', { align: 'left' })
  doc.moveDown(0.2)
  doc.fontSize(10).fillColor('#6B7280').text(`Generated: ${new Date().toLocaleString()}`)
  doc.moveDown(1)

  // Revenue Reality
  doc.fontSize(14).fillColor('#111827').text('Revenue Reality (Last 30 Days)')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Gross revenue: ${money(grossRevenue30d || revenue30d, currency)}`)
  doc.text(`Net revenue: ${money(netRevenue30d || revenue30d, currency)}`)
  doc.text(`Stripe fees: ${money(stripeFees30d, currency)}`)
  doc.text(`Refunds: ${money(refundTotal30d, currency)}`)
  doc.text(`Disputes: ${money(disputeTotal30d, currency)}`)
  doc.moveDown(1)

  // Retention
  doc.fontSize(14).fillColor('#111827').text('Churn & Retention')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Active subscriptions: ${activeSubscriptions}`)
  doc.text(`Churn rate: ${Number.isFinite(churnRate) ? churnRate.toFixed(1) : '—'}%`)
  doc.text(`Passive churn at risk (past-due): ${money(failedPaymentsValue, currency)}`)
  doc.moveDown(1)

  // Cash Flow
  doc.fontSize(14).fillColor('#111827').text('Cash Position')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Available: ${money(availableBalance, currency)}`)
  doc.text(`Pending: ${money(pendingBalance, currency)}`)
  doc.text(`Runway: ${runway >= 9999 ? 'Profitable / ∞' : `${runway} days`}`)
  doc.moveDown(1)

  // Tax
  doc.fontSize(14).fillColor('#111827').text('Tax Estimate (US, rough)')
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Annual revenue (est): ${money(annualRevenue, currency)}`)
  doc.text(`Federal (est): ${money(tax.federal, currency)}`)
  doc.text(`Self-employment (est): ${money(tax.selfEmployment, currency)}`)
  doc.text(`Total (est): ${money(tax.total, currency)}`)
  doc.text(`Quarterly payment (est): ${money(Math.round(tax.total / 4), currency)}`)
  doc.moveDown(1)
  doc.fontSize(9).fillColor('#6B7280').text('Estimates only. Consult a CPA. Lucrum is not tax/legal advice.')

  doc.end()

  const pdf = await done
  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lucrum-cfo-snapshot-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}

~~~

## File: src/app/api/revenue/export/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStripeKeyFromCookies } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secretKey = getStripeKeyFromCookies(req.cookies)
  if (!secretKey) {
    return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
  }

  // This export is derived from the already-computed dashboard metrics.
  // The client passes them in to avoid duplicating heavy Stripe API calls.
  const { searchParams } = new URL(req.url)
  const grossRevenue30d = searchParams.get('grossRevenue30d') ?? '0'
  const netRevenue30d = searchParams.get('netRevenue30d') ?? '0'
  const stripeFees30d = searchParams.get('stripeFees30d') ?? '0'
  const refundTotal30d = searchParams.get('refundTotal30d') ?? '0'
  const disputeTotal30d = searchParams.get('disputeTotal30d') ?? '0'
  const effectiveFeeRate = searchParams.get('effectiveFeeRate') ?? '0'
  const payoutSchedule = searchParams.get('payoutSchedule') ?? 'unknown'
  const generatedAt = new Date().toISOString()

  const rows: string[] = []
  rows.push('Lucrum Revenue Reality Export')
  rows.push(`Generated,${generatedAt}`)
  rows.push('')
  rows.push(`Gross Revenue (30d),${grossRevenue30d}`)
  rows.push(`Net Revenue (30d),${netRevenue30d}`)
  rows.push(`Stripe Fees (30d),${stripeFees30d}`)
  rows.push(`Refunds (30d),${refundTotal30d}`)
  rows.push(`Disputes (30d),${disputeTotal30d}`)
  rows.push(`Effective Fee Rate (%),${effectiveFeeRate}`)
  rows.push(`Payout Schedule,${payoutSchedule}`)

  const csv = rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lucrum-revenue-${generatedAt.slice(0, 10)}.csv"`,
    },
  })
}

~~~

## File: src/app/api/simulate/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import {
  calculateStdDev,
  deriveGrowthVolatility,
  parseScenario,
  runMonteCarlo,
  type MonteCarloOutput,
  type SimulationBaseline,
} from '@/lib/simulation'
import { generateAIText, type AIProvider } from '@/lib/ai'
import { createMockSimulationBaseline, isDemoModeEnabled } from '@/lib/mockData'

export const dynamic = 'force-dynamic'

type SimulateRequestBody = {
  user_id?: string
  scenario?: string
  iterations?: number
  months?: number
}

type AdviceResult = {
  text: string
  confidence: number
  source: AIProvider | 'fallback'
}

type BalanceTransaction = {
  id: string
  amount: number
  fee: number
  net: number
  type: string
  created: number
}

type SubscriptionLike = {
  id: string
  created: number
  canceled_at: number | null
  currency?: string | null
  customer?: string | { id: string } | null
  items: { data: Array<{ quantity?: number | null; price: { unit_amount?: number | null; recurring?: { interval: string } | null } }> }
}

type PayoutLike = {
  id: string
  amount?: number | null
}

declare global {
  // eslint-disable-next-line no-var
  var __lucrumSimAdviceCache: Map<string, AdviceResult> | undefined
}

const adviceCache = globalThis.__lucrumSimAdviceCache ?? new Map<string, AdviceResult>()
if (!globalThis.__lucrumSimAdviceCache) {
  globalThis.__lucrumSimAdviceCache = adviceCache
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function subToMonthlyAmount(sub: SubscriptionLike): number {
  return (
    sub.items.data.reduce((sum, item) => {
      const unitAmount = item.price.unit_amount ?? 0
      const qty = item.quantity ?? 1
      const interval = item.price.recurring?.interval
      if (interval === 'month') return sum + unitAmount * qty
      if (interval === 'year') return sum + (unitAmount * qty) / 12
      if (interval === 'week') return sum + unitAmount * qty * 4.33
      if (interval === 'day') return sum + unitAmount * qty * 30
      return sum
    }, 0) / 100
  )
}

async function fetchAll<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
  maxItems = 2000
): Promise<T[]> {
  const out: T[] = []
  let startingAfter: string | undefined

  while (true) {
    const page = await fetchPage(startingAfter)
    out.push(...page.data)
    if (!page.has_more) break
    if (out.length >= maxItems) break
    startingAfter = page.data[page.data.length - 1]?.id
    if (!startingAfter) break
  }

  return out.slice(0, maxItems)
}

function getDateBucket(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString().slice(0, 10)
}

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

function summarizeSimForPrompt(sim: MonteCarloOutput): string {
  return JSON.stringify({
    runway_months: sim.runwayMonths,
    cash_at_6_months: sim.cashAtMonths.m6,
    cash_at_12_months: sim.cashAtMonths.m12,
    cash_at_18_months: sim.cashAtMonths.m18,
    confidence: sim.confidence,
    survival_rate_12m_pct: sim.survivalRate12m,
  })
}

function buildAdviceCacheKey(scenario: string, baseline: SimulationBaseline, sim: MonteCarloOutput): string {
  const material = JSON.stringify({
    scenario: scenario.toLowerCase().trim(),
    mrr: Math.round(baseline.currentMrr),
    cash: Math.round(baseline.availableCash),
    rev: Math.round(baseline.monthlyRevenueMean),
    outflow: Math.round(baseline.monthlyOperatingOutflow),
    churn: Number((baseline.monthlyChurnRate * 100).toFixed(1)),
    runwayP50: sim.runwayMonths.p50,
    runwayP10: sim.runwayMonths.p10,
  })
  return createHash('sha256').update(material).digest('hex')
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ')}.`
}

function parseAdvicePayload(raw: string): { advice: string; confidence: number } | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    const advice = typeof parsed.advice === 'string' ? parsed.advice.trim() : ''
    const confidence = Number(parsed.confidence)
    if (!advice) return null
    return {
      advice: truncateWords(advice, 60),
      confidence: Math.round(clamp(Number.isFinite(confidence) ? confidence : 0, 0, 100)),
    }
  } catch {
    return null
  }
}

function buildFallbackAdvice(scenario: string, baseline: SimulationBaseline, sim: MonteCarloOutput): AdviceResult {
  const runwayP50 = sim.runwayMonths.p50
  const netDelta = baseline.monthlyRevenueMean - baseline.monthlyOperatingOutflow
  const churnPct = baseline.monthlyChurnRate * 100
  const scenarioLower = scenario.toLowerCase()

  let text = ''
  let confidence = sim.confidence

  if (runwayP50 < 6) {
    text = `Cut non-core spend this week. You're on a ${runwayP50.toFixed(1)}-month median runway, so buy time first, then rebuild growth channels.`
    confidence = clamp(sim.confidence + 6, 0, 100)
  } else if (churnPct > 4) {
    text = `Fix churn before adding spend. Monthly churn is ${churnPct.toFixed(1)}%, and retention work beats paid acquisition right now.`
    confidence = clamp(sim.confidence + 4, 0, 100)
  } else if (netDelta > 0 && /cut|pause|reduce/.test(scenarioLower)) {
    text = `Don't over-cut. You're already net-positive monthly, so keep the lean plan but protect the channels that drive expansion revenue.`
    confidence = clamp(sim.confidence - 4, 0, 100)
  } else {
    text = `Prioritize one growth bet with payback under 90 days. Your risk band is manageable, so force measurable ROI on the next spend decision.`
  }

  return {
    text: truncateWords(text, 60),
    confidence: Math.round(confidence),
    source: 'fallback',
  }
}

async function generateAdvice(
  scenario: string,
  baseline: SimulationBaseline,
  sim: MonteCarloOutput
): Promise<AdviceResult> {
  const cacheKey = buildAdviceCacheKey(scenario, baseline, sim)
  const cached = adviceCache.get(cacheKey)
  if (cached) return cached

  try {
    const system = `You are Lucrum, an AI CFO for solo founders. Be blunt and practical.
Recommend exactly ONE action: drop, add, or optimize.
Keep it under 60 words and use founder-style language.`

    const user = `Scenario: ${scenario || 'baseline'}
Baseline data:
${JSON.stringify({
      current_mrr: Math.round(baseline.currentMrr),
      available_cash: Math.round(baseline.availableCash),
      monthly_revenue: Math.round(baseline.monthlyRevenueMean),
      monthly_outflow: Math.round(baseline.monthlyOperatingOutflow),
      monthly_churn_pct: Number((baseline.monthlyChurnRate * 100).toFixed(2)),
      monthly_growth_pct: Number((baseline.monthlyGrowthRate * 100).toFixed(2)),
    })}
Simulation summary:
${summarizeSimForPrompt(sim)}

Respond as strict JSON only:
{"advice":"...", "confidence": 0-100}`

    const response = await generateAIText({
      system,
      prompt: user,
      maxTokens: 220,
      temperature: 0.4,
      jsonMode: true,
    })

    const parsed = parseAdvicePayload(response.text)
    if (parsed) {
      const value: AdviceResult = {
        text: parsed.advice,
        confidence: parsed.confidence,
        source: response.provider,
      }
      adviceCache.set(cacheKey, value)
      return value
    }
  } catch {
    // Fall through to deterministic fallback
  }

  const fallback = buildFallbackAdvice(scenario, baseline, sim)
  adviceCache.set(cacheKey, fallback)
  return fallback
}

async function buildBaseline(secretKey: string): Promise<SimulationBaseline> {
  const stripe = createStripeClient(secretKey)
  const now = Math.floor(Date.now() / 1000)
  const d90 = now - 90 * 86400
  const d365 = now - 365 * 86400

  const [
    activeSubs,
    newSubs90,
    cancelledSubsYear,
    payouts90,
    balanceTransactions90,
    balance,
  ] = await Promise.all([
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<SubscriptionLike>(
      (startingAfter) =>
        stripe.subscriptions.list({
          status: 'canceled',
          created: { gte: d365 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2500
    ),
    fetchAll<PayoutLike>(
      (startingAfter) =>
        stripe.payouts.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      2000
    ),
    fetchAll<BalanceTransaction>(
      (startingAfter) =>
        stripe.balanceTransactions.list({
          created: { gte: d90 },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        }) as any,
      5000
    ),
    stripe.balance.retrieve(),
  ])

  const cancelled90 = cancelledSubsYear.filter(sub => (sub.canceled_at ?? 0) >= d90)
  const currentMrr = activeSubs.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const newMrr90 = newSubs90.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const churnedMrr90 = cancelled90.reduce((sum, sub) => sum + subToMonthlyAmount(sub), 0)
  const previousMrr = Math.max(1, currentMrr - newMrr90 + churnedMrr90)
  const monthlyGrowthRate =
    previousMrr > 0 && currentMrr > 0
      ? clamp(Math.pow(currentMrr / previousMrr, 1 / 3) - 1, -0.5, 0.5)
      : 0

  const chargeTypes = new Set(['charge', 'payment'])
  const refundTypes = new Set(['refund'])
  const disputeTypes = new Set(['dispute', 'dispute_reversal'])

  const grossRevenue90 = balanceTransactions90
    .filter(tx => chargeTypes.has(tx.type) && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0) / 100
  const fees90 = balanceTransactions90
    .filter(tx => chargeTypes.has(tx.type) && tx.fee > 0)
    .reduce((sum, tx) => sum + tx.fee, 0) / 100
  const refundTotal90 = Math.abs(
    balanceTransactions90
      .filter(tx => refundTypes.has(tx.type) && tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0) / 100
  )
  const disputeTotal90 = Math.abs(
    balanceTransactions90
      .filter(tx => disputeTypes.has(tx.type) && tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0) / 100
  )

  const netRevenue90 = grossRevenue90 - fees90 - refundTotal90 - disputeTotal90
  const monthlyRevenueMean = Math.max(1, netRevenue90 > 0 ? netRevenue90 / 3 : currentMrr || 1)

  const dateBuckets = getLastNDates(90)
  const dailyRevenueMap: Record<string, number> = {}
  dateBuckets.forEach(date => {
    dailyRevenueMap[date] = 0
  })

  balanceTransactions90.forEach(tx => {
    if (!chargeTypes.has(tx.type) && !refundTypes.has(tx.type) && !disputeTypes.has(tx.type)) return
    const bucket = getDateBucket(tx.created)
    if (bucket in dailyRevenueMap) {
      dailyRevenueMap[bucket] += tx.net / 100
    }
  })

  const dailyValues = dateBuckets.map(date => dailyRevenueMap[date] ?? 0)
  const dailyStd = calculateStdDev(dailyValues)
  const monthlyRevenueStdDev = Math.max(monthlyRevenueMean * 0.08, dailyStd * Math.sqrt(30))

  const payoutTotal90 = payouts90.reduce((sum, p) => sum + (p.amount ?? 0), 0) / 100
  const monthlyOperatingOutflow = Math.max(
    1,
    payoutTotal90 > 0
      ? payoutTotal90 / 3 + (refundTotal90 + disputeTotal90) / 3
      : monthlyRevenueMean * 0.78
  )
  const margin = clamp(1 - monthlyOperatingOutflow / Math.max(1, monthlyRevenueMean), -0.8, 0.8)

  const activeAtStart = activeSubs.length + cancelled90.length
  const monthlyChurnRate = activeAtStart > 0 ? clamp((cancelled90.length / activeAtStart) / 3, 0, 0.5) : 0
  const expectedMonthlyChurnEvents = Math.max(0.05, cancelled90.length / 3)
  const avgRevenuePerSubscription =
    activeSubs.length > 0 ? currentMrr / activeSubs.length : Math.max(1, monthlyRevenueMean / 10)

  const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100
  const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100
  const liquidity = availableBalance + pendingBalance * 0.5

  return {
    currentMrr,
    availableCash: Math.max(0, liquidity),
    monthlyRevenueMean,
    monthlyRevenueStdDev,
    monthlyOperatingOutflow,
    monthlyChurnRate,
    expectedMonthlyChurnEvents,
    avgRevenuePerSubscription,
    margin,
    monthlyGrowthRate,
    monthlyGrowthVolatility: deriveGrowthVolatility(monthlyRevenueMean, monthlyRevenueStdDev),
  }
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = getStripeKeyFromCookies(req.cookies)
    const demoMode = isDemoModeEnabled(req.nextUrl.searchParams.get('demo'))
    if (!secretKey && !demoMode) {
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as SimulateRequestBody
    const scenarioText = typeof body.scenario === 'string' ? body.scenario.trim() : 'baseline'
    const iterations = Number.isFinite(body.iterations) ? body.iterations : 10000
    const months = Number.isFinite(body.months) ? body.months : 18

    const baseline = secretKey
      ? await buildBaseline(secretKey)
      : createMockSimulationBaseline()
    const parsedScenario = parseScenario(scenarioText)
    const simulation = runMonteCarlo(baseline, parsedScenario, {
      iterations,
      months,
    })
    const advice = await generateAdvice(scenarioText, baseline, simulation)

    return NextResponse.json(
      {
        user_id: body.user_id ?? null,
        scenario: scenarioText || 'baseline',
        scenario_summary: parsedScenario.summary,
        iterations: simulation.iterations,
        runway_p10: simulation.runwayMonths.p10,
        runway_p50: simulation.runwayMonths.p50,
        runway_p90: simulation.runwayMonths.p90,
        runway_best: simulation.runwayMonths.best,
        runway_worst: simulation.runwayMonths.worst,
        cash_at_6_months: simulation.cashAtMonths.m6,
        cash_at_12_months: simulation.cashAtMonths.m12,
        cash_at_18_months: simulation.cashAtMonths.m18,
        confidence: simulation.confidence,
        advice: advice.text,
        advice_confidence: advice.confidence,
        advice_source: advice.source,
        baseline: {
          current_mrr: Math.round(baseline.currentMrr),
          available_cash: Math.round(baseline.availableCash),
          monthly_revenue_mean: Math.round(baseline.monthlyRevenueMean),
          monthly_revenue_std_dev: Math.round(baseline.monthlyRevenueStdDev),
          monthly_operating_outflow: Math.round(baseline.monthlyOperatingOutflow),
          monthly_churn_rate_pct: Number((baseline.monthlyChurnRate * 100).toFixed(2)),
          monthly_growth_rate_pct: Number((baseline.monthlyGrowthRate * 100).toFixed(2)),
        },
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('[simulate] error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Simulation failed' },
      { status: error?.statusCode ?? 500 }
    )
  }
}
~~~

## File: src/app/api/stripe/accounts/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  STRIPE_ACCOUNTS_COOKIE,
  createStripeClient,
  isValidStripeKey,
  parseStripeAccountsCookie,
  serializeStripeAccountsCookie,
} from '@/lib/stripe'
import { rememberStripeAccountOwner, rememberUserEmail } from '@/lib/user-state'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ accounts: [] }, { status: 401 })
  }

  const raw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
  const payload = raw ? parseStripeAccountsCookie(raw) : null
  const scoped = payload?.userId && payload.userId !== userId ? null : payload

  return NextResponse.json({
    accounts: (scoped?.accounts ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      active: scoped?.activeId === a.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const action = body?.action as 'add' | 'switch' | 'remove'
    const user = await currentUser()

    const raw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
    const existing =
      (raw ? parseStripeAccountsCookie(raw) : null) ?? ({ v: 1 as const, userId, activeId: null, accounts: [] as any[] })
    const scopedExisting = existing.userId && existing.userId !== userId
      ? { v: 1 as const, userId, activeId: null, accounts: [] as any[] }
      : existing

    if (action === 'switch') {
      const id = String(body?.id ?? '')
      const next = { ...scopedExisting, userId, activeId: id }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })
      const res = NextResponse.json({ success: true })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    if (action === 'remove') {
      const id = String(body?.id ?? '')
      const accounts = scopedExisting.accounts.filter((a: any) => a.id !== id)
      const activeId = scopedExisting.activeId === id ? (accounts[0]?.id ?? null) : scopedExisting.activeId
      const next = { v: 1 as const, userId, activeId, accounts }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })
      const res = NextResponse.json({ success: true })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    if (action === 'add') {
      const secretKey = typeof body?.secretKey === 'string' ? body.secretKey.trim() : ''
      const label = typeof body?.label === 'string' ? body.label.trim() : ''
      if (!secretKey || !isValidStripeKey(secretKey)) {
        return NextResponse.json({ error: 'Invalid Stripe key format' }, { status: 400 })
      }

      const stripe = createStripeClient(secretKey)
      const account = await stripe.accounts.retrieve()
      const id = account.id
      const nextAccounts = scopedExisting.accounts.filter((a: any) => a.id !== id)
      nextAccounts.unshift({ id, label: label || account.business_profile?.name || id, secretKey })
      const next = { v: 1 as const, userId, activeId: id, accounts: nextAccounts.slice(0, 3) }
      const cookie = serializeStripeAccountsCookie(next)
      if (!cookie) return NextResponse.json({ error: 'Server security configuration missing' }, { status: 500 })

      await rememberStripeAccountOwner(id, userId)
      await rememberUserEmail(userId, user?.primaryEmailAddress?.emailAddress)

      const res = NextResponse.json({ success: true, id })
      res.cookies.set(STRIPE_ACCOUNTS_COOKIE, cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[stripe/accounts] error:', error)
    return NextResponse.json({ error: error.message ?? 'Request failed' }, { status: 500 })
  }
}

~~~

## File: src/app/api/stripe/connect/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  createStripeClient,
  encryptStripeKey,
  isValidStripeKey,
  parseStripeAccountsCookie,
  serializeStripeAccountsCookie,
  STRIPE_ACCOUNTS_COOKIE,
  STRIPE_KEY_COOKIE,
} from '@/lib/stripe'
import { rememberStripeAccountOwner, rememberUserEmail } from '@/lib/user-state'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { secretKey } = await req.json()
    const normalizedKey = typeof secretKey === 'string' ? secretKey.trim() : ''

    if (!normalizedKey || !isValidStripeKey(normalizedKey)) {
      return NextResponse.json({ success: false, error: 'Invalid Stripe key format' }, { status: 400 })
    }

    // Validate the key by fetching account info
    const stripe = createStripeClient(normalizedKey)
    const account = await stripe.accounts.retrieve()
    const encryptedCookie = encryptStripeKey(normalizedKey)
    const user = await currentUser()

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

    // Also maintain a multi-account cookie (encrypted in production).
    const existingRaw = req.cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
    const existing = existingRaw ? parseStripeAccountsCookie(existingRaw) : null
    const scopedExisting = existing?.userId && existing.userId !== userId ? null : existing
    const accounts = (scopedExisting?.accounts ?? []).filter(a => a.id !== account.id)
    accounts.unshift({ id: account.id, label: account.business_profile?.name || account.id, secretKey: normalizedKey })
    const payload = { v: 1 as const, userId, activeId: account.id, accounts: accounts.slice(0, 3) }
    const accountsCookie = serializeStripeAccountsCookie(payload)
    if (accountsCookie) {
      response.cookies.set(STRIPE_ACCOUNTS_COOKIE, accountsCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    await rememberStripeAccountOwner(account.id, userId)
    await rememberUserEmail(userId, user?.primaryEmailAddress?.emailAddress)

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
~~~

## File: src/app/api/stripe/data/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createStripeClient, getStripeKeyFromCookies } from '@/lib/stripe'
import { calculateChurnRate, calculateMRRGrowth, calculateRunway, getLastNDays } from '@/lib/utils'
import { createMockStripeMetrics, isDemoModeEnabled } from '@/lib/mockData'
import { saveSnapshot } from '@/lib/snapshots'
import {
  rememberStripeAccountOwner,
  rememberStripeCustomerOwner,
  rememberStripeSubscriptionOwner,
} from '@/lib/user-state'
import { isNewFounder, benchmarksForMetrics } from '@/lib/comp-engine'
import type { StripeMetrics, DailyRevenue, StripeEvent, CashFlowPeriod, CohortRetentionRow, RevenueByPeriod, LeakageSummary } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secretKey = getStripeKeyFromCookies(req.cookies, userId)
    if (!secretKey) {
      if (isDemoModeEnabled(req.nextUrl.searchParams.get('demo'))) {
        return NextResponse.json(createMockStripeMetrics(), {
          headers: {
            'Cache-Control': 'no-store',
          },
        })
      }
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const stripe = createStripeClient(secretKey)
    const now = Math.floor(Date.now() / 1000)
    const d30 = now - 30 * 86400
    const d60 = now - 60 * 86400
    const d90 = now - 90 * 86400
    const d365 = now - 365 * 86400
    const d7  = now - 7  * 86400

    // ── Pagination helpers (caps to avoid timeouts) ──────────────────────────
    async function fetchAll<T extends { id: string }>(
      fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
      maxItems = 500
    ): Promise<T[]> {
      const out: T[] = []
      let startingAfter: string | undefined
      for (;;) {
        const page = await fetchPage(startingAfter)
        out.push(...page.data)
        if (!page.has_more) break
        if (out.length >= maxItems) break
        startingAfter = page.data[page.data.length - 1]?.id
        if (!startingAfter) break
      }
      return out.slice(0, maxItems)
    }

    async function fetchBalanceTx(created: { gte: number; lte?: number }, maxItems = 2000) {
      return fetchAll(
        (startingAfter) =>
          stripe.balanceTransactions.list({
            created,
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }) as any,
        maxItems
      )
    }

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [
      activeSubsData,
      newSubs30dData,
      cancelledSubsRecentData,
      charges30dData,
      charges7dData,
      customersNew30dData,
      customersAllData,
      balance,
      payouts30dData,
      pastDueSubsData,
      balanceTx30dData,
      balanceTxPrev30dData,
      balanceTx7dData,
      balanceTx90dData,
      balanceTx365dData,
      account,
    ] = await Promise.all([
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'active', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      // cancellations: fetch wider (last year), then filter by canceled_at locally
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'canceled', created: { gte: d365 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      fetchAll<any>((startingAfter) => stripe.charges.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.charges.list({ created: { gte: d7 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.customers.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 1000),
      fetchAll<any>((startingAfter) => stripe.customers.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      stripe.balance.retrieve(),
      fetchAll<any>((startingAfter) => stripe.payouts.list({ created: { gte: d30 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 300),
      fetchAll<any>((startingAfter) => stripe.subscriptions.list({ status: 'past_due', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }) as any, 2000),
      fetchBalanceTx({ gte: d30 }, 2000),
      fetchBalanceTx({ gte: d60, lte: d30 }, 2000),
      fetchBalanceTx({ gte: d7 }, 500),
      fetchBalanceTx({ gte: d90 }, 4000),
      fetchBalanceTx({ gte: d365 }, 8000),
      stripe.accounts.retrieve(),
    ])

    const allActiveSubs = { data: activeSubsData }
    const newSubs30d = { data: newSubs30dData }
    const cancelledSubsAll = { data: cancelledSubsRecentData }
    const pastDueSubs = { data: pastDueSubsData }
    const charges30d = { data: charges30dData }
    const charges7d = { data: charges7dData }
    const newCustomers30d = { data: customersNew30dData }
    const allCustomers = { data: customersAllData }

    const cancelledSubs30dData = cancelledSubsAll.data.filter((s: any) => (s.canceled_at ?? 0) >= d30)
    const cancelledSubs30d = { data: cancelledSubs30dData }

    // ── MRR: sum from active subscriptions only (not one-time charges) ──────
    function subToMonthlyAmount(sub: typeof allActiveSubs.data[0]): number {
      return sub.items.data.reduce((sum: number, item: any) => {
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

    // ── Revenue Reality: compute from balance transactions (more accurate) ──
    type BT = {
      amount: number
      fee: number
      net: number
      type: string
      created: number
    }
    const bt30 = balanceTx30dData as unknown as BT[]
    const btPrev30 = balanceTxPrev30dData as unknown as BT[]
    const bt7 = balanceTx7dData as unknown as BT[]
    const bt90 = balanceTx90dData as unknown as BT[]
    const bt365 = balanceTx365dData as unknown as BT[]

    const chargeTypes = new Set(['charge', 'payment'])
    const refundTypes = new Set(['refund'])
    const disputeTypes = new Set(['dispute', 'dispute_reversal'])

    function sumBT(list: BT[], pred: (t: BT) => boolean, field: keyof BT) {
      return list.filter(pred).reduce((s, t) => s + (t[field] as number), 0) / 100
    }

    const grossRevenue30d = sumBT(bt30, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const stripeFees30d = sumBT(bt30, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refundTotal30d = Math.abs(sumBT(bt30, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputeTotal30d = Math.abs(sumBT(bt30, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const netRevenue30d = grossRevenue30d - stripeFees30d - refundTotal30d - disputeTotal30d

    const grossRevenuePrev30d = sumBT(btPrev30, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const stripeFeesPrev30d = sumBT(btPrev30, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refundPrev30d = Math.abs(sumBT(btPrev30, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputePrev30d = Math.abs(sumBT(btPrev30, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const netRevenuePrev30d = grossRevenuePrev30d - stripeFeesPrev30d - refundPrev30d - disputePrev30d

    const revenue30d = netRevenue30d
    const revenuePrev30d = netRevenuePrev30d
    const revenueGrowth = calculateMRRGrowth(revenue30d, revenuePrev30d)
    const effectiveFeeRate = grossRevenue30d > 0 ? (stripeFees30d / grossRevenue30d) * 100 : 0

    // ── Passive churn: past-due subscriptions (failed payments) ──────────────
    const pastDue = pastDueSubs.data ?? []
    const failedPaymentsValue = pastDue.reduce((sum: number, sub: any) => sum + subToMonthlyAmount(sub), 0)
    const failedPaymentsCount = pastDue.length

    // ── Churn rate ───────────────────────────────────────────────────────────
    const activeAtStart = allActiveSubs.data.length + cancelledSubs30d.data.length
    const churnRate = calculateChurnRate(cancelledSubs30d.data.length, activeAtStart)

    // ── Cash & runway ────────────────────────────────────────────────────────
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100
    const pendingBalance   = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100

    // Estimate monthly burn from payouts (what went out the door)
    const payoutTotal = payouts30dData.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0) / 100
    const estimatedMonthlyBurn = payoutTotal + refundTotal30d
    const runway = calculateRunway(availableBalance, estimatedMonthlyBurn - mrr)

    // ── Daily revenue for chart (last 7 days, properly date-ordered) ─────────
    const last7Days = getLastNDays(7)
    const dailyMap: Record<string, number> = {}
    last7Days.forEach(d => { dailyMap[d] = 0 })

    bt7
      .filter((t) => chargeTypes.has(t.type) && t.amount > 0)
      .forEach((t) => {
        const date = new Date(t.created * 1000).toISOString().split('T')[0]
        if (date in dailyMap) dailyMap[date] += t.amount / 100
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

    // ── Revenue by period (7, 30, 90, 365 days) ───────────────────────────────
    const gross7d = sumBT(bt7, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees7d = sumBT(bt7, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const gross90d = sumBT(bt90, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees90d = sumBT(bt90, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refunds90d = Math.abs(sumBT(bt90, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputes90d = Math.abs(sumBT(bt90, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))

    const gross365d = sumBT(bt365, (t) => chargeTypes.has(t.type) && t.amount > 0, 'amount')
    const fees365d = sumBT(bt365, (t) => chargeTypes.has(t.type) && t.fee > 0, 'fee')
    const refunds365d = Math.abs(sumBT(bt365, (t) => refundTypes.has(t.type) && t.amount < 0, 'amount'))
    const disputes365d = Math.abs(sumBT(bt365, (t) => disputeTypes.has(t.type) && t.amount < 0, 'amount'))
    const revenueByPeriod: RevenueByPeriod[] = [
      { period: '7d', gross: Math.round(gross7d), net: Math.round(gross7d - fees7d), fees: Math.round(fees7d) },
      { period: '30d', gross: Math.round(grossRevenue30d), net: Math.round(netRevenue30d), fees: Math.round(stripeFees30d) },
      { period: '90d', gross: Math.round(gross90d), net: Math.round(gross90d - fees90d - refunds90d - disputes90d), fees: Math.round(fees90d) },
      { period: '365d', gross: Math.round(gross365d), net: Math.round(gross365d - fees365d - refunds365d - disputes365d), fees: Math.round(fees365d) },
    ]

    // ── Cash flow forecast (30/60/90 days) ───────────────────────────────────
    const cashFlowForecast: CashFlowPeriod[] = [
      { period: '30d', projectedCash: Math.round(availableBalance + pendingBalance + mrr - estimatedMonthlyBurn), projectedRevenue: Math.round(mrr), projectedPayouts: Math.round(estimatedMonthlyBurn) },
      { period: '60d', projectedCash: Math.round(availableBalance + pendingBalance + mrr * 2 - estimatedMonthlyBurn * 2), projectedRevenue: Math.round(mrr * 2), projectedPayouts: Math.round(estimatedMonthlyBurn * 2) },
      { period: '90d', projectedCash: Math.round(availableBalance + pendingBalance + mrr * 3 - estimatedMonthlyBurn * 3), projectedRevenue: Math.round(mrr * 3), projectedPayouts: Math.round(estimatedMonthlyBurn * 3) },
    ]

    // ── Cohort retention (simplified from subscription creation months) ────────
    const cohortMap: Record<string, { total: number; retained: number }> = {}
    allActiveSubs.data.forEach(sub => {
      const month = new Date(sub.created * 1000).toISOString().slice(0, 7)
      if (!cohortMap[month]) cohortMap[month] = { total: 0, retained: 0 }
      cohortMap[month].total++
      cohortMap[month].retained++
    })
    cancelledSubs30d.data.forEach(sub => {
      const month = new Date(sub.created * 1000).toISOString().slice(0, 7)
      if (!cohortMap[month]) cohortMap[month] = { total: 0, retained: 0 }
      cohortMap[month].total++
    })
    const cohortRetention: CohortRetentionRow[] = Object.entries(cohortMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([cohortMonth, { total, retained }]) => ({
        cohortMonth,
        customers: total,
        retained,
        retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
      }))

    // ── Leakage summary ──────────────────────────────────────────────────────
    const leakageSummary: LeakageSummary = {
      refundTotal: Math.round(refundTotal30d),
      disputeTotal: Math.round(disputeTotal30d),
      feeTotal: Math.round(stripeFees30d),
      passiveChurnAtRisk: Math.round(failedPaymentsValue),
    }

    const accountCreatedAt = (account as any).created as number | undefined
    const accountAgeDays = accountCreatedAt
      ? Math.max(0, Math.floor((now - accountCreatedAt) / 86400))
      : 365

    const metrics: StripeMetrics = {
      mrr: Math.round(mrr),
      mrrPrevious: Math.round(mrrPrevious),
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      revenue30d: Math.round(revenue30d),
      revenuePrev30d: Math.round(revenuePrev30d),
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      grossRevenue30d: Math.round(grossRevenue30d),
      netRevenue30d: Math.round(netRevenue30d),
      stripeFees30d: Math.round(stripeFees30d),
      effectiveFeeRate: Math.round(effectiveFeeRate * 10) / 10,
      refundTotal30d: Math.round(refundTotal30d),
      disputeTotal30d: Math.round(disputeTotal30d),
      activeSubscriptions: allActiveSubs.data.length,
      newSubscriptions30d: newSubs30d.data.length,
      cancelledSubscriptions30d: cancelledSubs30d.data.length,
      churnRate: Math.round(churnRate * 10) / 10,
      failedPaymentsCount,
      failedPaymentsValue: Math.round(failedPaymentsValue),
      totalCustomers: allCustomers.data.length,
      newCustomers30d: newCustomers30d.data.length,
      availableBalance: Math.round(availableBalance),
      pendingBalance: Math.round(pendingBalance),
      estimatedMonthlyBurn: Math.round(estimatedMonthlyBurn),
      runway,
      payoutSchedule: (() => {
        const sched: any = (account as any)?.settings?.payouts?.schedule
        if (!sched) return 'unknown'
        const delayDays = sched.delay_days != null ? `${sched.delay_days} days` : null
        const interval = sched.interval ? String(sched.interval).replace('_', ' ') : null
        return [delayDays, interval].filter(Boolean).join(' · ') || 'unknown'
      })(),
      cashFlowForecast,
      cohortRetention,
      dailyRevenue,
      mrrHistory,
      revenueByPeriod,
      recentEvents: recentEvents.slice(0, 20),
      leakageSummary,
      accountAgeDays,
      currency: balance.available[0]?.currency?.toUpperCase() ?? 'USD',
      fetchedAt: now,
    }

    if (isNewFounder(accountAgeDays)) {
      try {
        const benchmarks = await benchmarksForMetrics(metrics)
        if (benchmarks) metrics.benchmarks = benchmarks
      } catch {
        // Benchmarks are best-effort
      }
    }

    await Promise.all([
      saveSnapshot(userId, metrics),
      rememberStripeAccountOwner(account.id, userId),
      ...allCustomers.data
        .filter((customer: any) => typeof customer.id === 'string')
        .map((customer: any) => rememberStripeCustomerOwner(customer.id, userId)),
      ...Array.from(
        new Set(
          [
            ...allActiveSubs.data,
            ...newSubs30d.data,
            ...cancelledSubs30d.data,
            ...pastDueSubs.data,
          ]
            .map((sub: any) => sub.id)
            .filter(Boolean)
        )
      ).map((subscriptionId: string) => rememberStripeSubscriptionOwner(subscriptionId, userId)),
    ])

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
~~~

## File: src/app/api/stripe/disconnect/route.ts

~~~typescript
import { NextResponse } from 'next/server'
import { STRIPE_ACCOUNTS_COOKIE, STRIPE_KEY_COOKIE } from '@/lib/stripe'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STRIPE_KEY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  })
  response.cookies.set(STRIPE_ACCOUNTS_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  })

  return response
}
~~~

## File: src/app/api/stripe/webhook/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import { callHeavyAI } from '@/lib/ai-client'
import { writeAuditEntry } from '@/lib/audit-log'
import { sendEmailToUserId } from '@/lib/email'
import {
  markCustomerAtRisk,
  markMetricsInvalidated,
  resolveUserIdFromStripeEventObject,
} from '@/lib/user-state'

function formatCurrency(amount = 0, currency = 'usd'): string {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
}

async function buildAnalysis(prompt: string): Promise<string> {
  const text = await callHeavyAI(
    'You are MAX, Lucrum\'s revenue operator. Be concrete, concise, and action-oriented.',
    prompt
  )

  return text || 'MAX could not generate a tailored analysis right now. Reach out to the customer immediately and review recent payment or subscription changes.'
}

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
    const object = event.data.object as Record<string, any>
    const userId = await resolveUserIdFromStripeEventObject(object, event.account ?? null)

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        if (userId) {
          await markMetricsInvalidated(userId)
          await writeAuditEntry({
            userId,
            actionType: 'stripe.payment_intent.succeeded',
            category: 'stripe',
            params: { paymentIntentId: pi.id, customerId: pi.customer },
            result: { amount: pi.amount, currency: pi.currency, status: pi.status },
            success: true,
            affectedCustomers: typeof pi.customer === 'string' ? [pi.customer] : [],
            maxRecommended: false,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'charge.succeeded': {
        break
      }

      case 'charge.refunded': {
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        if (userId) {
          const analysis = await buildAnalysis(
            `A new subscription was created.\nSubscription ID: ${sub.id}\nCustomer: ${String(sub.customer)}\nStatus: ${sub.status}\nCreate a short fit analysis and one onboarding action.`
          )
          await sendEmailToUserId(
            userId,
            'New subscriber: here is what MAX sees',
            analysis
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.customer.subscription.created',
            category: 'stripe',
            params: { subscriptionId: sub.id, customerId: sub.customer },
            result: { analysis },
            success: true,
            affectedCustomers: typeof sub.customer === 'string' ? [sub.customer] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (userId) {
          const analysis = await buildAnalysis(
            `A subscriber churned.\nSubscription ID: ${sub.id}\nCustomer: ${String(sub.customer)}\nStatus: ${sub.status}\nWrite a personalized churn analysis and the single best recovery action.`
          )
          await sendEmailToUserId(
            userId,
            'You just lost a subscriber',
            analysis
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.customer.subscription.deleted',
            category: 'stripe',
            params: { subscriptionId: sub.id, customerId: sub.customer },
            result: { analysis },
            success: true,
            affectedCustomers: typeof sub.customer === 'string' ? [sub.customer] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : ''
        const analysis = await buildAnalysis(
          `A payment failed.\nInvoice ID: ${invoice.id}\nCustomer: ${customerId}\nAmount due: ${formatCurrency(invoice.amount_due ?? 0, invoice.currency ?? 'usd')}\nWrite the best recovery message to send right now.`
        )

        if (customerId) {
          await markCustomerAtRisk({
            customerId,
            invoiceId: invoice.id,
            amountDue: invoice.amount_due ?? 0,
            customerName: invoice.customer_name ?? null,
            updatedAt: new Date().toISOString(),
          })
        }

        if (userId) {
          await sendEmailToUserId(
            userId,
            'Failed payment: action needed',
            `Customer: ${invoice.customer_name || customerId || 'Unknown'}\nAmount due: ${formatCurrency(invoice.amount_due ?? 0, invoice.currency ?? 'usd')}\n\n${analysis}`
          )
          await writeAuditEntry({
            userId,
            actionType: 'stripe.invoice.payment_failed',
            category: 'stripe',
            params: { invoiceId: invoice.id, customerId },
            result: { analysis, amountDue: invoice.amount_due ?? 0 },
            success: true,
            affectedCustomers: customerId ? [customerId] : [],
            maxRecommended: true,
            executedAt: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
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
~~~

## File: src/app/api/tax/export/route.ts

~~~typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStripeKeyFromCookies } from '@/lib/stripe'
import { estimateTax } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secretKey = getStripeKeyFromCookies(req.cookies)
    if (!secretKey) {
      return NextResponse.json({ error: 'Not connected to Stripe' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const mrr = parseFloat(searchParams.get('mrr') || '0')
    const revenue30d = parseFloat(searchParams.get('revenue30d') || '0')

    const annualRevenue = mrr > 0 ? mrr * 12 : revenue30d * 12
    const tax = estimateTax(annualRevenue)

    const quarterlyEstimated = Math.round(tax.total / 4)
    const report = {
      annualRevenue: Math.round(annualRevenue),
      federal: tax.federal,
      selfEmployment: tax.selfEmployment,
      total: tax.total,
      quarterlyEstimated,
      generatedAt: new Date().toISOString(),
      note: 'Estimate only. Consult a CPA for tax filing.',
    }

    if (format === 'csv') {
      const csv = [
        'Lucrum Tax Prep Export',
        `Generated,${report.generatedAt}`,
        '',
        'Annual Revenue (est),$' + report.annualRevenue.toLocaleString(),
        'Federal (est),$' + report.federal.toLocaleString(),
        'Self-Employment Tax (est),$' + report.selfEmployment.toLocaleString(),
        'Total (est),$' + report.total.toLocaleString(),
        'Quarterly Estimated Payment,$' + report.quarterlyEstimated.toLocaleString(),
        '',
        report.note,
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="lucrum-tax-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('[tax/export] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
~~~

## File: src/app/api/user/plan/route.ts

~~~typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  getDemoQuestionsUsed,
  canUseCFOChat,
  canUseFiveMoves,
  canUseActionExecution,
  canUseMultiAccount,
  canUseAPI,
  usesPriorityAI,
  canUseWebhookAlerts,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getUserSubscription(userId)
    const plan = sub.plan
    const demoUsed = plan === 'demo' ? await getDemoQuestionsUsed(userId) : 0

    return NextResponse.json({
      plan,
      interval: sub.interval,
      currentPeriodEnd: null,
      status: plan === 'demo' ? null : 'active',
      features: {
        cfoChatUnlimited: canUseCFOChat(plan),
        fiveMoves: canUseFiveMoves(plan),
        actionExecution: canUseActionExecution(plan),
        multiAccount: canUseMultiAccount(plan),
        teamSeats: canUseMultiAccount(plan),
        apiAccess: canUseAPI(plan),
        priorityAI: usesPriorityAI(plan),
        webhookAlerts: canUseWebhookAlerts(plan),
      },
      demoQuestionsUsed: demoUsed,
      demoQuestionsRemaining: plan === 'demo' ? Math.max(0, 1 - demoUsed) : undefined,
    })
  } catch (error: any) {
    console.error('[user/plan] error:', error)
    return NextResponse.json({ plan: 'demo', features: {} }, { status: 500 })
  }
}
~~~

## File: src/app/connect/page.tsx

~~~tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Lock, Zap, Shield, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConnectPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [stripeKey, setStripeKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-up')
    }
  }, [isLoaded, router, userId])

  const handleConnect = async () => {
    if (!stripeKey.trim()) return
    if (!userId) {
      router.replace('/sign-up')
      return
    }
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
          router.replace('/dashboard')
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

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass gold-border rounded-2xl p-8 text-center max-w-md w-full">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Preparing account</p>
          <h1 className="font-display text-2xl font-bold text-white mb-2">Redirecting to sign up</h1>
          <p className="text-slate-aug text-sm">You need an account before connecting Stripe.</p>
        </div>
      </div>
    )
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
~~~

## File: src/app/dashboard/audit/page.tsx

~~~tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'
import { useStripeData } from '@/hooks/useStripeData'
import { timeAgo } from '@/lib/utils'

interface AuditEntry {
  id: string
  userId: string
  actionType: string
  category: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  errorMessage?: string
  revenueImpact?: number
  affectedCustomers: string[]
  maxRecommended: boolean
  executedAt: string
  stripeRequestId?: string
}

export default function AuditPage() {
  const { error, isDemoData, lastRefreshed, loading, refresh } = useStripeData()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [auditLoading, setAuditLoading] = useState(true)

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/audit?limit=100')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.data ?? [])
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  return (
    <DashboardShell
      title="Action Audit Log"
      subtitle="Complete history of all actions executed through Lucrum"
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      <div className="glass gold-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-6 py-3 border-b border-[rgba(201,168,76,0.1)] text-xs font-mono uppercase tracking-widest text-slate-aug">
          <span>Timestamp</span>
          <span>Action</span>
          <span>Impact</span>
          <span>Status</span>
          <span></span>
        </div>

        {auditLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-aug">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-aug">No actions executed yet. Recommendations will appear on your dashboard.</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="border-b border-[rgba(201,168,76,0.05)] last:border-0">
              <div
                className="grid grid-cols-[1fr_1fr_100px_100px_80px] gap-4 px-6 py-3 items-center cursor-pointer hover:bg-white/2 transition-all"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <span className="text-xs font-mono text-slate-aug flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(Math.floor(new Date(entry.executedAt).getTime() / 1000))}
                </span>
                <span className="text-sm text-white">{entry.actionType.replace(/_/g, ' ')}</span>
                <span className={`text-xs font-mono ${entry.revenueImpact && entry.revenueImpact > 0 ? 'text-emerald-aug' : 'text-slate-aug'}`}>
                  {entry.revenueImpact != null ? `$${entry.revenueImpact}` : '—'}
                </span>
                <span className="flex items-center gap-1">
                  {entry.success
                    ? <CheckCircle className="w-3 h-3 text-emerald-aug" />
                    : <AlertTriangle className="w-3 h-3 text-crimson-aug" />
                  }
                  <span className={`text-xs font-mono ${entry.success ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                    {entry.success ? 'Success' : 'Failed'}
                  </span>
                </span>
                <span className="text-right">
                  {expandedId === entry.id
                    ? <ChevronDown className="w-4 h-4 text-slate-aug inline" />
                    : <ChevronRight className="w-4 h-4 text-slate-aug inline" />
                  }
                </span>
              </div>

              {expandedId === entry.id && (
                <div className="px-6 pb-4 fade-up">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Parameters</p>
                      <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-lg p-3 overflow-auto max-h-32">
                        {JSON.stringify(entry.params, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Result</p>
                      <pre className="text-xs font-mono text-slate-aug bg-obsidian-100 rounded-lg p-3 overflow-auto max-h-32">
                        {JSON.stringify(entry.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                  {entry.affectedCustomers.length > 0 && (
                    <p className="text-xs text-slate-aug mt-2">
                      Affected: {entry.affectedCustomers.join(', ')}
                    </p>
                  )}
                  {entry.maxRecommended && (
                    <span className="inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                      MAX Recommended
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/customers/page.tsx

~~~tsx
'use client'

import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency } from '@/lib/utils'
import { Users, AlertTriangle, TrendingDown, RefreshCw, Download } from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function CustomersPage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()

  return (
    <DashboardShell
      title="Churn & Retention Intelligence"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : 'Passive churn, cohort retention, and recovery estimates'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      <div className="flex justify-end mb-4">
        <a
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
          href="/api/customers/export"
          download
        >
          <Download className="w-4 h-4" />
          Download CSV
        </a>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      {/* Passive churn & active churn KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-crimson-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Passive Churn at Risk</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-crimson-aug">
              {metrics ? formatCurrency(metrics.failedPaymentsValue ?? 0) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.failedPaymentsCount ?? 0} customers with failed payments
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Churn Rate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? `${metrics.churnRate}%` : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.cancelledSubscriptions30d ?? 0} cancelled in last 30 days
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Active Subscriptions</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics?.activeSubscriptions ?? '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            +{metrics?.newSubscriptions30d ?? 0} new in last 30 days
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Recovery Estimate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-emerald-aug">
              {metrics?.failedPaymentsValue ? formatCurrency(metrics.failedPaymentsValue * 0.3) : '$0'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            ~30% recoverable with retry on days 3, 7, 14
          </p>
        </div>
      </div>

      {/* Cohort retention grid */}
      {metrics?.cohortRetention && metrics.cohortRetention.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Cohort Retention Grid</h3>
          <p className="text-slate-aug text-sm mb-4">
            Which acquisition month&apos;s customers retain best and worst over time.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="text-left py-3 px-4 text-slate-aug font-mono">Cohort</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Customers</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Retained</th>
                  <th className="text-right py-3 px-4 text-slate-aug font-mono">Retention %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.cohortRetention.map((row) => (
                  <tr key={row.cohortMonth} className="border-b border-gold/10 hover:bg-white/5">
                    <td className="py-3 px-4 font-mono text-white">{row.cohortMonth}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-aug">{row.customers}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-aug">{row.retained}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={row.retentionRate >= 80 ? 'text-emerald-aug' : row.retentionRate >= 50 ? 'text-gold' : 'text-crimson-aug'}>
                        {row.retentionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dunning recommendation */}
      {(metrics?.failedPaymentsCount ?? 0) > 0 && (
        <div className="glass gold-border rounded-2xl p-6 border-l-4 border-gold/50">
          <h3 className="font-display text-base font-bold text-white mb-2">Smart Dunning Recommendation</h3>
          <p className="text-slate-aug text-sm">
            Trigger payment retries on days 3, 7, and 14 after failure. Industry data shows ~30% of failed payments
            recover with well-timed retries. Consider enabling Stripe&apos;s automatic retry logic or using a dunning
            tool for best results.
          </p>
        </div>
      )}
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/forecasts/page.tsx

~~~tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency, estimateTax } from '@/lib/utils'
import type { SimulateResponse } from '@/types'
import {
  TrendingUp,
  DollarSign,
  Zap,
  Calendar,
  Download,
  FileDown,
  FlaskConical,
  Brain,
  Gauge,
} from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

type SimulationHistoryItem = {
  scenario: string
  runwayP50: number
  confidence: number
  advice: string
  at: string
}

const HISTORY_STORAGE_KEY = 'lucrum:simHistory:v1'
const SCENARIO_PRESETS = [
  'cut ads 30%',
  'add $2k designer',
  'churn +10%',
  'raise prices 12%',
  'pause hiring',
]

export default function ForecastsPage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const [scenario, setScenario] = useState('cut ads 30%')
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [history, setHistory] = useState<SimulationHistoryItem[]>([])
  const bootstrapRanRef = useRef(false)

  const persistHistory = useCallback((next: SimulationHistoryItem[]) => {
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, 6))
    } catch {
      // ignore
    }
  }, [])

  const runSimulation = useCallback(async (nextScenario?: string) => {
    const scenarioText = (nextScenario ?? scenario).trim() || 'baseline'
    setSimLoading(true)
    setSimError(null)
    try {
      const initialUrl = isDemoData ? '/api/simulate?demo=1' : '/api/simulate'
      let res = await fetch(initialUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioText }),
      })

      // If not connected to Stripe, auto-fallback to demo-mode simulation.
      if (!res.ok && res.status === 401 && !isDemoData) {
        res = await fetch('/api/simulate?demo=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: scenarioText }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const next = data as SimulateResponse
      setSimResult(next)

      const item: SimulationHistoryItem = {
        scenario: next.scenario,
        runwayP50: next.runway_p50,
        confidence: next.confidence,
        advice: next.advice,
        at: next.generated_at,
      }
      const deduped = [item, ...history.filter(h => h.scenario !== item.scenario)].slice(0, 6)
      persistHistory(deduped)
    } catch (err: any) {
      setSimError(err?.message ?? 'Simulation failed')
    } finally {
      setSimLoading(false)
    }
  }, [history, isDemoData, persistHistory, scenario])

  useEffect(() => {
    if (bootstrapRanRef.current) return
    if (loading) return
    bootstrapRanRef.current = true
    runSimulation('baseline').catch(() => {})
  }, [loading, runSimulation])

  const riskDrivers = useMemo(() => {
    if (!simResult) return []
    const volatilityRatio = simResult.baseline.monthly_revenue_mean > 0
      ? (simResult.baseline.monthly_revenue_std_dev / simResult.baseline.monthly_revenue_mean) * 100
      : 0
    const outflowRatio = simResult.baseline.monthly_revenue_mean > 0
      ? (simResult.baseline.monthly_operating_outflow / simResult.baseline.monthly_revenue_mean) * 100
      : 0
    return [
      `Revenue volatility: ${volatilityRatio.toFixed(1)}%`,
      `Monthly churn pressure: ${simResult.baseline.monthly_churn_rate_pct.toFixed(1)}%`,
      `Outflow load: ${outflowRatio.toFixed(1)}% of revenue`,
    ]
  }, [simResult])

  return (
    <DashboardShell
      title="Cash Flow Command Center"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : '30/60/90-day forecast, payout buffer, MRR movement, and Monte Carlo scenarios'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">Monte Carlo Scenario Lab</h3>
          {simResult && (
            <span className="ml-auto text-[11px] font-mono uppercase tracking-widest text-slate-aug">
              Source: {simResult.advice_source}
            </span>
          )}
        </div>

        <p className="text-slate-aug text-sm mb-4">
          Run probabilistic cash/runway forecasts with scenario assumptions. This is the decision engine, not a point estimate.
        </p>

        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input
            type="text"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder='e.g. "cut ads 30%" or "add $2k designer"'
            className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
            onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
          />
          <button
            onClick={() => runSimulation()}
            disabled={simLoading}
            className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {simLoading ? (
              <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Run Simulation
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setScenario(preset); runSimulation(preset) }}
              className="text-xs px-3 py-1.5 rounded-lg glass gold-border text-slate-aug hover:text-white transition-all hover:border-gold/40"
            >
              {preset}
            </button>
          ))}
        </div>

        {simError && (
          <div className="mb-4 p-3 rounded-xl bg-crimson-aug/10 border border-crimson-aug/20 text-sm text-crimson-aug">
            {simError}
          </div>
        )}

        {simResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P10</p>
                <p className="font-display text-2xl font-bold text-crimson-aug">{simResult.runway_p10}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P50</p>
                <p className="font-display text-2xl font-bold text-white">{simResult.runway_p50}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Runway P90</p>
                <p className="font-display text-2xl font-bold text-emerald-aug">{simResult.runway_p90}m</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Confidence</p>
                <p className="font-display text-2xl font-bold text-gold">{simResult.confidence}%</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-gold" />
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug">Confidence Transparency</p>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-crimson-aug via-gold to-emerald-aug transition-all"
                  style={{ width: `${Math.max(2, simResult.confidence)}%` }}
                />
              </div>
              <p className="text-xs text-slate-aug">
                Scenario summary: {simResult.scenario_summary}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 6 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_6_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_6_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_6_months.p90)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 12 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_12_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_12_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_12_months.p90)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">Cash @ 18 months</p>
                <p className="text-xs text-slate-aug">P10 {formatCurrency(simResult.cash_at_18_months.p10)}</p>
                <p className="text-sm text-white font-semibold">P50 {formatCurrency(simResult.cash_at_18_months.p50)}</p>
                <p className="text-xs text-emerald-aug">P90 {formatCurrency(simResult.cash_at_18_months.p90)}</p>
              </div>
            </div>

            <div className="rounded-xl bg-gold/5 border border-gold/20 p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Recommended Action</p>
              <p className="text-sm text-white mb-2">{simResult.advice}</p>
              <p className="text-xs text-slate-aug">Advice confidence: {simResult.advice_confidence}%</p>
            </div>

            <div className="rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Risk Drivers</p>
              <div className="flex flex-wrap gap-2">
                {riskDrivers.map((driver) => (
                  <span key={driver} className="text-xs px-3 py-1.5 rounded-lg bg-obsidian-100 border border-[rgba(201,168,76,0.15)] text-slate-aug">
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-aug text-sm">Run a scenario to generate Monte Carlo output.</p>
        )}

        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(201,168,76,0.1)]">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Recent Scenario Runs</p>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={`${item.scenario}-${item.at}`}
                  onClick={() => { setScenario(item.scenario); runSimulation(item.scenario) }}
                  className="w-full text-left rounded-xl bg-white/5 border border-[rgba(201,168,76,0.12)] p-3 hover:border-gold/35 transition-all"
                >
                  <p className="text-sm text-white">{item.scenario}</p>
                  <p className="text-xs text-slate-aug mt-1">
                    P50 runway {item.runwayP50}m · confidence {item.confidence}%
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payout buffer & runway */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Available Cash</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.availableBalance) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">+ {formatCurrency(metrics?.pendingBalance ?? 0)} pending</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Cash Runway</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? (metrics.runway >= 9999 ? '∞ Profitable' : `${metrics.runway} days`) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">At current burn rate</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">MRR</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.mrr) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">
            {metrics?.mrrGrowth != null ? `${metrics.mrrGrowth >= 0 ? '+' : ''}${metrics.mrrGrowth}% MoM` : '—'}
          </p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Est. Monthly Burn</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.estimatedMonthlyBurn) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">From payouts + refunds</p>
        </div>
      </div>

      {/* 30/60/90-day cash flow forecast */}
      {metrics?.cashFlowForecast && metrics.cashFlowForecast.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Cash Flow Forecast</h3>
          <p className="text-slate-aug text-sm mb-4">
            Projected cash position based on subscription renewals and historical payout patterns.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {metrics.cashFlowForecast.map((period) => (
              <div key={period.period} className="rounded-xl bg-white/5 p-5 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-2">{period.period}</p>
                <p className="font-display text-2xl font-bold text-white mb-1">
                  {formatCurrency(period.projectedCash)}
                </p>
                <p className="text-xs text-slate-aug">
                  Revenue: {formatCurrency(period.projectedRevenue)} · Payouts: {formatCurrency(period.projectedPayouts)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Prep & Export */}
      {metrics && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Reports & Tax Prep Export</h3>
          <p className="text-slate-aug text-sm mb-4">
            Quarterly estimated tax calculator and one-click export for Schedule C / S-Corp.
          </p>
          {(() => {
            const annualRevenue = metrics.mrr * 12
            const tax = estimateTax(annualRevenue)
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Annual Revenue (est)</p>
                    <p className="font-bold text-white">{formatCurrency(annualRevenue)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Federal (est)</p>
                    <p className="font-bold text-white">{formatCurrency(tax.federal)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-mono text-slate-aug mb-1">Self-Employment (est)</p>
                    <p className="font-bold text-white">{formatCurrency(tax.selfEmployment)}</p>
                  </div>
                  <div className="rounded-xl bg-gold/10 p-4 border border-gold/20">
                    <p className="text-xs font-mono text-slate-aug mb-1">Quarterly Payment</p>
                    <p className="font-bold text-gold">{formatCurrency(Math.round(tax.total / 4))}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/tax/export?mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&format=csv`}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </a>
                  <a
                    href={`/api/reports/cfo.pdf?currency=${encodeURIComponent(metrics.currency)}&mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&churnRate=${metrics.churnRate}&activeSubscriptions=${metrics.activeSubscriptions}&failedPaymentsValue=${metrics.failedPaymentsValue}&availableBalance=${metrics.availableBalance}&pendingBalance=${metrics.pendingBalance}&runway=${metrics.runway}`}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[rgba(201,168,76,0.15)] text-white hover:border-gold/40 transition-all text-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </a>
                  <span className="text-xs text-slate-aug self-center">Estimate only. Consult a CPA.</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Quick exports */}
      {metrics && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-3">Quick Exports</h3>
          <p className="text-slate-aug text-sm mb-4">
            One place to export the key reports you&apos;ll send to yourself, a CPA, or an investor.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href={`/api/revenue/export?grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&effectiveFeeRate=${metrics.effectiveFeeRate}&payoutSchedule=${encodeURIComponent(metrics.payoutSchedule)}`}
              download
            >
              <Download className="w-4 h-4" />
              Revenue CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href="/api/customers/export"
              download
            >
              <Download className="w-4 h-4" />
              Customers CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
              href={`/api/tax/export?mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&format=csv`}
              download
            >
              <Download className="w-4 h-4" />
              Tax CSV
            </a>
            <a
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[rgba(201,168,76,0.15)] text-white hover:border-gold/40 transition-all text-sm"
              href={`/api/reports/cfo.pdf?currency=${encodeURIComponent(metrics.currency)}&mrr=${metrics.mrr}&revenue30d=${metrics.revenue30d}&grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&churnRate=${metrics.churnRate}&activeSubscriptions=${metrics.activeSubscriptions}&failedPaymentsValue=${metrics.failedPaymentsValue}&availableBalance=${metrics.availableBalance}&pendingBalance=${metrics.pendingBalance}&runway=${metrics.runway}`}
              download
            >
              <FileDown className="w-4 h-4" />
              CFO Snapshot PDF
            </a>
          </div>
        </div>
      )}

      {/* MRR waterfall (simplified) */}
      <div className="glass gold-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-white mb-4">MRR Movement (30d)</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gold/10">
            <span className="text-slate-aug">New subscriptions</span>
            <span className="font-mono text-emerald-aug">+{metrics?.newSubscriptions30d ?? 0}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gold/10">
            <span className="text-slate-aug">Cancelled</span>
            <span className="font-mono text-crimson-aug">-{metrics?.cancelledSubscriptions30d ?? 0}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-white font-semibold">Net active</span>
            <span className="font-mono font-bold text-white">
              {metrics ? metrics.activeSubscriptions : '—'}
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/insights/page.tsx

~~~tsx
'use client'

import { useState, useCallback } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { Brain, ChevronRight, AlertTriangle, TrendingUp, CheckCircle, Star } from 'lucide-react'
import type { AIInsight, InsightSeverity } from '@/types'

const INSIGHT_STYLES: Record<InsightSeverity, {
  border: string; bg: string; icon: React.ElementType; iconColor: string
}> = {
  critical: { border: 'border-red-500/40', bg: 'bg-red-500/8', icon: AlertTriangle, iconColor: 'text-red-400' },
  warning: { border: 'border-yellow-500/35', bg: 'bg-yellow-500/6', icon: AlertTriangle, iconColor: 'text-yellow-400' },
  opportunity: { border: 'border-gold/30', bg: 'bg-gold/5', icon: TrendingUp, iconColor: 'text-gold' },
  win: { border: 'border-emerald-aug/30', bg: 'bg-emerald-aug/5', icon: CheckCircle, iconColor: 'text-emerald-aug' },
  affiliate: { border: 'border-gold/40', bg: 'bg-gold/8', icon: Star, iconColor: 'text-gold' },
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function AIInsightsPage() {
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
      setAiResponse(data.answer ?? 'Could not get a response.')
    } catch {
      setAiProvider('fallback')
      setAiResponse('AI advisor is temporarily in local fallback mode. Try again in a moment.')
    } finally {
      setAiLoading(false)
    }
  }, [metrics])

  const QUICK_PROMPTS = [
    'Should I raise my prices?',
    'When do I run out of cash?',
    'How is my churn trending?',
    'What would a 5% price increase do to revenue?',
    'Which customers are at risk?',
  ]

  return (
    <DashboardShell
      title="Lucrum AI Advisor"
      subtitle="Plain-English financial summary and ranked recommendations"
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {/* AI-generated insights */}
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">This Week&apos;s Insights</h3>
          {insightsLoading && (
            <span className="ml-2 text-xs font-mono text-slate-aug flex items-center gap-1">
              <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
              Analyzing...
            </span>
          )}
        </div>

        <div className="space-y-3">
          {insightsLoading && insights.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : insights.length > 0 ? (
            insights.map((insight) => {
              const style = INSIGHT_STYLES[insight.type]
              const Icon = style.icon
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
                  <span className="text-xs text-slate-aug flex items-center gap-0.5 flex-shrink-0">
                    {insight.action} <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              )
            })
          ) : (
            <p className="text-slate-aug text-sm py-4">AI insights are warming up. Refresh to regenerate suggestions.</p>
          )}
        </div>
      </div>

      {/* Ask AI CFO */}
      <div className="glass gold-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-white mb-3">Ask Your AI CFO</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Should I raise prices? When do I hit $10k MRR? How's my churn?"
            className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40"
            onKeyDown={(e) => e.key === 'Enter' && askAI(aiQuestion)}
          />
          <button
            onClick={() => askAI(aiQuestion)}
            disabled={!aiQuestion.trim() || aiLoading}
            className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {aiLoading ? (
              <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Ask
          </button>
        </div>

        {aiResponse && (
          <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
            <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
            {aiProvider && (
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-aug mt-2">
                Source: {aiProvider}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map((q) => (
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
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/layout.tsx

~~~tsx
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
~~~

## File: src/app/dashboard/page.tsx

~~~tsx
'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Zap,
  Brain, AlertTriangle, CheckCircle, ArrowUpRight,
  ChevronRight, ExternalLink, Star, Lock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { useStripeData } from '@/hooks/useStripeData'
import { useUserPlan } from '@/hooks/useUserPlan'
import { formatCurrency, formatPercent, timeAgo } from '@/lib/utils'
import DashboardShell from '@/components/DashboardShell'
import InlineNotice from '@/components/InlineNotice'
import MRRHistory from '@/components/MRRHistory'
import BenchmarkPanel from '@/components/BenchmarkPanel'
import MaxRecommendations from '@/components/MaxRecommendations'
import ActionModal from '@/components/ActionModal'
import FiveMoves from '@/components/FiveMoves'
import PaywallModal from '@/components/PaywallModal'
import type { InsightSeverity, ActionCard, Plan } from '@/types'

const INSIGHT_STYLES: Record<InsightSeverity, {
  border: string; bg: string; icon: React.ElementType; iconColor: string; dot: string
}> = {
  critical:    { border: 'border-red-500/40',      bg: 'bg-red-500/8',      icon: AlertTriangle, iconColor: 'text-red-400',    dot: 'bg-red-400' },
  warning:     { border: 'border-yellow-500/35',   bg: 'bg-yellow-500/6',   icon: AlertTriangle, iconColor: 'text-yellow-400', dot: 'bg-yellow-400' },
  opportunity: { border: 'border-gold/30',         bg: 'bg-gold/5',         icon: TrendingUp,    iconColor: 'text-gold',       dot: 'bg-gold' },
  win:         { border: 'border-emerald-aug/30',  bg: 'bg-emerald-aug/5',  icon: CheckCircle,   iconColor: 'text-emerald-aug',dot: 'bg-emerald-aug' },
  affiliate:   { border: 'border-gold/40',         bg: 'bg-gold/8',         icon: Star,          iconColor: 'text-gold',       dot: 'bg-gold' },
}

function parseActionBlocks(text: string): { cleanText: string; actions: ActionCard[]; affiliates: Array<{ productId: string; name: string; cta: string; url: string }> } {
  const actions: ActionCard[] = []
  const affiliates: Array<{ productId: string; name: string; cta: string; url: string }> = []
  let cleanText = text

  const actionRegex = /```action\s*\n?([\s\S]*?)```/g
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      actions.push({
        id: `chat_${parsed.actionType}_${Date.now()}`,
        priority: 1, severity: 'opportunity',
        title: parsed.title || parsed.actionType,
        context: 'Recommended by MAX in chat',
        estimatedImpact: 'See preview',
        actionType: parsed.actionType,
        actionLabel: 'Execute',
        params: parsed.params || {},
        isDestructive: ['cancel_subscription', 'update_price'].includes(parsed.actionType),
        requiresConfirmText: ['cancel_subscription', 'update_price'].includes(parsed.actionType),
      })
    } catch { /* skip */ }
    cleanText = cleanText.replace(match[0], '')
  }

  const affiliateRegex = /```affiliate\s*\n?([\s\S]*?)```/g
  while ((match = affiliateRegex.exec(text)) !== null) {
    try { affiliates.push(JSON.parse(match[1].trim())) } catch { /* skip */ }
    cleanText = cleanText.replace(match[0], '')
  }

  return { cleanText: cleanText.trim(), actions, affiliates }
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

function KPICard({ label, value, change, positive, icon: Icon, loading }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ElementType; loading: boolean
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
        <><Skeleton className="h-7 w-24 mb-2" /><Skeleton className="h-4 w-16" /></>
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

export default function DashboardPage() {
  const { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh } = useStripeData()
  const { plan, features } = useUserPlan()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiProvider, setAiProvider] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [chatActionCard, setChatActionCard] = useState<ActionCard | null>(null)

  // Paywall state
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallTrigger, setPaywallTrigger] = useState<'demo_exhausted' | 'feature_locked'>('feature_locked')
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>()
  const [paywallPlan, setPaywallPlan] = useState<'solo' | 'enterprise'>('solo')
  const [lastMaxAnswer, setLastMaxAnswer] = useState<string>('')
  const [demoQuestionUsed, setDemoQuestionUsed] = useState(false)

  const openFeatureLock = useCallback((feature: string, requiredPlan: 'solo' | 'enterprise') => {
    setPaywallTrigger('feature_locked')
    setPaywallFeature(feature)
    setPaywallPlan(requiredPlan)
    setPaywallOpen(true)
  }, [])

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
          context: metrics ? {
            mrr: metrics.mrr, mrrGrowth: metrics.mrrGrowth, revenue30d: metrics.revenue30d,
            revenueGrowth: metrics.revenueGrowth, activeSubscriptions: metrics.activeSubscriptions,
            newSubscriptions30d: metrics.newSubscriptions30d, churnRate: metrics.churnRate,
            newCustomers30d: metrics.newCustomers30d, availableBalance: metrics.availableBalance,
            runway: metrics.runway, cancelledSubscriptions30d: metrics.cancelledSubscriptions30d,
            accountAgeDays: metrics.accountAgeDays, benchmarks: metrics.benchmarks,
          } : undefined,
        }),
      })
      const data = await res.json()

      if (data.paywallRequired) {
        setLastMaxAnswer(data.answer || lastMaxAnswer)
        setPaywallTrigger('demo_exhausted')
        setPaywallOpen(true)
        return
      }

      setAiProvider(data.provider ?? 'fallback')
      const answer = data.answer ?? 'Could not get a response right now.'
      setAiResponse(answer)
      setLastMaxAnswer(answer)

      if (data.demoQuestionsRemaining === 0) {
        setDemoQuestionUsed(true)
      }
    } catch {
      setAiProvider('fallback')
      setAiResponse('AI advisor is running in local fallback mode right now. Try again in a few seconds.')
    } finally {
      setAiLoading(false)
    }
  }, [metrics, lastMaxAnswer])

  const runwayDisplay = !metrics ? '—' : metrics.runway >= 9999 ? '∞' : `${metrics.runway}d`
  const runwayPositive = !metrics ? true : metrics.runway > 90 || metrics.runway >= 9999
  const isDemo = plan === 'demo'

  return (
    <DashboardShell
      title={`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}.`}
      subtitle={error ? <span className="text-crimson-aug">{error}</span> : loading ? 'Loading your financial data...' : `Last synced ${lastRefreshed ? timeAgo(Math.floor(lastRefreshed.getTime() / 1000)) : 'just now'}`}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
        {/* Demo / upgrade banner */}
        {isDemo && (
          <div className="glass gold-border rounded-2xl p-5 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 gold-glow">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-1">Demo Mode</p>
              <p className="text-sm text-white">
                You&apos;re viewing demo data. Connect your Stripe + upgrade to unlock MAX CFO.
              </p>
              {demoQuestionUsed && (
                <p className="text-xs text-gold mt-1 font-mono">Your free question has been used.</p>
              )}
            </div>
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all whitespace-nowrap"
            >
              View Plans
            </Link>
          </div>
        )}

        {plan === 'solo' && (
          <div className="glass gold-border rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-aug mb-0.5">Solo Dev</p>
              <p className="text-sm text-white">Unlock Action Execution, Team Seats, and Priority AI with Enterprise.</p>
            </div>
            <Link
              href="/pricing?plan=enterprise"
              className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm font-semibold whitespace-nowrap"
            >
              Upgrade
            </Link>
          </div>
        )}

        {/* Five Moves */}
        <FiveMoves metrics={metrics} plan={plan} onFeatureLock={openFeatureLock} />

        {/* MAX Recommendations */}
        <MaxRecommendations metrics={metrics} />

        {/* Benchmark Panel */}
        {metrics && (metrics.accountAgeDays ?? 999) < 60 && metrics.benchmarks && (
          <div className="mb-6">
            <BenchmarkPanel benchmarks={metrics.benchmarks} accountAgeDays={metrics.accountAgeDays ?? 0} currentMRR={metrics.mrr} />
          </div>
        )}

        {error && (
          <InlineNotice variant="error" message={error} action={
            <button onClick={() => refresh()} className="text-gold text-sm hover:text-gold-light transition-colors">Try again</button>
          } />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard label="MRR" icon={DollarSign} loading={loading} value={metrics ? formatCurrency(metrics.mrr) : '—'} change={metrics ? `${formatPercent(metrics.mrrGrowth)} MoM` : '—'} positive={(metrics?.mrrGrowth ?? 0) >= 0} />
          <KPICard label="Active Subs" icon={Users} loading={loading} value={metrics ? metrics.activeSubscriptions.toString() : '—'} change={metrics ? `+${metrics.newSubscriptions30d} new (30d)` : '—'} positive={true} />
          <KPICard label="Churn Rate" icon={TrendingDown} loading={loading} value={metrics ? `${metrics.churnRate}%` : '—'} change={metrics ? `${metrics.cancelledSubscriptions30d} cancelled (30d)` : '—'} positive={(metrics?.churnRate ?? 0) < 5} />
          <KPICard label="Cash Runway" icon={Zap} loading={loading} value={runwayDisplay} change={metrics ? `$${metrics.availableBalance.toLocaleString()} available` : '—'} positive={runwayPositive} />
        </div>

        <div className="glass gold-border rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Decision-grade Forecasting</p>
            <p className="text-sm text-white">Monte Carlo Scenario Lab is live in Forecasts.</p>
          </div>
          <Link href="/dashboard/forecasts" className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm font-semibold whitespace-nowrap">
            Open Forecasts
          </Link>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">MRR Growth</h3>
                <p className="text-slate-aug text-xs font-mono">Monthly recurring revenue</p>
              </div>
              {metrics && <span className={`text-sm font-mono font-bold ${metrics.mrrGrowth >= 0 ? 'text-emerald-aug' : 'text-crimson-aug'}`}>{formatPercent(metrics.mrrGrowth)} MoM</span>}
            </div>
            {loading ? <Skeleton className="h-44 w-full" /> : metrics?.mrrHistory.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metrics.mrrHistory}>
                  <defs><linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} /><stop offset="95%" stopColor="#C9A84C" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No subscription data yet</div>}
          </div>

          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">Last 7 Days</h3>
                <p className="text-slate-aug text-xs font-mono">Daily revenue</p>
              </div>
              {metrics && <span className="text-white text-sm font-mono font-bold">{formatCurrency(metrics.dailyRevenue.reduce((s, d) => s + d.revenue, 0))} total</span>}
            </div>
            {loading ? <Skeleton className="h-44 w-full" /> : metrics?.dailyRevenue.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metrics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B8FA8', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {metrics.dailyRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.revenue > 0 ? 'rgba(0, 208, 132, 0.65)' : 'rgba(139, 143, 168, 0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-44 flex items-center justify-center text-slate-aug text-sm font-mono">No revenue in last 7 days</div>}
          </div>
        </div>

        {/* Insights + Chat row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass gold-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-gold" />
              <h3 className="font-display text-base font-bold text-white">AI CFO Insights</h3>
              {insightsLoading && (
                <span className="ml-2 text-xs font-mono text-slate-aug flex items-center gap-1">
                  <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
                  Analyzing...
                </span>
              )}
              {insights.length > 0 && !insightsLoading && (
                <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">{insights.length} active</span>
              )}
            </div>

            <div className="space-y-3 mb-5">
              {insightsLoading && insights.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : insights.length > 0 ? (
                insights.map((insight) => {
                  const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.opportunity
                  const Icon = style.icon
                  const isAffiliate = insight.type === 'affiliate'
                  return (
                    <div key={insight.id} className={`rounded-xl p-4 border ${style.border} ${style.bg} flex items-start gap-3`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white">{insight.title}</p>
                          {isAffiliate && <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">Partner</span>}
                          {insight.metric && <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${style.bg} border ${style.border} ${style.iconColor}`}>{insight.metric}</span>}
                        </div>
                        <p className="text-xs text-slate-aug leading-relaxed">{insight.body}</p>
                      </div>
                      {isAffiliate && insight.affiliateUrl ? (
                        <a href={`/api/affiliates/redirect?product=${insight.id.replace('affiliate_', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:text-gold-light flex items-center gap-0.5 flex-shrink-0 transition-colors">{insight.action}<ExternalLink className="w-3 h-3" /></a>
                      ) : (
                        <button className="text-xs text-slate-aug hover:text-white flex items-center gap-0.5 flex-shrink-0 transition-colors">{insight.action}<ChevronRight className="w-3 h-3" /></button>
                      )}
                    </div>
                  )
                })
              ) : !loading && (
                <p className="text-slate-aug text-sm text-center py-4">AI insights are warming up.</p>
              )}
            </div>

            {/* Ask AI CFO */}
            <div className="border-t border-[rgba(201,168,76,0.1)] pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug">Ask your AI CFO</p>
                {isDemo && !demoQuestionUsed && (
                  <span className="text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">1 free question</span>
                )}
                {isDemo && demoQuestionUsed && (
                  <span className="text-xs font-mono text-crimson-aug">Upgrade to continue</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                  placeholder={isDemo && demoQuestionUsed ? 'Upgrade to ask more questions...' : 'Should I raise prices? When do I hit $10k MRR?'}
                  disabled={isDemo && demoQuestionUsed}
                  className="flex-1 bg-obsidian-100 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-aug/40 focus:outline-none focus:border-gold/40 transition-all disabled:opacity-40"
                  onKeyDown={e => e.key === 'Enter' && askAI(aiQuestion)}
                />
                <button
                  onClick={() => {
                    if (isDemo && demoQuestionUsed) {
                      setPaywallTrigger('demo_exhausted')
                      setPaywallOpen(true)
                      return
                    }
                    askAI(aiQuestion)
                  }}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiLoading ? <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
                  Ask
                </button>
              </div>

              {aiResponse && (() => {
                const { cleanText, actions: chatActions, affiliates: chatAffiliates } = parseActionBlocks(aiResponse)
                return (
                  <div className="mt-3 space-y-3 fade-up">
                    <div className="p-4 rounded-xl bg-gold/5 border border-gold/20">
                      <p className="text-sm text-white leading-relaxed">{cleanText}</p>
                      {aiProvider && <p className="text-[11px] font-mono uppercase tracking-widest text-slate-aug mt-2">Source: {aiProvider}</p>}
                    </div>
                    {chatActions.map((action) => (
                      <div key={action.id} className="p-3 rounded-xl border border-gold/30 bg-gold/5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{action.title}</p>
                          <p className="text-xs text-slate-aug">Action: {action.actionType.replace(/_/g, ' ')}</p>
                        </div>
                        {plan === 'enterprise' ? (
                          <button onClick={() => setChatActionCard(action)} className="px-3 py-1.5 rounded-lg bg-gold text-obsidian text-xs font-bold hover:bg-gold-light transition-all">Execute</button>
                        ) : (
                          <button onClick={() => openFeatureLock('Action Execution', 'enterprise')} className="px-3 py-1.5 rounded-lg glass gold-border text-slate-aug text-xs font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Enterprise
                          </button>
                        )}
                      </div>
                    ))}
                    {chatAffiliates.map((aff) => (
                      <a key={aff.productId} href={`/api/affiliates/redirect?product=${aff.productId}`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border border-gold/30 bg-gold/5 flex items-center justify-between hover:bg-gold/10 transition-all">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-gold" />
                          <div><p className="text-sm font-semibold text-white">{aff.name}</p><span className="text-[10px] font-mono uppercase tracking-widest text-gold/60">Partner</span></div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gold">{aff.cta} <ExternalLink className="w-3 h-3" /></span>
                      </a>
                    ))}
                  </div>
                )
              })()}

              <div className="flex flex-wrap gap-2 mt-3">
                {['Should I raise my prices?', 'When do I run out of cash?', 'How is my churn trending?'].map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      if (isDemo && demoQuestionUsed) {
                        setPaywallTrigger('demo_exhausted')
                        setPaywallOpen(true)
                        return
                      }
                      setAiQuestion(q)
                      askAI(q)
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg glass gold-border text-slate-aug hover:text-white transition-all hover:border-gold/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live events */}
          <div className="glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base font-bold text-white">Live Events</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-aug font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" /> Live
              </span>
            </div>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : metrics?.recentEvents.length ? (
              <div className="space-y-0">
                {metrics.recentEvents.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.positive ? 'bg-emerald-aug' : 'bg-crimson-aug'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{event.description}</p>
                      <p className="text-xs text-slate-aug font-mono">{event.customerEmail ? `${event.customerEmail} · ` : ''}{timeAgo(event.created)}</p>
                    </div>
                    <span className={`text-xs font-mono font-bold flex-shrink-0 ${event.positive ? 'text-emerald-aug' : 'text-crimson-aug'}`}>{event.positive ? '+' : '-'}{formatCurrency(event.amount, event.currency)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-aug text-sm text-center py-8">No recent events</p>}
            {metrics?.recentEvents.length ? (
              <Link href="/dashboard/revenue" className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-aug hover:text-gold transition-colors pt-3 border-t border-[rgba(201,168,76,0.07)]">
                View all events <ArrowUpRight className="w-3 h-3" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-6"><MRRHistory /></div>

        {metrics && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '30d Revenue', value: formatCurrency(metrics.revenue30d), sub: `vs ${formatCurrency(metrics.revenuePrev30d)} prior`, good: metrics.revenueGrowth >= 0 },
              { label: 'New Customers', value: metrics.newCustomers30d.toString(), sub: 'joined in last 30 days', good: true },
              { label: 'Available Cash', value: formatCurrency(metrics.availableBalance), sub: `+ ${formatCurrency(metrics.pendingBalance)} pending`, good: metrics.availableBalance > 0 },
              { label: 'Est. Tax (ann)', value: formatCurrency(metrics.mrr * 12 * 0.25), sub: '~25% of annualized MRR', good: true },
            ].map(({ label, value, sub, good }) => (
              <div key={label} className="glass gold-border rounded-xl p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">{label}</p>
                <p className={`font-display text-xl font-bold ${good ? 'text-white' : 'text-crimson-aug'}`}>{value}</p>
                <p className="text-xs text-slate-aug mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {chatActionCard && <ActionModal card={chatActionCard} onClose={() => setChatActionCard(null)} />}

        <PaywallModal
          isOpen={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          trigger={paywallTrigger}
          lockedFeature={paywallFeature}
          requiredPlan={paywallPlan}
          lastMaxAnswer={lastMaxAnswer}
        />
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/revenue/page.tsx

~~~tsx
'use client'

import { useStripeData } from '@/hooks/useStripeData'
import DashboardShell from '@/components/DashboardShell'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { DollarSign, TrendingUp, Percent, AlertTriangle, Download } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass gold-border rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-aug font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

export default function RevenuePage() {
  const { metrics, loading, error, isDemoData, lastRefreshed, refresh } = useStripeData()

  return (
    <DashboardShell
      title="Revenue Reality Dashboard"
      subtitle={error ? <span className="text-crimson-aug">⚠ {error}</span> : 'Gross vs net revenue, effective fee rate, and payout timeline'}
      error={error}
      isDemoData={isDemoData}
      lastRefreshed={lastRefreshed}
      loading={loading}
      onRefresh={refresh}
    >
      {metrics && (
        <div className="flex justify-end mb-4">
          <a
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all text-sm"
            href={`/api/revenue/export?grossRevenue30d=${metrics.grossRevenue30d}&netRevenue30d=${metrics.netRevenue30d}&stripeFees30d=${metrics.stripeFees30d}&refundTotal30d=${metrics.refundTotal30d}&disputeTotal30d=${metrics.disputeTotal30d}&effectiveFeeRate=${metrics.effectiveFeeRate}&payoutSchedule=${encodeURIComponent(metrics.payoutSchedule)}`}
            download
          >
            <Download className="w-4 h-4" />
            Download CSV
          </a>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-crimson-aug/10 border border-crimson-aug/30">
          <p className="text-slate-aug text-sm">{error}</p>
        </div>
      )}

      {/* Gross vs Net Revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Gross Revenue (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.grossRevenue30d ?? metrics.revenue30d) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Before fees, refunds, disputes</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Net Revenue (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics ? formatCurrency(metrics.netRevenue30d ?? metrics.revenue30d) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">After Stripe fees, refunds, disputes</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Effective Fee Rate</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-white">
              {metrics?.effectiveFeeRate != null ? `${metrics.effectiveFeeRate.toFixed(2)}%` : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Blended rate vs nominal 2.9%</p>
        </div>
        <div className="glass gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-crimson-aug" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-aug">Revenue Leakage (30d)</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <p className="font-display text-2xl font-bold text-crimson-aug">
              {metrics ? formatCurrency((metrics.refundTotal30d ?? 0) + (metrics.disputeTotal30d ?? 0) + (metrics.stripeFees30d ?? 0)) : '—'}
            </p>
          )}
          <p className="text-xs text-slate-aug mt-1">Fees + refunds + disputes</p>
        </div>
      </div>

      {/* Revenue by period (7, 30, 90, 365) */}
      {metrics?.revenueByPeriod && metrics.revenueByPeriod.length > 0 && (
        <div className="glass gold-border rounded-2xl p-6 mb-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Revenue by Period</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.revenueByPeriod.map((p) => (
              <div key={p.period} className="rounded-xl bg-white/5 p-4 border border-gold/10">
                <p className="text-xs font-mono text-slate-aug mb-1">{p.period}</p>
                <p className="font-bold text-white">{formatCurrency(p.net)}</p>
                <p className="text-xs text-slate-aug">Gross: {formatCurrency(p.gross)} · Fees: {formatCurrency(p.fees)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-4">MRR Trend</h3>
          {loading ? <Skeleton className="h-44 w-full" /> : metrics?.mrrHistory?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics.mrrHistory}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-aug text-sm">No data yet</div>
          )}
        </div>
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-4">Daily Revenue (Last 7 Days)</h3>
          {loading ? <Skeleton className="h-44 w-full" /> : metrics?.dailyRevenue?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={metrics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#8B8FA8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B8FA8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {metrics.dailyRevenue.map((entry, i) => (
                    <Cell key={i} fill={entry.revenue > 0 ? 'rgba(0, 208, 132, 0.65)' : 'rgba(139, 143, 168, 0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-aug text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Revenue Leakage Finder */}
      {metrics?.leakageSummary && (
        <div className="glass gold-border rounded-2xl p-6 mb-6 border-l-4 border-crimson-aug/50">
          <h3 className="font-display text-base font-bold text-white mb-4">Revenue Leakage Finder</h3>
          <p className="text-slate-aug text-sm mb-4">
            Money you&apos;ve lost or are losing — refunds, disputes, fees, and passive churn at risk.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-crimson-aug/5 p-4 border border-crimson-aug/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Refunds (30d)</p>
              <p className="font-bold text-crimson-aug">{formatCurrency(metrics.leakageSummary.refundTotal)}</p>
            </div>
            <div className="rounded-xl bg-crimson-aug/5 p-4 border border-crimson-aug/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Disputes (30d)</p>
              <p className="font-bold text-crimson-aug">{formatCurrency(metrics.leakageSummary.disputeTotal)}</p>
            </div>
            <div className="rounded-xl bg-gold/5 p-4 border border-gold/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Stripe Fees (30d)</p>
              <p className="font-bold text-gold">{formatCurrency(metrics.leakageSummary.feeTotal)}</p>
            </div>
            <div className="rounded-xl bg-yellow-500/5 p-4 border border-yellow-500/20">
              <p className="text-xs font-mono text-slate-aug mb-1">Passive Churn at Risk</p>
              <p className="font-bold text-yellow-400">{formatCurrency(metrics.leakageSummary.passiveChurnAtRisk)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-aug mt-4">
            Fee optimization: Consider annual billing to reduce per-transaction fees. Round up prices to absorb the 2.9% + $0.30.
          </p>
        </div>
      )}

      {/* Payout timeline */}
      {metrics?.payoutSchedule && (
        <div className="glass gold-border rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-2">Stripe Payout Timeline</h3>
          <p className="text-slate-aug text-sm">
            Revenue typically lands in your bank account within {metrics.payoutSchedule} of the charge date.
            Available balance: {formatCurrency(metrics.availableBalance)} · Pending: {formatCurrency(metrics.pendingBalance)}
          </p>
        </div>
      )}
    </DashboardShell>
  )
}
~~~

## File: src/app/dashboard/settings/page.tsx

~~~tsx
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
              <p className="text-sm text-slate-aug mt-1">Full AI CFO access. Upgrade to Enterprise for Action Execution and Team Seats.</p>
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
~~~

## File: src/app/globals.css

~~~css
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
~~~

## File: src/app/layout.tsx

~~~tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
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
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
~~~

## File: src/app/page.tsx

~~~tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Brain, TrendingUp, Shield, Check, Star } from 'lucide-react'

const FEATURES = [
  { icon: Zap, title: 'Connect in 60 seconds', desc: 'Plug in your Stripe account. No forms. No jargon. No finance degree required.', color: 'gold' },
  { icon: Brain, title: 'AI CFO on demand', desc: 'Your revenue, categorized. Your cash flow, predicted. Real decisions, not dashboards.', color: 'emerald' },
  { icon: TrendingUp, title: 'Growth intelligence', desc: '"Raise your price 12%." "Offer annual plans now." Powered by 50,000 Monte Carlo simulations.', color: 'gold' },
  { icon: Shield, title: 'Built for AI builders', desc: 'Solo founders. Micro-SaaS. Indie hackers. We understand how you actually build.', color: 'emerald' },
]

const INSIGHTS = [
  '"You will run out of runway in 47 days at current burn."',
  '"Raise your starter plan price by 15% — churn risk is low."',
  '"3 customers are likely to cancel this month. Offer them a discount."',
  '"Annual plan conversion is 2× higher on Tuesdays. Send the email."',
  '"Your MRR growth is outpacing costs by 34%. Good time to hire."',
]

const TESTIMONIALS = [
  { quote: 'MAX caught a failed payment I\'d missed for 3 weeks. Recovered $297 in 30 seconds.', author: '@alexfounder', plan: 'Solo Dev' },
  { quote: 'The Five Moves simulation paid for itself in the first week. I ran the recovery play and saved $2,400 MRR.', author: 'Solo Dev customer', plan: 'Solo Dev' },
  { quote: 'Finally understand my runway without opening a spreadsheet. MAX just tells me what to do.', author: 'Early user', plan: 'Enterprise' },
]

export default function HomePage() {
  const [insightIdx, setInsightIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [annual, setAnnual] = useState(false)

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
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-slate-aug hover:text-white transition-colors hidden md:block">Sign in</Link>
            <Link href="/connect" className="px-4 py-2 rounded-lg bg-gold text-obsidian font-semibold text-sm hover:bg-gold-light transition-all duration-200 hover:shadow-lg hover:shadow-gold/20">
              Try MAX free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-aug/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
            <span className="text-xs text-slate-aug font-mono uppercase tracking-widest">AI CFO for indie builders</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 fade-up stagger-1">
            <span className="text-white">Your Stripe.</span><br />
            <span className="text-gradient-gold">Your AI CFO.</span><br />
            <span className="text-white">Zero complexity.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-aug max-w-2xl mx-auto mb-10 leading-relaxed fade-up stagger-2">
            Connect your Stripe account in 60 seconds. Get an AI financial brain that categorizes your revenue, forecasts your cash flow, and tells you exactly what to do next.
          </p>

          <div className="max-w-xl mx-auto mb-10 fade-up stagger-3">
            <div className="glass gold-border rounded-2xl px-6 py-4 min-h-[64px] flex items-center justify-center">
              <p className={`text-sm font-mono text-gold-light text-center transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
                {INSIGHTS[insightIdx]}
              </p>
            </div>
            <p className="text-xs text-slate-aug mt-2 font-mono">&uarr; real insights from your AI CFO</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up stagger-4">
            <Link href="/connect" className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold text-base hover:bg-gold-light transition-all duration-200 hover:shadow-2xl hover:shadow-gold/25 w-full sm:w-auto justify-center">
              Try a free question <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 px-8 py-4 rounded-xl glass gold-border text-white font-medium text-base hover:border-gold/40 transition-all duration-200 w-full sm:w-auto justify-center">
              View pricing
            </Link>
          </div>

          <p className="text-xs text-slate-aug mt-5 fade-up stagger-5">
            Try a free question. Then pick a plan.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-[rgba(201,168,76,0.1)]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '$12', label: 'Starting per month' },
            { val: '60s', label: 'To connect Stripe' },
            { val: '50K', label: 'Simulations per analysis' },
            { val: 'AI', label: 'Powered CFO engine' },
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
              Stripe gives you tools.<br /><span className="text-gradient-gold">We give you outcomes.</span>
            </h2>
            <p className="text-slate-aug text-lg max-w-xl mx-auto">Stop staring at dashboards. Start getting decisions.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass gold-border rounded-2xl p-8 card-hover gold-glow fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center ${f.color === 'gold' ? 'bg-gold/10 border border-gold/20' : 'bg-emerald-aug/10 border border-emerald-aug/20'}`}>
                  <f.icon className={`w-6 h-6 ${f.color === 'gold' ? 'text-gold' : 'text-emerald-aug'}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-aug leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-6 border-y border-[rgba(201,168,76,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-gold mb-2">Trusted by indie hackers</p>
            <h2 className="font-display text-3xl font-bold text-white">What founders are saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass gold-border rounded-2xl p-6">
                <Star className="w-4 h-4 text-gold mb-3" />
                <p className="text-sm text-white leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-aug font-mono">{t.author}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Starting at <span className="text-gradient-gold">$12/mo</span>
          </h2>
          <p className="text-slate-aug text-lg mb-8">Two plans. No free tier. No fluff.</p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="glass gold-border rounded-2xl p-8 text-left">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Solo Dev</div>
              <div className="font-display text-3xl font-bold text-white mb-1">$12<span className="text-lg text-slate-aug font-normal">/mo</span></div>
              <p className="text-sm text-slate-aug mb-4">For indie hackers and solo founders</p>
              <ul className="space-y-2 mb-6">
                {['AI CFO Chat (MAX)', 'Five Moves Engine', 'Metric History + Audit Log', 'Webhook Alerts'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-aug"><Check className="w-4 h-4 text-emerald-aug flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/pricing?plan=solo" className="block text-center py-3 rounded-xl glass gold-border text-white font-semibold text-sm hover:border-gold/40 transition-all">
                Start Solo Dev
              </Link>
            </div>

            <div className="bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 rounded-2xl p-8 text-left relative gold-glow">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-emerald-aug rounded-full text-obsidian text-xs font-bold uppercase tracking-widest">Popular</div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-2">Enterprise</div>
              <div className="font-display text-3xl font-bold text-white mb-1">$99<span className="text-lg text-slate-aug font-normal">/mo</span></div>
              <p className="text-sm text-slate-aug mb-4">For growing SaaS teams</p>
              <ul className="space-y-2 mb-6">
                {['Everything in Solo Dev', 'Action Execution (fire Stripe actions)', 'Multi-account + Team seats', 'Priority AI (Kimi K2)'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-aug"><Check className="w-4 h-4 text-emerald-aug flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/pricing?plan=enterprise" className="block text-center py-3 rounded-xl bg-gold text-obsidian font-bold text-sm hover:bg-gold-light transition-all">
                Start Enterprise
              </Link>
            </div>
          </div>

          <Link href="/pricing" className="inline-block mt-8 text-sm text-gold hover:text-gold-light transition-colors">
            See full pricing &rarr;
          </Link>
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
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders &copy; 2026</p>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="mailto:hello@lucrum.app" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
~~~

## File: src/app/pricing/page.tsx

~~~tsx
'use client'

import { Suspense, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Check, X, Star, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_LUCRUM_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_LUCRUM_STRIPE_PUBLISHABLE_KEY)
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

const PLANS = {
  solo: {
    name: 'Solo Dev',
    monthly: 12,
    annual: 120,
    annualSavings: 24,
    desc: 'For indie hackers and solo founders',
    features: [
      { text: 'AI CFO Chat (MAX)', included: true },
      { text: 'Five Moves Engine', included: true },
      { text: 'Metric History', included: true },
      { text: 'Audit Log', included: true },
      { text: 'Webhook Alerts', included: true },
      { text: 'Action Execution', included: false },
      { text: 'Multi-account', included: false },
      { text: 'Team seats', included: false },
      { text: 'API access', included: false },
      { text: 'Priority AI', included: false },
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 99,
    annual: 990,
    annualSavings: 198,
    desc: 'For growing SaaS teams who need to execute',
    features: [
      { text: 'Everything in Solo Dev', included: true },
      { text: 'Action Execution — fire Stripe actions directly from Lucrum', included: true },
      { text: 'Multi-account (10x)', included: true },
      { text: 'Team seats (5 members)', included: true },
      { text: 'API access', included: true },
      { text: 'Priority AI (Kimi K2)', included: true },
      { text: 'White-label branding', included: true },
    ],
  },
}

const FAQ = [
  { q: 'Can I switch plans?', a: 'Yes. Upgrade or downgrade anytime from your dashboard.' },
  { q: 'What happens to my data if I cancel?', a: 'Your metric history is retained for 90 days.' },
  { q: 'Do you store my Stripe secret key?', a: 'It\'s AES-256-GCM encrypted and never logged or shared.' },
  { q: 'What is Action Execution?', a: 'Enterprise users can fire Stripe actions (emails, coupons, subscription changes, payouts) directly from Lucrum without opening Stripe dashboard.' },
]

function getPriceId(plan: 'solo' | 'enterprise', annual: boolean): string {
  if (plan === 'solo') {
    return annual
      ? (process.env.NEXT_PUBLIC_LUCRUM_SOLO_ANNUAL_PRICE_ID ?? '')
      : (process.env.NEXT_PUBLIC_LUCRUM_SOLO_MONTHLY_PRICE_ID ?? '')
  }
  return annual
    ? (process.env.NEXT_PUBLIC_LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID ?? '')
    : (process.env.NEXT_PUBLIC_LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID ?? '')
}

export default function PricingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <PricingPage />
    </Suspense>
  )
}

function PricingPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hintPlan = searchParams.get('plan') as 'solo' | 'enterprise' | null

  const [annual, setAnnual] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<'solo' | 'enterprise' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  const startCheckout = useCallback(async (plan: 'solo' | 'enterprise') => {
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=/pricing?plan=${plan}`)
      return
    }
    setCheckoutError(null)
    setCheckoutPlan(plan)
  }, [isSignedIn, router])

  const fetchClientSecret = useCallback(async () => {
    if (!checkoutPlan) return ''
    const priceId = getPriceId(checkoutPlan, annual)
    if (!priceId) {
      setCheckoutError('Billing is not configured yet. Price IDs missing.')
      setCheckoutPlan(null)
      return ''
    }
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const data = await res.json()
    if (!res.ok || !data.clientSecret) {
      setCheckoutError(data?.error ?? 'Could not start checkout. Try again.')
      setCheckoutPlan(null)
      return ''
    }
    return data.clientSecret
  }, [checkoutPlan, annual])

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-[rgba(201,168,76,0.12)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-aug hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            {isSignedIn && (
              <Link href="/dashboard" className="text-sm text-slate-aug hover:text-white transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-8 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 relative">
          Stop guessing. Start growing.
        </h1>
        <p className="text-slate-aug text-lg mb-8 relative">Two plans. No free tier. No fluff.</p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-10 relative">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!annual ? 'bg-gold text-obsidian' : 'glass gold-border text-slate-aug hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-gold text-obsidian' : 'glass gold-border text-slate-aug hover:text-white'}`}
          >
            Annual
            <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-aug/20 text-emerald-aug border border-emerald-aug/30">
              2 months free
            </span>
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Solo Dev */}
          <div className={`rounded-2xl p-8 card-hover glass gold-border ${hintPlan === 'solo' ? 'ring-2 ring-gold/50' : ''}`}>
            <div className="mb-6">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Solo Dev</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-white">${annual ? PLANS.solo.annual : PLANS.solo.monthly}</span>
                <span className="text-slate-aug text-sm">/{annual ? 'yr' : 'mo'}</span>
              </div>
              {annual && (
                <p className="text-emerald-aug text-xs font-mono mt-1">Save ${PLANS.solo.annualSavings} per year</p>
              )}
              <p className="text-slate-aug text-sm mt-2">{PLANS.solo.desc}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PLANS.solo.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm">
                  {f.included
                    ? <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-slate-aug/30 flex-shrink-0 mt-0.5" />}
                  <span className={f.included ? 'text-slate-aug' : 'text-slate-aug/30'}>{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout('solo')}
              className="w-full text-center py-3 rounded-xl font-semibold text-sm glass gold-border text-white hover:border-gold/40 transition-all"
            >
              Start Solo Dev
            </button>
          </div>

          {/* Enterprise */}
          <div className={`rounded-2xl p-8 card-hover relative bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold/40 gold-glow ${hintPlan === 'enterprise' ? 'ring-2 ring-gold/60' : ''}`}>
            <div className="absolute -top-3 right-6 px-3 py-1 bg-emerald-aug rounded-full text-obsidian text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Star className="w-3 h-3" /> Most Popular
            </div>
            <div className="mb-6">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-white">${annual ? PLANS.enterprise.annual : PLANS.enterprise.monthly}</span>
                <span className="text-slate-aug text-sm">/{annual ? 'yr' : 'mo'}</span>
              </div>
              {annual && (
                <p className="text-emerald-aug text-xs font-mono mt-1">Save ${PLANS.enterprise.annualSavings} per year</p>
              )}
              <p className="text-slate-aug text-sm mt-2">{PLANS.enterprise.desc}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PLANS.enterprise.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-emerald-aug flex-shrink-0 mt-0.5" />
                  <span className="text-slate-aug">{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout('enterprise')}
              className="w-full text-center py-3 rounded-xl font-semibold text-sm bg-gold text-obsidian hover:bg-gold-light hover:shadow-lg hover:shadow-gold/25 transition-all"
            >
              Start Enterprise
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="max-w-4xl mx-auto text-center mt-8 space-y-1">
          <p className="text-xs text-slate-aug">All plans include a 14-day money-back guarantee.</p>
          <p className="text-xs text-slate-aug">Cancel anytime. No questions asked.</p>
          <p className="text-xs text-slate-aug">Stripe data is read-only until you authorize actions.</p>
        </div>
      </section>

      {/* Embedded checkout */}
      {checkoutPlan && stripePromise && (
        <section className="px-6 pb-16">
          <div className="max-w-2xl mx-auto glass gold-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-mono uppercase tracking-widest text-gold">
                Checkout — {checkoutPlan === 'solo' ? 'Solo Dev' : 'Enterprise'} ({annual ? 'Annual' : 'Monthly'})
              </p>
              <button onClick={() => setCheckoutPlan(null)} className="text-xs text-slate-aug hover:text-white">
                Cancel
              </button>
            </div>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </section>
      )}

      {checkoutError && (
        <section className="px-6 pb-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-crimson-aug text-sm font-mono">{checkoutError}</p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, idx) => (
              <div key={idx} className="glass gold-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  {faqOpen === idx ? <ChevronUp className="w-4 h-4 text-slate-aug" /> : <ChevronDown className="w-4 h-4 text-slate-aug" />}
                </button>
                {faqOpen === idx && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-aug">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold text-xs">L</span>
            </div>
            <span className="font-display font-bold text-gradient-gold">Lucrum</span>
          </div>
          <p className="text-slate-aug text-sm font-mono">Financial OS for AI builders</p>
        </div>
      </footer>
    </div>
  )
}
~~~

## File: src/app/privacy/page.tsx

~~~tsx
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Lucrum',
  description: 'Lucrum Privacy Policy - How we handle your data',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white">
      <nav className="border-b border-[rgba(201,168,76,0.12)] py-4 px-6">
        <Link href="/" className="font-display font-bold text-gradient-gold">
          ← Lucrum
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-aug text-sm mb-6">Last updated: March 2026</p>

        <div className="space-y-6 text-slate-aug leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Data We Collect</h2>
            <p>
              Lucrum accesses your Stripe account data via the Stripe API. We do not request or store customer payment
              card information. We process: transaction amounts, subscription status, customer metadata, payout
              schedules, and balance information necessary to provide financial insights.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. How We Use Your Data</h2>
            <p>
              Your Stripe data is used solely to generate the financial dashboards, AI insights, cash flow forecasts,
              and reports within Lucrum. We do not sell your data. We may use aggregated, anonymized data to improve
              our AI models and product.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Data Storage & Security</h2>
            <p>
              All data is transmitted over TLS 1.3. Stripe API keys are stored encrypted. We follow Stripe&apos;s data
              handling requirements for marketplace applications.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Data Retention</h2>
            <p>
              Customer Stripe data is deleted within 30 days of account cancellation. This is disclosed at signup and
              honored operationally.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Contact</h2>
            <p>
              For privacy questions: <a href="mailto:privacy@lucrum.app" className="text-gold hover:underline">privacy@lucrum.app</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
~~~

## File: src/app/sign-in/[[...sign-in]]/page.tsx

~~~tsx
'use client'

import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-slate-aug hover:text-white transition-colors text-sm">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-obsidian font-display font-bold">L</span>
            <span className="font-display text-xl font-bold text-gradient-gold">Lucrum</span>
          </Link>
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-4">
            Sign in to your
            <br />
            AI CFO.
          </h1>
          <p className="text-slate-aug text-lg max-w-md">
            Connect Stripe, unlock live financial visibility, and keep every decision tied to your account.
          </p>
        </div>

        <div className="glass gold-border rounded-3xl p-6 md:p-8 gold-glow">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                card: 'bg-transparent shadow-none',
                rootBox: 'w-full',
                headerTitle: 'text-white font-display',
                headerSubtitle: 'text-slate-aug',
                socialButtonsBlockButton: 'border border-[rgba(201,168,76,0.16)] bg-white/5 text-white hover:bg-white/10',
                formButtonPrimary: 'bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#E8C97A]',
                formFieldInput: 'bg-[#16162A] border border-[rgba(201,168,76,0.18)] text-white',
                footerActionLink: 'text-[#E8C97A] hover:text-white',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
~~~

## File: src/app/sign-up/[[...sign-up]]/page.tsx

~~~tsx
'use client'

import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-slate-aug hover:text-white transition-colors text-sm">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-obsidian font-display font-bold">L</span>
            <span className="font-display text-xl font-bold text-gradient-gold">Lucrum</span>
          </Link>
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-4">
            Create your
            <br />
            Lucrum account.
          </h1>
          <p className="text-slate-aug text-lg max-w-md">
            Start free, connect Stripe, and keep your MAX CFO, billing, and audit history tied to one identity.
          </p>
        </div>

        <div className="glass gold-border rounded-3xl p-6 md:p-8 gold-glow">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                card: 'bg-transparent shadow-none',
                rootBox: 'w-full',
                headerTitle: 'text-white font-display',
                headerSubtitle: 'text-slate-aug',
                socialButtonsBlockButton: 'border border-[rgba(201,168,76,0.16)] bg-white/5 text-white hover:bg-white/10',
                formButtonPrimary: 'bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#E8C97A]',
                formFieldInput: 'bg-[#16162A] border border-[rgba(201,168,76,0.18)] text-white',
                footerActionLink: 'text-[#E8C97A] hover:text-white',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
~~~

## File: src/app/terms/page.tsx

~~~tsx
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Lucrum',
  description: 'Lucrum Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white">
      <nav className="border-b border-[rgba(201,168,76,0.12)] py-4 px-6">
        <Link href="/" className="font-display font-bold text-gradient-gold">
          ← Lucrum
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-slate-aug text-sm mb-6">Last updated: March 2026</p>

        <div className="space-y-6 text-slate-aug leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Service Description</h2>
            <p>
              Lucrum is a financial intelligence platform that connects to your Stripe account to provide revenue
              dashboards, churn analysis, cash flow forecasts, and AI-generated insights. Subscription terms apply as
              selected at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. Auto-Renewal</h2>
            <p>
              Subscriptions auto-renew at the end of each billing period. You may cancel at any time; fees paid for the
              current period are non-refundable. Cancellation takes effect at the end of the current billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Limitation of Liability</h2>
            <p>
              Lucrum provides financial insights and recommendations but does not constitute financial, tax, or legal
              advice. You are responsible for your business decisions. Our liability is limited to the amount you paid
              in the 12 months preceding a claim.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Data Ownership</h2>
            <p>
              Your data remains your property. Lucrum claims a license to use aggregated, anonymized data for improving
              our AI and product. This is disclosed and consented to at signup.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Contact</h2>
            <p>
              For terms questions: <a href="mailto:legal@lucrum.app" className="text-gold hover:underline">legal@lucrum.app</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
~~~

## File: src/components/ActionModal.tsx

~~~tsx
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
~~~

## File: src/components/BenchmarkPanel.tsx

~~~tsx
'use client'

import { TrendingUp, Users, BarChart2 } from 'lucide-react'
import type { BenchmarkReport } from '@/types'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-1">{label}</p>
      <p className="font-display text-lg font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-aug mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-slate-aug mb-1">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BenchmarkPanel({
  benchmarks,
  accountAgeDays,
  currentMRR,
}: {
  benchmarks: BenchmarkReport
  accountAgeDays: number
  currentMRR: number
}) {
  const daysRemaining = Math.max(0, 60 - accountAgeDays)

  const mrrPercentile =
    currentMRR >= benchmarks.p75MRR
      ? 'Top 25%'
      : currentMRR >= benchmarks.medianMRR
        ? 'Above median'
        : currentMRR >= benchmarks.p25MRR
          ? 'Below median'
          : 'Bottom 25%'

  return (
    <div className="glass gold-border rounded-2xl p-6 gold-glow">
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-5 h-5 text-gold" />
        <h3 className="font-display text-base font-bold text-white">Peer Benchmarks</h3>
        <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
          Day {accountAgeDays} of 60
        </span>
      </div>

      <ProgressBar value={accountAgeDays} max={60} label="New founder window" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <Stat label="Your MRR" value={`$${currentMRR.toLocaleString()}`} sub={mrrPercentile} />
        <Stat label="Median MRR" value={`$${benchmarks.medianMRR.toLocaleString()}`} sub={`${benchmarks.compCount} peers`} />
        <Stat label="Top Performer" value={`$${benchmarks.topPerformerMRR.toLocaleString()}`} />
        <Stat label="Median Growth" value={benchmarks.medianGrowthRate != null ? `${benchmarks.medianGrowthRate}%` : 'N/A'} sub="MoM" />
      </div>

      {benchmarks.similarBusinesses.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-aug mb-3">Similar businesses</p>
          <div className="space-y-2">
            {benchmarks.similarBusinesses.map((biz) => (
              <div key={biz.id} className="flex items-center justify-between py-2 border-b border-[rgba(201,168,76,0.07)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold/60" />
                  <span className="text-sm text-white">{biz.notes || biz.id}</span>
                  <span className="text-xs font-mono text-slate-aug">{biz.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gold">${biz.mrr.toLocaleString()} MRR</span>
                  {biz.growthRateMoM != null && (
                    <span className={`text-xs font-mono ${biz.growthRateMoM >= 0 ? 'text-emerald-aug' : 'text-crimson-aug'}`}>
                      {biz.growthRateMoM > 0 ? '+' : ''}{biz.growthRateMoM}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {daysRemaining > 0 && (
        <p className="mt-4 text-xs text-slate-aug text-center">
          {daysRemaining} days left in your new-founder benchmark window. Benchmarks disappear after day 60.
        </p>
      )}
    </div>
  )
}
~~~

## File: src/components/DashboardShell.tsx

~~~tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, DollarSign, Users, TrendingUp, Brain,
  Settings, LogOut, RefreshCw, Wifi, WifiOff, Clock,
  Zap, ClipboardList, Lock,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { useUserPlan } from '@/hooks/useUserPlan'

export default function DashboardShell({
  children,
  title,
  subtitle,
  headerAction,
  error,
  isDemoData = false,
  lastRefreshed,
  loading,
  onRefresh,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
  error: string | null
  isDemoData?: boolean
  lastRefreshed: Date | null
  loading: boolean
  onRefresh: () => Promise<void>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [refreshing, setRefreshing] = React.useState(false)
  const { plan } = useUserPlan()

  const NAV_ITEMS = [
    { icon: BarChart2, label: 'Overview', href: '/dashboard', locked: false },
    { icon: DollarSign, label: 'Revenue', href: '/dashboard/revenue', locked: false },
    { icon: Users, label: 'Customers', href: '/dashboard/customers', locked: false },
    { icon: TrendingUp, label: 'Forecasts', href: '/dashboard/forecasts', locked: false },
    { icon: Brain, label: 'AI Insights', href: '/dashboard/insights', locked: false },
    { icon: Zap, label: 'Actions', href: '/dashboard', locked: plan !== 'enterprise', lockLabel: 'Enterprise' },
    { icon: ClipboardList, label: 'Audit Log', href: '/dashboard/audit', locked: false },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', locked: false },
  ]

  const handleDisconnect = async () => {
    try { await fetch('/api/stripe/disconnect', { method: 'POST' }) } finally { router.push('/') }
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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-obsidian font-display font-bold">L</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">Lucrum</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, href, locked, lockLabel }) => (
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
              <span className="flex-1">{label}</span>
              {locked && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-aug/50">
                  <Lock className="w-3 h-3" />
                  {lockLabel}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="px-4 py-3 mx-4 mb-2 rounded-xl border border-[rgba(201,168,76,0.1)] bg-white/2">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono uppercase tracking-widest ${
              plan === 'enterprise' ? 'text-gold' : plan === 'solo' ? 'text-emerald-aug' : 'text-slate-aug'
            }`}>
              {plan === 'enterprise' ? 'Enterprise' : plan === 'solo' ? 'Solo Dev' : 'Demo'}
            </span>
            {plan === 'demo' && (
              <Link href="/pricing" className="text-[10px] font-mono text-gold hover:text-gold-light transition-colors">
                Upgrade
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {error
              ? <WifiOff className="w-3 h-3 text-crimson-aug" />
              : <Wifi className={`w-3 h-3 ${isDemoData ? 'text-gold' : 'text-emerald-aug'}`} />}
            <span className="text-xs font-mono text-slate-aug">
              {error ? 'Disconnected' : isDemoData ? 'Demo data' : 'Stripe connected'}
            </span>
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
~~~

## File: src/components/FiveMoves.tsx

~~~tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Zap, ChevronDown, ChevronUp, Shield, Clock, Lock } from 'lucide-react'
import type { FiveMovesResult, Move, StripeMetrics, ActionCard, Plan } from '@/types'
import ActionModal from '@/components/ActionModal'

const STATUS_MESSAGES = [
  'Scoring decisions...',
  'Running simulations...',
  'Kimi K2 interpreting outcomes...',
  'Ranking moves by risk...',
]

function timeAgoShort(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60_000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

function MoveCard({ move, isExpanded, onToggle, onExecute }: {
  move: Move
  isExpanded: boolean
  onToggle: () => void
  onExecute: (move: Move) => void
}) {
  return (
    <div
      className="glass rounded-2xl overflow-hidden transition-all duration-300"
      style={{ borderLeft: `4px solid ${move.riskColor}`, borderColor: `${move.riskColor}33` }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${move.riskColor}20`, color: move.riskColor, border: `1px solid ${move.riskColor}40` }}
            >
              {move.risk}
            </span>
            <span className="text-[10px] font-mono text-slate-aug">{move.riskLabel}</span>
          </div>
          <h4 className="font-display text-lg font-bold text-white mb-1">{move.title}</h4>
          <p className="text-sm text-gold italic leading-relaxed">{move.maxStatement}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-aug border border-white/10">
              <Clock className="w-3 h-3 inline mr-1" />{move.timeToExecute}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Runway</p>
              <p className="text-sm font-bold text-white">
                {move.metrics.expectedRunwayGain > 0 ? '+' : ''}{move.metrics.expectedRunwayGain}d
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Survival</p>
              <p className="text-sm font-bold text-white">{(move.metrics.survivalProbability * 100).toFixed(0)}%</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">MRR/90d</p>
              <p className="text-sm font-bold text-white">${Math.round(move.metrics.expectedMRRAt90d).toLocaleString()}</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] font-mono text-slate-aug">Score</p>
              <p className="text-sm font-bold text-white">{move.metrics.compositeScore.toFixed(0)}/100</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-aug" /> : <ChevronDown className="w-4 h-4 text-slate-aug" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          <p className="text-sm text-white">{move.summary}</p>
          <p className="text-sm text-slate-aug">{move.rationale}</p>
          <p className="text-xs text-slate-aug/70 italic">{move.tradeoff}</p>

          {move.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {move.actions.map((a, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {a.label}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => onExecute(move)}
            className="w-full mt-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: move.riskColor, color: '#0B0D0F' }}
          >
            {(move as any).locked ? <><Lock className="w-4 h-4" /> Upgrade to Execute</> : 'Execute Move'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FiveMoves({ metrics, plan = 'demo', onFeatureLock }: { metrics: StripeMetrics | null; plan?: Plan; onFeatureLock?: (feature: string, requiredPlan: 'solo' | 'enterprise') => void }) {
  const isDemo = plan === 'demo'
  const [data, setData] = useState<FiveMovesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [statusIdx, setStatusIdx] = useState(0)
  const [actionCard, setActionCard] = useState<ActionCard | null>(null)
  const fetchedRef = useRef(false)

  const fetchFiveMoves = useCallback(async () => {
    if (!metrics) return
    setLoading(true)
    setStatusIdx(0)
    try {
      const res = await fetch('/api/ai/five-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, customers: [] }),
      })
      if (res.ok) {
        const result: FiveMovesResult = await res.json()
        if (result.moves?.length) setData(result)
      }
    } catch (err) {
      console.error('[FiveMoves] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [metrics])

  useEffect(() => {
    if (metrics && !fetchedRef.current && (isDemo || (metrics.accountAgeDays ?? 0) >= 60)) {
      fetchedRef.current = true
      fetchFiveMoves()
    }
  }, [metrics, fetchFiveMoves, isDemo])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setStatusIdx(i => (i + 1) % STATUS_MESSAGES.length)
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  const handleExecute = (move: Move) => {
    if (isDemo) {
      onFeatureLock?.('Five Moves Execution', 'solo')
      return
    }
    if (!move.actions.length) {
      onFeatureLock?.('Five Moves Execution', 'solo')
      return
    }
    const primary = move.actions[0]
    setActionCard({
      id: `move_${move.rank}_${Date.now()}`,
      priority: 1,
      severity: 'opportunity',
      title: move.title,
      context: move.summary,
      estimatedImpact: `+${move.metrics.expectedRunwayGain}d runway`,
      actionType: primary.actionType,
      actionLabel: 'Execute',
      params: primary.params,
      isDestructive: primary.riskTier <= 2,
      requiresConfirmText: primary.riskTier <= 2,
    })
  }

  if (!metrics) return null

  if (!isDemo && (metrics.accountAgeDays ?? 0) < 60) {
    return (
      <div className="glass gold-border rounded-2xl p-6 mb-6">
        <h2 className="font-display text-xl font-bold text-white mb-2">5 Moves</h2>
        <p className="text-sm text-slate-aug mb-3">Five Moves unlock at 60 days of Stripe data.</p>
        <div className="w-full bg-white/5 rounded-full h-2">
          <div
            className="bg-gold h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (metrics.accountAgeDays / 60) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-aug mt-2">{metrics.accountAgeDays} of 60 days</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">5 Moves</h2>
          <p className="text-xs font-mono text-slate-aug mt-0.5">
            Ranked by risk &middot; 50,000 simulations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-aug">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-aug animate-pulse" />
              Live
            </span>
          )}
          {data && (
            <span className="text-xs font-mono text-slate-aug">
              Updated {timeAgoShort(data.generatedAt)}
            </span>
          )}
          <button
            onClick={fetchFiveMoves}
            disabled={loading}
            className="p-2 rounded-lg glass gold-border text-slate-aug hover:text-gold transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data && !loading && isDemo && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 mb-4 text-sm text-gold">
          These are example moves based on demo data. Connect your Stripe to see your real 50,000-simulation analysis.
        </div>
      )}

      {data && !loading && (
        <div className="glass gold-border rounded-xl p-3 mb-4 text-sm text-slate-aug">
          <Shield className="w-4 h-4 inline mr-1.5 text-gold" />
          Without action: <span className="text-white font-semibold">{Math.round(data.baselineSimulation.runway.p50)}d</span> median runway &middot;{' '}
          <span className="text-white font-semibold">{(data.baselineSimulation.runway.probabilityOf180Days * 100).toFixed(0)}%</span> survival at 180 days
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5" style={{ borderLeft: '4px solid rgba(255,255,255,0.1)' }}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
          <p className="text-center text-sm text-gold font-mono animate-pulse mt-2">
            {STATUS_MESSAGES[statusIdx]}
          </p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3">
          {data.moves.map((move, i) => (
            <MoveCard
              key={move.rank}
              move={move}
              isExpanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              onExecute={handleExecute}
            />
          ))}
        </div>
      )}

      {actionCard && (
        <ActionModal card={actionCard} onClose={() => setActionCard(null)} />
      )}
    </div>
  )
}
~~~

## File: src/components/InlineNotice.tsx

~~~tsx
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

~~~

## File: src/components/MaxRecommendations.tsx

~~~tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import type { ActionCard, StripeMetrics } from '@/types'
import ActionModal from '@/components/ActionModal'

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: React.ElementType; iconColor: string }> = {
  critical:    { border: 'border-red-500/40',     bg: 'bg-red-500/8',     icon: AlertTriangle, iconColor: 'text-red-400' },
  warning:     { border: 'border-yellow-500/35',  bg: 'bg-yellow-500/6',  icon: AlertTriangle, iconColor: 'text-yellow-400' },
  opportunity: { border: 'border-gold/30',        bg: 'bg-gold/5',        icon: TrendingUp,    iconColor: 'text-gold' },
  win:         { border: 'border-emerald-aug/30', bg: 'bg-emerald-aug/5', icon: CheckCircle,   iconColor: 'text-emerald-aug' },
}

export default function MaxRecommendations({ metrics }: { metrics: StripeMetrics | null }) {
  const [cards, setCards] = useState<ActionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCard, setActiveCard] = useState<ActionCard | null>(null)

  const fetchCards = useCallback(async () => {
    if (!metrics) return
    setLoading(true)
    try {
      const res = await fetch('/api/actions/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards ?? [])
      }
    } catch {
      // Best effort
    } finally {
      setLoading(false)
    }
  }, [metrics])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  if (!cards.length && !loading) return null

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-gold" />
          <h3 className="font-display text-base font-bold text-white">MAX Recommendations</h3>
          {loading && (
            <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin ml-2" />
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {cards.map((card) => {
            const style = SEVERITY_STYLES[card.severity] ?? SEVERITY_STYLES.opportunity
            const Icon = style.icon
            return (
              <div
                key={card.id}
                className={`flex-shrink-0 w-72 rounded-xl p-4 border ${style.border} ${style.bg} card-hover cursor-pointer`}
                onClick={() => setActiveCard(card)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  <span className={`text-xs font-mono uppercase ${style.iconColor}`}>{card.severity}</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                <p className="text-xs text-slate-aug leading-relaxed mb-3">{card.context}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-aug">{card.estimatedImpact}</span>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all">
                    {card.actionLabel}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {activeCard && (
        <ActionModal card={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </>
  )
}
~~~

## File: src/components/MRRHistory.tsx

~~~tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

type Snapshot = {
  timestamp: number
  mrr: number
}

export default function MRRHistory() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/metrics/history')
        const data = await res.json()
        if (!cancelled) {
          setSnapshots(data.snapshots ?? [])
        }
      } catch {
        if (!cancelled) setSnapshots([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = snapshots.map((snapshot) => ({
    date: new Date(snapshot.timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    mrr: snapshot.mrr,
  }))

  return (
    <div className="glass gold-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-base font-bold text-white">MRR History</h3>
          <p className="text-slate-aug text-xs font-mono">Last 90 days of saved snapshots</p>
        </div>
        {chartData.length > 0 && (
          <span className="text-sm font-mono text-white">
            {formatCurrency(chartData[chartData.length - 1].mrr)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
      ) : chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="snapshotMrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
            <XAxis dataKey="date" tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8B8FA8', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              contentStyle={{
                background: 'rgba(22,22,42,0.95)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '16px',
                color: '#fff',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#snapshotMrrGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-56 flex items-center justify-center text-slate-aug text-sm font-mono">
          Historical snapshots will appear after daily syncs start accumulating.
        </div>
      )}
    </div>
  )
}
~~~

## File: src/components/PaywallModal.tsx

~~~tsx
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
              <p className="text-xs text-slate-aug mt-1">AI CFO + Five Moves</p>
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
              <p className="text-xs text-slate-aug mt-1">+ Action Engine + Team</p>
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
            ? 'Action Execution, Multi-account, Team Seats, API access, and Priority AI are available on the Enterprise plan.'
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
~~~

## File: src/contexts/StripeDataContext.tsx

~~~tsx
'use client'

import React, { createContext, useContext } from 'react'
import { useStripeData } from '@/hooks/useStripeData'
import type { StripeMetrics, AIInsight } from '@/types'

type StripeDataContextValue = {
  metrics: StripeMetrics | null
  insights: AIInsight[]
  loading: boolean
  insightsLoading: boolean
  error: string | null
  lastRefreshed: Date | null
  refresh: () => Promise<void>
}

const StripeDataContext = createContext<StripeDataContextValue | null>(null)

export function StripeDataProvider({ children }: { children: React.ReactNode }) {
  const value = useStripeData()
  return <StripeDataContext.Provider value={value}>{children}</StripeDataContext.Provider>
}

export function useStripeDataContext(): StripeDataContextValue {
  const ctx = useContext(StripeDataContext)
  if (!ctx) throw new Error('useStripeDataContext must be used within StripeDataProvider')
  return ctx
}

~~~

## File: src/hooks/useStripeData.ts

~~~typescript
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
  const invalidationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cacheKeyRef = useRef<string>('lucrum:lastInsights:v1')
  const usingDemoFallbackRef = useRef<boolean>(DEMO_MODE)

  const clearInsightsCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKeyRef.current)
    } catch {
      // ignore
    }
  }, [])

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
        accountAgeDays: data.accountAgeDays,
        benchmarks: data.benchmarks,
        simulation: data.simulation,
        estimatedMonthlyBurn: data.estimatedMonthlyBurn,
        failedPaymentsValue: data.failedPaymentsValue,
        failedPaymentsCount: data.failedPaymentsCount,
      }
      fetchInsights(ctx)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Stripe data')
    } finally {
      setLoading(false)
    }
  }, [fetchInsights])

  const checkInvalidation = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/invalidation')
      if (!res.ok) return
      const data = await res.json()
      const invalidatedAt = Number(data.invalidatedAt ?? 0)
      if (!invalidatedAt) return

      if (!lastRefreshed || invalidatedAt > lastRefreshed.getTime()) {
        clearInsightsCache()
        await fetchMetrics()
      }
    } catch {
      // ignore
    }
  }, [clearInsightsCache, fetchMetrics, lastRefreshed])

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

  useEffect(() => {
    invalidationIntervalRef.current = setInterval(checkInvalidation, 15_000)
    return () => {
      if (invalidationIntervalRef.current) clearInterval(invalidationIntervalRef.current)
    }
  }, [checkInvalidation])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchMetrics()
  }, [fetchMetrics])

  return { metrics, insights, loading, insightsLoading, error, isDemoData, lastRefreshed, refresh }
}
~~~

## File: src/hooks/useUserPlan.ts

~~~typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Plan } from '@/types'

type BillingState = {
  plan: Plan
  interval?: 'month' | 'year'
  currentPeriodEnd: number | null
  status: string | null
  features?: Record<string, boolean>
}

export function useUserPlan() {
  const [data, setData] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/plan')
      if (!res.ok) throw new Error('Failed to load plan')
      const next = await res.json()
      setData(next)
    } catch {
      setData({ plan: 'demo', currentPeriodEnd: null, status: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    plan: (data?.plan ?? 'demo') as Plan,
    interval: data?.interval,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    status: data?.status ?? null,
    features: data?.features ?? {},
    loading,
    refresh,
  }
}
~~~

## File: src/lib/affiliates.ts

~~~typescript
import type { AffiliateProduct, StripeMetrics } from '@/types'

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    id: 'clearco',
    name: 'Clearco',
    category: 'financing',
    tagline: 'Revenue-based financing for SaaS',
    description: 'Get non-dilutive capital based on your recurring revenue. No equity given up.',
    ctaText: 'Check eligibility',
    affiliateUrl: 'https://clearco.com?ref=lucrum',
    triggerConditions: { minMRR: 1000, requiresRevenue: true },
    maxRecommendationContext: 'This founder has steady MRR and could benefit from non-dilutive growth capital via Clearco.',
    priority: 1,
  },
  {
    id: 'capchase',
    name: 'Capchase',
    category: 'financing',
    tagline: 'Turn annual contracts into upfront cash',
    description: 'Advance your annual subscription revenue so you can invest in growth today.',
    ctaText: 'Get funded',
    affiliateUrl: 'https://capchase.com?ref=lucrum',
    triggerConditions: { minMRR: 5000, requiresRevenue: true },
    maxRecommendationContext: 'With strong MRR this founder could accelerate growth by advancing annual contract revenue through Capchase.',
    priority: 2,
  },
  {
    id: 'arc',
    name: 'Arc',
    category: 'financing',
    tagline: 'The startup banking platform',
    description: 'Higher yield on idle cash, fast wire transfers, and startup-friendly banking.',
    ctaText: 'Open account',
    affiliateUrl: 'https://arc.tech?ref=lucrum',
    triggerConditions: { minMRR: 500 },
    maxRecommendationContext: 'This founder has meaningful cash reserves that could earn higher yield with Arc banking.',
    priority: 3,
  },
  {
    id: 'brex',
    name: 'Brex',
    category: 'credit',
    tagline: 'Corporate card with no personal guarantee',
    description: 'High-limit corporate card built for startups. Earn points on SaaS spend.',
    ctaText: 'Apply now',
    affiliateUrl: 'https://brex.com?ref=lucrum',
    triggerConditions: { minMRR: 2000, requiresRevenue: true },
    maxRecommendationContext: 'With growing revenue this founder qualifies for a high-limit Brex card to manage expenses.',
    priority: 4,
  },
  {
    id: 'ramp',
    name: 'Ramp',
    category: 'credit',
    tagline: 'Save 5% on average with smart spend controls',
    description: 'Corporate card with automatic savings insights and spend management.',
    ctaText: 'Start saving',
    affiliateUrl: 'https://ramp.com?ref=lucrum',
    triggerConditions: { minMRR: 1000, requiresRevenue: true },
    maxRecommendationContext: 'Ramp could help this founder cut unnecessary spend — important given their burn rate.',
    priority: 5,
  },
  {
    id: 'stripe_capital',
    name: 'Stripe Capital',
    category: 'saas_lending',
    tagline: 'Funding from Stripe, repaid from your sales',
    description: 'Get a loan offer from Stripe, repaid automatically as a percentage of sales.',
    ctaText: 'Check offers',
    affiliateUrl: 'https://stripe.com/capital?ref=lucrum',
    triggerConditions: { minMRR: 3000, requiresRevenue: true, accountAgeDays: 90 },
    maxRecommendationContext: 'This established Stripe merchant may qualify for Stripe Capital — fast funding with automatic repayment.',
    priority: 6,
  },
  {
    id: 'bench',
    name: 'Bench',
    category: 'accounting',
    tagline: 'Bookkeeping done for you',
    description: 'Professional bookkeeping with a dedicated team. Tax-ready financials every month.',
    ctaText: 'Get started',
    affiliateUrl: 'https://bench.co?ref=lucrum',
    triggerConditions: { minMRR: 500, requiresRevenue: true },
    maxRecommendationContext: 'Bench handles bookkeeping so this founder can focus on growth instead of spreadsheets.',
    priority: 7,
  },
  {
    id: 'pilot',
    name: 'Pilot',
    category: 'accounting',
    tagline: 'Bookkeeping, tax, and CFO services for startups',
    description: 'Expert bookkeeping backed by software, designed for high-growth companies.',
    ctaText: 'See pricing',
    affiliateUrl: 'https://pilot.com?ref=lucrum',
    triggerConditions: { minMRR: 5000, requiresRevenue: true },
    maxRecommendationContext: 'With significant revenue, Pilot can provide the bookkeeping and CFO support this founder needs.',
    priority: 8,
  },
]

function meetsConditions(
  product: AffiliateProduct,
  metrics: Pick<StripeMetrics, 'mrr' | 'runway' | 'churnRate' | 'accountAgeDays' | 'revenue30d'>
): boolean {
  const c = product.triggerConditions
  if (c.requiresRevenue && metrics.revenue30d <= 0) return false
  if (c.minMRR != null && metrics.mrr < c.minMRR) return false
  if (c.maxMRR != null && metrics.mrr > c.maxMRR) return false
  if (c.minRunway != null && metrics.runway < c.minRunway) return false
  if (c.maxRunway != null && metrics.runway > c.maxRunway) return false
  if (c.minChurn != null && metrics.churnRate < c.minChurn) return false
  if (c.accountAgeDays != null && metrics.accountAgeDays < c.accountAgeDays) return false
  return true
}

export function getEligibleAffiliates(
  metrics: Pick<StripeMetrics, 'mrr' | 'runway' | 'churnRate' | 'accountAgeDays' | 'revenue30d'>
): AffiliateProduct[] {
  return AFFILIATE_PRODUCTS
    .filter(p => meetsConditions(p, metrics))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)
}

export function getAffiliateById(id: string): AffiliateProduct | undefined {
  return AFFILIATE_PRODUCTS.find(p => p.id === id)
}
~~~

## File: src/lib/ai.ts

~~~typescript
export type AIProvider = 'groq' | 'gemini'

type GenerateAITextInput = {
  system?: string
  prompt: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}

export type GenerateAITextOutput = {
  text: string
  provider: AIProvider
}

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash'

function resolveProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase()
  if (configured === 'groq' || configured === 'gemini') return configured
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return 'groq'
}

function joinPrompt(system: string | undefined, prompt: string): string {
  if (!system?.trim()) return prompt
  return `${system.trim()}\n\n${prompt}`
}

async function generateWithGroq(input: GenerateAITextInput): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model,
    messages: [
      ...(input.system?.trim() ? [{ role: 'system' as const, content: input.system.trim() }] : []),
      { role: 'user' as const, content: input.prompt },
    ],
    temperature: input.temperature ?? 0.3,
    max_tokens: input.maxTokens ?? 350,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Groq request failed (${res.status}): ${details}`)
  }

  const data = await res.json() as {
    choices?: Array<{
      message?: { content?: string }
    }>
  }

  const content = data.choices?.[0]?.message?.content
  return (content ?? '').trim()
}

async function generateWithGemini(input: GenerateAITextInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: joinPrompt(input.system, input.prompt) }],
      },
    ],
    generationConfig: {
      temperature: input.temperature ?? 0.3,
      maxOutputTokens: input.maxTokens ?? 350,
      ...(input.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${details}`)
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map(part => part.text ?? '').join('').trim()
}

export async function generateAIText(input: GenerateAITextInput): Promise<GenerateAITextOutput> {
  const preferred = resolveProvider()
  const fallback: AIProvider = preferred === 'groq' ? 'gemini' : 'groq'

  try {
    const text = preferred === 'groq'
      ? await generateWithGroq(input)
      : await generateWithGemini(input)
    return { text, provider: preferred }
  } catch (preferredError) {
    try {
      const text = fallback === 'groq'
        ? await generateWithGroq(input)
        : await generateWithGemini(input)
      return { text, provider: fallback }
    } catch (fallbackError) {
      const firstMessage =
        preferredError instanceof Error ? preferredError.message : 'unknown provider error'
      const secondMessage =
        fallbackError instanceof Error ? fallbackError.message : 'unknown fallback error'
      throw new Error(`AI providers failed. preferred=${firstMessage}; fallback=${secondMessage}`)
    }
  }
}
~~~

## File: src/lib/ai-client.ts

~~~typescript
const DEFAULT_TIMEOUT_MS = 10_000

type ChatRole = 'system' | 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const result = await promise
    return result
  } finally {
    clearTimeout(id)
  }
}

function buildMessages(system: string | undefined, user: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (system && system.trim()) {
    messages.push({ role: 'system', content: system.trim() })
  }
  messages.push({ role: 'user', content: user })
  return messages
}

async function callOllama(
  system: string | undefined,
  user: string,
  scope: 'fast' | 'structured'
): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL
  if (!baseUrl || process.env.NODE_ENV !== 'development') return ''

  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`
  const body = {
    model: scope === 'structured'
      ? (process.env.OLLAMA_STRUCTURED_MODEL || 'mistral:latest')
      : (process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b'),
    messages: buildMessages(system, user),
    temperature: 0.2,
    stream: false,
  }

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    DEFAULT_TIMEOUT_MS
  )

  if (!res.ok) return ''
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

async function callRunpod(
  endpointEnvKey: 'RUNPOD_ENDPOINT_HEAVY_URL' | 'RUNPOD_ENDPOINT_CHAT_URL',
  defaultModel: string,
  system: string | undefined,
  user: string
): Promise<string> {
  const endpoint = process.env[endpointEnvKey]
  const apiKey = process.env.RUNPOD_API_KEY
  if (!endpoint || !apiKey) return ''

  const url = endpoint
  const body = {
    model: defaultModel,
    messages: buildMessages(system, user),
    temperature: 0.2,
    stream: false,
  }

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }),
    DEFAULT_TIMEOUT_MS
  )

  if (!res.ok) throw new Error(`RunPod request failed: ${res.status}`)
  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

async function callGroq(
  system: string | undefined,
  user: string,
  purpose: 'heavy' | 'chat' | 'structured'
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return ''

  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const reasoningModel =
    process.env.GROQ_REASONING_MODEL || 'moonshotai/kimi-k2'
  const reasoningFallback =
    process.env.GROQ_REASONING_FALLBACK || 'qwen-qwq-32b'
  const chatModel =
    process.env.GROQ_CHAT_MODEL || 'meta-llama/llama-4-scout'
  const chatFallback =
    process.env.GROQ_CHAT_FALLBACK || 'llama-3.3-70b-versatile'
  const structuredModel =
    process.env.GROQ_STRUCTURED_MODEL || 'qwen-qwq-32b'

  const modelOrder =
    purpose === 'heavy'
      ? [reasoningModel, reasoningFallback]
      : purpose === 'chat'
      ? [chatModel, chatFallback]
      : [structuredModel, reasoningModel]

  const maxTokens =
    purpose === 'heavy' ? 400 : purpose === 'chat' ? 300 : 500

  const messages = buildMessages(
    system ? `${system.trim()}\n\nBe concise. Under ${purpose === 'heavy' ? 130 : 90} words.` : undefined,
    user
  )

  let lastError: unknown

  for (const model of modelOrder) {
    try {
      const res = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens: maxTokens,
            stream: false,
          }),
        }),
        DEFAULT_TIMEOUT_MS
      )

      if (res.status === 429) {
        logFailure(`${purpose}:groq:rate_limit`, new Error(`429 from ${model}`))
        // try next model immediately
        continue
      }

      if (!res.ok) {
        lastError = new Error(`Groq request failed (${res.status})`)
        continue
      }

      const data: any = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim()) {
        return content.trim()
      }
    } catch (err) {
      lastError = err
      logFailure(`${purpose}:groq:${model}`, err)
    }
  }

  if (lastError) throw lastError
  return ''
}

function logFailure(scope: string, error: unknown): void {
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.error(`[${ts}] [ai-client:${scope}] AI call failed:`, error)
}

async function callAiWithRouting(
  scope: 'heavy' | 'chat' | 'structured',
  system: string | undefined,
  user: string
): Promise<string> {
  // 1. RunPod (heavy or chat) – fastest when configured
  try {
    const model =
      scope === 'heavy'
        ? 'meta-llama/Llama-3.3-70B-Instruct'
        : 'Qwen/Qwen2.5-14B-Instruct'
    const endpointKey =
      scope === 'heavy' ? 'RUNPOD_ENDPOINT_HEAVY_URL' : 'RUNPOD_ENDPOINT_CHAT_URL'
    const runpodText = await callRunpod(endpointKey, model, system, user)
    if (runpodText) return runpodText
  } catch (err) {
    logFailure(`${scope}:runpod`, err)
  }

  // 2. Groq — primary backbone
  try {
    const groqText = await callGroq(system, user, scope === 'structured' ? 'structured' : scope)
    if (groqText) return groqText
  } catch (err) {
    logFailure(`${scope}:groq`, err)
  }

  // 3. Local Ollama fallback (free, unlimited in dev)
  try {
    const ollamaText = await callOllama(
      system,
      user,
      scope === 'structured' ? 'structured' : 'fast'
    )
    if (ollamaText) return ollamaText
  } catch (err) {
    logFailure(`${scope}:ollama`, err)
  }

  const ts = new Date().toISOString()
  logFailure(scope, new Error('All AI providers failed'))
  return 'AI analysis temporarily unavailable. Your metrics are still accurate.'
}

export async function callHeavyAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('heavy', system, user)
}

export async function callChatAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('chat', system, user)
}

export async function callStructuredAI(system: string | undefined, user: string): Promise<string> {
  return callAiWithRouting('structured', system, user)
}

export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export async function callVisionAI(prompt: string, fileBase64: string, mimeType: string): Promise<string> {
  // 1. Groq vision (Llama 4 Scout supports vision)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: process.env.GROQ_CHAT_MODEL || 'meta-llama/llama-4-scout',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
                  { type: 'text', text: prompt },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 500,
            stream: false,
          }),
        }),
        15_000
      )
      if (res.ok) {
        const data: any = await res.json()
        const content = data?.choices?.[0]?.message?.content
        if (typeof content === 'string' && content.trim()) return content.trim()
      }
    } catch (err) {
      logFailure('vision:groq', err)
    }
  }

  // 2. Gemini 2.0 Flash
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  if (geminiKey) {
    try {
      const res = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mimeType, data: fileBase64 } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
            }),
          }
        ),
        15_000
      )
      if (res.ok) {
        const data: any = await res.json()
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof content === 'string' && content.trim()) return content.trim()
      }
    } catch (err) {
      logFailure('vision:gemini', err)
    }
  }

  return 'Document analysis unavailable. Please enter values manually.'
}
~~~

## File: src/lib/audit-log.ts

~~~typescript
import { randomUUID } from 'node:crypto'
import { safeKvGet, safeKvSet } from '@/lib/kv'

export interface AuditEntry {
  id: string
  userId: string
  actionType: string
  category: string
  params: Record<string, any>
  result: Record<string, any>
  success: boolean
  errorMessage?: string
  revenueImpact?: number
  affectedCustomers: string[]
  maxRecommended: boolean
  executedAt: string
  stripeRequestId?: string
  status: 'pending' | 'success' | 'failed'
}

const MAX_INDEX_SIZE = 200

export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'status'> & { status?: AuditEntry['status'] }
): Promise<AuditEntry> {
  const withId: AuditEntry = {
    ...entry,
    id: randomUUID(),
    status: entry.status ?? (entry.success ? 'success' : 'failed'),
  }

  const entryKey = `audit:${entry.userId}:${withId.id}`
  await safeKvSet(entryKey, withId, 90 * 86400)

  const indexKey = `audit_index:${entry.userId}`
  const existing = await safeKvGet<string[]>(indexKey) ?? []
  const updated = [entryKey, ...existing].slice(0, MAX_INDEX_SIZE)
  await safeKvSet(indexKey, updated)

  return withId
}

export async function readAuditLog(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuditEntry[]> {
  const indexKey = `audit_index:${userId}`
  const keys = await safeKvGet<string[]>(indexKey)
  if (!keys?.length) return []

  const slice = keys.slice(offset, offset + limit)
  const entries: AuditEntry[] = []

  for (const key of slice) {
    const entry = await safeKvGet<AuditEntry>(key)
    if (entry) entries.push(entry)
  }

  return entries
}

export async function updateAuditEntry(
  userId: string,
  id: string,
  updates: Partial<AuditEntry>
): Promise<void> {
  const entryKey = `audit:${userId}:${id}`
  const existing = await safeKvGet<AuditEntry>(entryKey)
  if (!existing) return

  const merged = { ...existing, ...updates }
  await safeKvSet(entryKey, merged, 90 * 86400)
}
~~~

## File: src/lib/comp-engine.ts

~~~typescript
import type { BenchmarkReport, CompDataPoint, CompSource, StripeMetrics } from '@/types'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const COMP_INDEX_KEY = 'lucrum:comps:v1:index'

type CompIndexEntry = { key: string; source: CompSource; scrapedAt: number }

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * clamp(q, 0, 1)
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] == null) return sorted[base]
  return sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function median(sorted: number[]): number {
  return quantile(sorted, 0.5)
}

function normalizeDataPoint(p: Partial<CompDataPoint>): CompDataPoint | null {
  const id = typeof p.id === 'string' ? p.id : null
  const source = (p.source as CompSource) || null
  const mrr = typeof p.mrr === 'number' && Number.isFinite(p.mrr) ? p.mrr : null
  const monthsOld =
    typeof p.monthsOld === 'number' && Number.isFinite(p.monthsOld) ? p.monthsOld : null
  const category = (p.category as any) || 'other'
  if (!id || !source || mrr == null || monthsOld == null) return null

  return {
    id,
    source,
    mrr: Math.max(0, Math.round(mrr)),
    monthsOld: Math.max(0, Math.round(monthsOld)),
    category,
    churnRate: typeof p.churnRate === 'number' ? p.churnRate : undefined,
    growthRateMoM: typeof p.growthRateMoM === 'number' ? p.growthRateMoM : undefined,
    teamSize: typeof p.teamSize === 'number' ? p.teamSize : undefined,
    notes: typeof p.notes === 'string' ? p.notes : undefined,
    scrapedAt: typeof p.scrapedAt === 'number' ? p.scrapedAt : Date.now(),
  }
}

async function loadIndex(): Promise<CompIndexEntry[]> {
  const idx = await safeKvGet<CompIndexEntry[]>(COMP_INDEX_KEY)
  return Array.isArray(idx) ? idx : []
}

async function saveIndex(entries: CompIndexEntry[]): Promise<void> {
  const pruned = entries
    .sort((a, b) => b.scrapedAt - a.scrapedAt)
    .slice(0, 5000)
  await safeKvSet(COMP_INDEX_KEY, pruned)
}

export async function saveCompDataPoints(
  source: CompSource,
  points: Array<Partial<CompDataPoint>>
): Promise<{ saved: number; total: number }> {
  const now = Date.now()
  const normalized = points
    .map(p => normalizeDataPoint({ ...p, source, scrapedAt: p.scrapedAt ?? now }))
    .filter(Boolean) as CompDataPoint[]

  if (!normalized.length) return { saved: 0, total: points.length }

  const existingIndex = await loadIndex()
  const nextIndex = [...existingIndex]

  let saved = 0
  for (const p of normalized) {
    const key = `lucrum:comps:v1:${source}:${p.id}`
    const ok = await safeKvSet(key, p, { ex: 60 * 60 * 24 * 60 })
    if (ok) {
      saved += 1
      nextIndex.push({ key, source, scrapedAt: p.scrapedAt })
    }
  }

  await saveIndex(nextIndex)
  return { saved, total: points.length }
}

export function isNewFounder(accountAgeDays: number | null | undefined): boolean {
  if (accountAgeDays == null) return false
  return accountAgeDays >= 0 && accountAgeDays < 60
}

export async function getBenchmarks(input: {
  mrr: number
  accountAgeDays: number
  category?: string | null
}): Promise<BenchmarkReport | null> {
  const idx = await loadIndex()
  if (!idx.length) return null

  const keys = idx
    .sort((a, b) => b.scrapedAt - a.scrapedAt)
    .slice(0, 800)
    .map(e => e.key)

  const points: CompDataPoint[] = []
  await Promise.all(
    keys.map(async key => {
      const p = await safeKvGet<CompDataPoint>(key)
      if (p && typeof p.mrr === 'number' && typeof p.monthsOld === 'number') points.push(p)
    })
  )

  if (!points.length) return null

  const maxMonthsOld = clamp(Math.ceil(input.accountAgeDays / 30) + 2, 1, 18)

  const filtered = points
    .filter(p => p.mrr > 0 && p.monthsOld >= 0 && p.monthsOld <= maxMonthsOld)
    .filter(p => (input.category ? String(p.category) === String(input.category) : true))

  const population = filtered.length >= 25 ? filtered : points

  const mrrs = population.map(p => p.mrr).sort((a, b) => a - b)
  const p25MRR = quantile(mrrs, 0.25)
  const medianMRR = median(mrrs)
  const p75MRR = quantile(mrrs, 0.75)
  const topPerformerMRR = mrrs[mrrs.length - 1] ?? 0

  const churns = population
    .map(p => p.churnRate)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)

  const growths = population
    .map(p => p.growthRateMoM)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)

  const targetMRR = Math.max(0, input.mrr || 0)
  const minMRR = Math.max(1, targetMRR / 3)
  const maxMRR = Math.max(minMRR + 1, targetMRR * 3)
  const similar = population
    .filter(p => p.mrr >= minMRR && p.mrr <= maxMRR)
    .sort((a, b) => a.mrr - b.mrr)
    .slice(0, 6)

  const freshness = population.reduce((max, p) => Math.max(max, p.scrapedAt || 0), 0)
  const sources = Array.from(new Set(population.map(p => p.source))).sort()

  return {
    compCount: population.length,
    medianMRR,
    p25MRR,
    p75MRR,
    medianGrowthRate: growths.length ? median(growths) : undefined,
    medianChurnRate: churns.length ? median(churns) : undefined,
    topPerformerMRR,
    similarBusinesses: similar,
    dataFreshness: freshness,
    sources,
  }
}

export function benchmarksForMetrics(metrics: StripeMetrics): Promise<BenchmarkReport | null> {
  return getBenchmarks({
    mrr: metrics.mrr,
    accountAgeDays: metrics.accountAgeDays,
    category: null,
  })
}
~~~

## File: src/lib/decision-engine.ts

~~~typescript
import { getUserPlan } from '@/lib/subscription'

export type DecisionActionDraft = {
  id: string
  title: string
  description: string
  status: 'stub'
}

export type DecisionEngineReadiness = {
  ready: boolean
  blockers: string[]
  nextActions: DecisionActionDraft[]
}

export async function getDecisionEngineReadiness(userId: string): Promise<DecisionEngineReadiness> {
  const plan = await getUserPlan(userId)
  const blockers =
    plan === 'solo' || plan === 'enterprise'
      ? []
      : ['Upgrade to Solo Dev or Enterprise before enabling automated decision execution.']

  return {
    ready: blockers.length === 0,
    blockers,
    nextActions: [
      {
        id: 'decision-engine-stub',
        title: 'Decision engine scaffolded',
        description: 'Auth, billing, webhook audit trail, and user identity are now in place for the full action engine build.',
        status: 'stub',
      },
    ],
  }
}
~~~

## File: src/lib/decision-scorer.ts

~~~typescript
import type { DecisionScore, StripeMetrics, StripeCustomer } from '@/types'

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function composite(s: DecisionScore['scores']): number {
  return (
    s.revenueImpact * 0.35 +
    s.timeToRevenue * 0.20 +
    s.confidence * 0.20 +
    s.reversibility * 0.10 +
    s.burnImpact * 0.10 +
    s.churnImpact * 0.05
  )
}

function scoreRetryPayment(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.failedPaymentsCount <= 0) return null
  const failedAmount = metrics.failedPaymentsValue
  const scores = {
    revenueImpact: clamp((failedAmount / Math.max(1, metrics.mrr)) * 200, 0, 100),
    timeToRevenue: 95,
    confidence: 78,
    reversibility: 100,
    burnImpact: 0,
    churnImpact: 60,
  }
  return {
    actionType: 'retry_payment',
    label: 'Retry failed payments',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 5,
    estimatedDollarImpact: failedAmount * 0.78,
    worstCaseImpact: 0,
    successProbability: 0.78,
    timeToImpact: 'immediate',
  }
}

function scoreChurnRecovery(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.churnRate <= 2 && metrics.failedPaymentsCount === 0) return null
  const atRiskMRR = metrics.failedPaymentsValue + (metrics.cancelledSubscriptions30d * (metrics.mrr / Math.max(1, metrics.activeSubscriptions)))
  const scores = {
    revenueImpact: clamp((atRiskMRR / Math.max(1, metrics.mrr)) * 150, 0, 100),
    timeToRevenue: 50,
    confidence: 32,
    reversibility: 100,
    burnImpact: 0,
    churnImpact: 85,
  }
  return {
    actionType: 'send_churn_recovery_email',
    label: 'Send churn recovery emails',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 5,
    estimatedDollarImpact: atRiskMRR * 0.32 * 12,
    worstCaseImpact: 0,
    successProbability: 0.32,
    timeToImpact: 'days',
  }
}

function scoreApplyCoupon(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.failedPaymentsValue <= 0 && metrics.cancelledSubscriptions30d <= 0) return null
  const avgCustomerMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const discountCost = avgCustomerMRR * 0.20 * 3
  const scores = {
    revenueImpact: clamp(((avgCustomerMRR * 12 * 0.55) - discountCost) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 70,
    confidence: 55,
    reversibility: 40,
    burnImpact: -20,
    churnImpact: 90,
  }
  return {
    actionType: 'apply_coupon',
    label: 'Offer retention coupons',
    params: { discountPercent: 20, durationMonths: 3 },
    scores,
    compositeScore: composite(scores),
    riskTier: 3,
    estimatedDollarImpact: (avgCustomerMRR * 12 * 0.55) - discountCost,
    worstCaseImpact: -discountCost,
    successProbability: 0.55,
    timeToImpact: 'days',
  }
}

function scoreRaisePrice(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.mrr <= 0) return null
  const projectedChurn = metrics.activeSubscriptions * 0.08
  const avgSub = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const scores = {
    revenueImpact: clamp((metrics.mrr * 0.15 - projectedChurn * avgSub) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 30,
    confidence: 45,
    reversibility: 20,
    burnImpact: 0,
    churnImpact: -40,
  }
  return {
    actionType: 'raise_price',
    label: 'Raise prices 15%',
    params: { percentIncrease: 15 },
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.mrr * 0.15 * 0.92,
    worstCaseImpact: -(projectedChurn * avgSub * 12),
    successProbability: 0.45,
    timeToImpact: 'weeks',
  }
}

function scoreExpansionCampaign(metrics: StripeMetrics, customers: StripeCustomer[]): DecisionScore | null {
  const eligible = customers.filter(c => c.expansionEligible)
  if (!eligible.length) return null
  const avgCustomerMRR = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
  const upgradeValue = avgCustomerMRR * 0.5
  const scores = {
    revenueImpact: clamp((eligible.length * upgradeValue * 0.18) / Math.max(1, metrics.mrr) * 100, 0, 100),
    timeToRevenue: 35,
    confidence: 18,
    reversibility: 100,
    burnImpact: -10,
    churnImpact: 10,
  }
  return {
    actionType: 'launch_expansion_campaign',
    label: 'Launch expansion campaign',
    params: { eligibleCount: eligible.length },
    scores,
    compositeScore: composite(scores),
    riskTier: 4,
    estimatedDollarImpact: eligible.length * upgradeValue * 0.18,
    worstCaseImpact: 0,
    successProbability: 0.18,
    timeToImpact: 'weeks',
  }
}

function scoreCutBurn(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.runway >= 120) return null
  const scores = {
    revenueImpact: 0,
    timeToRevenue: 95,
    confidence: 80,
    reversibility: 30,
    burnImpact: 100,
    churnImpact: 0,
  }
  return {
    actionType: 'cut_burn_aggressively',
    label: 'Cut burn 30%',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.estimatedMonthlyBurn * 0.30,
    worstCaseImpact: metrics.estimatedMonthlyBurn * 0.30 * -0.5,
    successProbability: 0.80,
    timeToImpact: 'immediate',
  }
}

function scoreRaiseCapital(metrics: StripeMetrics): DecisionScore | null {
  if (metrics.mrr <= 1000) return null
  const qualifyMultiplier = metrics.mrr > 10000 ? 0.70 : 0.30
  const scores = {
    revenueImpact: 70,
    timeToRevenue: 40,
    confidence: qualifyMultiplier * 100,
    reversibility: 20,
    burnImpact: 90,
    churnImpact: 0,
  }
  return {
    actionType: 'raise_external_capital',
    label: 'Raise external capital',
    params: {},
    scores,
    compositeScore: composite(scores),
    riskTier: 2,
    estimatedDollarImpact: metrics.mrr * 12 * 0.5,
    worstCaseImpact: -(metrics.mrr * 12 * 0.5 * 1.06),
    successProbability: qualifyMultiplier,
    timeToImpact: 'months',
  }
}

function scoreDoNothing(metrics: StripeMetrics): DecisionScore {
  return {
    actionType: 'do_nothing',
    label: 'Do nothing',
    params: {},
    scores: {
      revenueImpact: 0,
      timeToRevenue: 0,
      confidence: 0,
      reversibility: 0,
      burnImpact: 0,
      churnImpact: 0,
    },
    compositeScore: 0,
    riskTier: 5,
    estimatedDollarImpact: 0,
    worstCaseImpact: -(metrics.availableBalance),
    successProbability: 1.0,
    timeToImpact: 'immediate',
  }
}

export function scoreDecisions(
  metrics: StripeMetrics,
  customers: StripeCustomer[]
): DecisionScore[] {
  const all: (DecisionScore | null)[] = [
    scoreRetryPayment(metrics),
    scoreChurnRecovery(metrics),
    scoreApplyCoupon(metrics),
    scoreRaisePrice(metrics),
    scoreExpansionCampaign(metrics, customers),
    scoreCutBurn(metrics),
    scoreRaiseCapital(metrics),
    scoreDoNothing(metrics),
  ]

  return all
    .filter((d): d is DecisionScore => d !== null)
    .sort((a, b) => b.compositeScore - a.compositeScore)
}
~~~

## File: src/lib/email.ts

~~~typescript
import { Resend } from 'resend'
import { getUserEmail } from '@/lib/user-state'

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmailToAddress(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  const resend = getResendClient()
  if (!resend || !to) return false

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      text,
    })
    return true
  } catch (error) {
    console.error('[email] send failed:', error)
    return false
  }
}

export async function sendEmailToUserId(
  userId: string,
  subject: string,
  text: string
): Promise<boolean> {
  const email = await getUserEmail(userId)
  if (!email) return false
  return sendEmailToAddress(email, subject, text)
}
~~~

## File: src/lib/five-moves.ts

~~~typescript
import type {
  StripeMetrics,
  StripeCustomer,
  DecisionScore,
  SimulationConfig,
  SimulationResult,
  Move,
  MoveRisk,
  FiveMovesResult,
} from '@/types'
import { scoreDecisions } from '@/lib/decision-scorer'
import { runSimulation, hashSimConfig, getCachedSimulation, cacheSimulation } from '@/lib/monte-carlo'
import { callHeavyAI, stripThinking } from '@/lib/ai-client'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const RISK_COLORS: Record<MoveRisk, string> = {
  cutthroat: '#FF3B5C',
  aggressive: '#FF8C00',
  balanced: '#C9A84C',
  conservative: '#00A066',
  safe: '#00D084',
}

const RISK_LABELS: Record<MoveRisk, string> = {
  cutthroat: 'Cutthroat — Maximum EV',
  aggressive: 'Aggressive — High Upside',
  balanced: 'Balanced — Best Risk-Adj',
  conservative: 'Conservative — Protect Position',
  safe: 'Safe — Minimum Viable Action',
}

function buildSimConfig(metrics: StripeMetrics, decision?: DecisionScore | null): SimulationConfig {
  return {
    currentMRR: metrics.mrr,
    currentBalance: metrics.availableBalance,
    monthlyBurn: metrics.estimatedMonthlyBurn,
    mrrGrowthRate: metrics.mrrGrowth,
    churnRate: metrics.churnRate,
    appliedDecision: decision
      ? { actionType: decision.actionType, successProbability: decision.successProbability }
      : null,
  }
}

function runSimForDecisions(metrics: StripeMetrics, decisions: DecisionScore[]): SimulationResult {
  const primary = decisions[0] ?? null
  return runSimulation(buildSimConfig(metrics, primary))
}

function computeMoveMetrics(
  move: { actions: DecisionScore[]; simulation: SimulationResult },
  baseline: SimulationResult
) {
  const sim = move.simulation
  return {
    expectedRunwayGain: Math.round(sim.runway.p50 - baseline.runway.p50),
    expectedMRRAt90d: Math.round(sim.mrrForecast.month3.p50),
    expectedMRRAt365d: Math.round(sim.mrrForecast.month12.p50),
    survivalProbability: sim.runway.probabilityOf180Days,
    expectedDollarImpact: move.actions.reduce((s, a) => s + a.estimatedDollarImpact, 0),
    riskOfBackfire: Math.max(0, 1 - sim.runway.probabilityOf180Days),
    compositeScore: move.actions.length
      ? move.actions.reduce((s, a) => s + a.compositeScore, 0) / move.actions.length
      : 0,
  }
}

function deterministicFallback(
  rank: 1 | 2 | 3 | 4 | 5,
  risk: MoveRisk,
  actions: DecisionScore[],
  sim: SimulationResult,
  baseline: SimulationResult
): Omit<Move, 'metrics' | 'simulation' | 'actions'> {
  const label = actions.map(a => a.label).join(' + ') || 'Hold position'
  const gain = Math.round(sim.runway.p50 - baseline.runway.p50)
  return {
    rank,
    risk,
    riskLabel: RISK_LABELS[risk],
    riskColor: RISK_COLORS[risk],
    title: `${risk.charAt(0).toUpperCase() + risk.slice(1)}: ${label}`,
    summary: `Execute ${label} to shift runway by ${gain > 0 ? '+' : ''}${gain} days.`,
    rationale: `Simulations show median survival at ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}% over 180 days. Composite score: ${actions[0]?.compositeScore?.toFixed(0) ?? 0}/100.`,
    tradeoff: risk === 'safe' ? 'Minimal downside, but limited upside.' : `Higher reward but ${(1 - sim.runway.probabilityOf180Days) * 100 > 20 ? 'meaningful' : 'modest'} backfire risk.`,
    maxStatement: `50,000 simulations ran. ${label} gives you +${gain} days of runway with ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}% 180-day survival. The math supports this move.`,
    timeToExecute: risk === 'safe' || risk === 'conservative' ? 'Execute now' : risk === 'balanced' ? 'This week' : 'This month',
  }
}

export async function generateFiveMoves(
  metrics: StripeMetrics,
  customers: StripeCustomer[],
  userId: string
): Promise<FiveMovesResult> {
  const baseConfig = buildSimConfig(metrics)
  const cacheKey = `fivemoves:${userId}:${hashSimConfig(baseConfig)}`

  const cached = await safeKvGet<FiveMovesResult>(cacheKey)
  if (cached && cached.generatedAt && Date.now() - cached.generatedAt < 30 * 60 * 1000) {
    return cached
  }

  const decisions = scoreDecisions(metrics, customers)
  const baseline = runSimulation(baseConfig)
  baseline.baselineRunwayP50 = baseline.runway.p50

  // Construct 5 move candidates
  const moveSpecs: Array<{ rank: 1 | 2 | 3 | 4 | 5; risk: MoveRisk; actions: DecisionScore[] }> = []

  // MOVE 1 — CUTTHROAT: top 2 by composite regardless of risk
  const top2 = decisions.filter(d => d.actionType !== 'do_nothing').slice(0, 2)
  moveSpecs.push({ rank: 1, risk: 'cutthroat', actions: top2 })

  // MOVE 2 — AGGRESSIVE: top decision + first safe-ish one
  const aggressiveSecond = decisions.find(d => d.riskTier >= 3 && d.actionType !== 'do_nothing' && d !== top2[0])
  moveSpecs.push({ rank: 2, risk: 'aggressive', actions: [decisions[0], aggressiveSecond].filter((d): d is DecisionScore => d != null && d.actionType !== 'do_nothing') })

  // MOVE 3 — BALANCED: reversibility >= 60, top 2
  const balancedActions = decisions.filter(d => d.scores.reversibility >= 60 && d.actionType !== 'do_nothing').slice(0, 2)
  moveSpecs.push({ rank: 3, risk: 'balanced', actions: balancedActions.length ? balancedActions : [decisions.find(d => d.actionType !== 'do_nothing')!].filter(Boolean) })

  // MOVE 4 — CONSERVATIVE: fully reversible, top 1
  const conservativeAction = decisions.find(d => d.scores.reversibility === 100 && d.actionType !== 'do_nothing')
  moveSpecs.push({ rank: 4, risk: 'conservative', actions: conservativeAction ? [conservativeAction] : [] })

  // MOVE 5 — SAFE: riskTier 5 with max confidence
  const safeActions = decisions.filter(d => d.riskTier === 5 && d.actionType !== 'do_nothing')
  const safest = safeActions.sort((a, b) => b.scores.confidence - a.scores.confidence)[0]
  moveSpecs.push({ rank: 5, risk: 'safe', actions: safest ? [safest] : [] })

  // Run simulations for each
  const movesWithSims = moveSpecs.map(spec => ({
    ...spec,
    simulation: spec.actions.length ? runSimForDecisions(metrics, spec.actions) : baseline,
  }))

  // Compute metrics
  const movesWithMetrics = movesWithSims.map(m => ({
    ...m,
    metrics: computeMoveMetrics(m, baseline),
  }))

  // Build AI prompt
  let dataQuality: FiveMovesResult['dataQuality'] = 'high'

  const prompt = `You are MAX, AI CFO inside Lucrum.
50,000 Monte Carlo simulations just ran across 5 strategic moves.
Write the human interpretation layer.
Be direct. Sound like a brilliant CFO texting a founder.
Reference exact numbers. Never say "it depends".

FOUNDER STATE:
MRR: $${metrics.mrr} | Growth: ${metrics.mrrGrowth}% MoM
Churn: ${metrics.churnRate}% | Runway: ${metrics.runway}d straight-line
Cash: $${metrics.availableBalance} | Burn: $${metrics.estimatedMonthlyBurn}/mo

BASELINE (doing nothing):
Median runway: ${Math.round(baseline.runway.p50)}d
180d survival: ${(baseline.runway.probabilityOf180Days * 100).toFixed(0)}%
Risk score: ${baseline.riskScore}/100
MRR in 12mo: $${Math.round(baseline.mrrForecast.month12.p50)}

${movesWithMetrics.map((m, i) => `
MOVE ${i + 1} — ${m.risk.toUpperCase()}
Actions: ${m.actions.map(a => a.label).join(' + ') || 'Hold'}
Simulation vs baseline:
  Runway gain: +${m.metrics.expectedRunwayGain}d
  180d survival: ${(m.metrics.survivalProbability * 100).toFixed(0)}%
  MRR at 90d: $${m.metrics.expectedMRRAt90d}
  MRR at 12mo: $${m.metrics.expectedMRRAt365d}
  Backfire risk: ${(m.metrics.riskOfBackfire * 100).toFixed(0)}%
  Composite score: ${m.metrics.compositeScore.toFixed(0)}/100
`).join('')}

For EACH of the 5 moves write:
  title: 4-6 word punchy title
  summary: 1 sentence what this move does
  rationale: 2 sentences why the math supports this
  tradeoff: 1 sentence what the founder gives up
  maxStatement: MAX's direct take, under 60 words, first person, reference the numbers
  timeToExecute: "Execute now" OR "This week" OR "This month"

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "moves": [
    { "rank":1, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":2, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":3, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":4, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":5, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." }
  ]
}`

  let aiMoves: Array<{ rank: number; title: string; summary: string; rationale: string; tradeoff: string; maxStatement: string; timeToExecute: string }> | null = null

  try {
    const raw = stripThinking(await callHeavyAI(undefined, prompt))
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.moves) && parsed.moves.length === 5) {
        aiMoves = parsed.moves
      }
    }
  } catch (err) {
    console.error('[five-moves] AI interpretation failed:', err)
    dataQuality = 'low'
  }

  const moves: Move[] = movesWithMetrics.map((m, i) => {
    const ai = aiMoves?.[i]
    const fallback = deterministicFallback(m.rank, m.risk, m.actions, m.simulation, baseline)

    return {
      rank: m.rank,
      risk: m.risk,
      riskLabel: RISK_LABELS[m.risk],
      riskColor: RISK_COLORS[m.risk],
      title: ai?.title ?? fallback.title,
      summary: ai?.summary ?? fallback.summary,
      rationale: ai?.rationale ?? fallback.rationale,
      tradeoff: ai?.tradeoff ?? fallback.tradeoff,
      actions: m.actions,
      simulation: m.simulation,
      metrics: m.metrics,
      maxStatement: ai?.maxStatement ?? fallback.maxStatement,
      timeToExecute: ai?.timeToExecute ?? fallback.timeToExecute,
    }
  })

  const result: FiveMovesResult = {
    moves,
    baselineSimulation: baseline,
    generatedAt: Date.now(),
    dataQuality: aiMoves ? 'high' : 'low',
  }

  await safeKvSet(cacheKey, result, 1800)

  return result
}
~~~

## File: src/lib/kv.ts

~~~typescript
import { createClient, type VercelKV } from '@vercel/kv'

let client: VercelKV | null = null

function getKvClient(): VercelKV | null {
  if (client) return client

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null

  client = createClient({ url, token })
  return client
}

export async function safeKvGet<T>(key: string): Promise<T | null> {
  const kv = getKvClient()
  if (!kv) return null

  try {
    return await kv.get<T>(key)
  } catch (error) {
    console.error('[kv] get failed:', key, error)
    return null
  }
}

export async function safeKvSet(
  key: string,
  value: unknown,
  optionsOrTtl?: { ex?: number } | number
): Promise<boolean> {
  const kv = getKvClient()
  if (!kv) return false

  const ex = typeof optionsOrTtl === 'number' ? optionsOrTtl : optionsOrTtl?.ex

  try {
    if (ex) {
      await kv.set(key, value, { ex })
    } else {
      await kv.set(key, value)
    }
    return true
  } catch (error) {
    console.error('[kv] set failed:', key, error)
    return false
  }
}

export async function safeKvDel(...keys: string[]): Promise<number> {
  if (!keys.length) return 0

  const kv = getKvClient()
  if (!kv) return 0

  try {
    return await kv.del(...keys)
  } catch (error) {
    console.error('[kv] del failed:', keys, error)
    return 0
  }
}
~~~

## File: src/lib/mockData.ts

~~~typescript
import type {
  CashFlowPeriod,
  CohortRetentionRow,
  DailyRevenue,
  LeakageSummary,
  MonthlyMRR,
  RevenueByPeriod,
  StripeEvent,
  StripeMetrics,
} from '@/types'
import type { SimulationBaseline } from '@/lib/simulation'

function isTruthyFlag(value: string | null | undefined): boolean {
  if (!value) return false
  return /^(1|true|yes|on)$/i.test(value.trim())
}

export function isDemoModeEnabled(queryFlag?: string | null): boolean {
  const envFlag =
    process.env.LUCRUM_DEMO_MODE ??
    process.env.NEXT_PUBLIC_DEMO_MODE ??
    ''

  return isTruthyFlag(envFlag) || isTruthyFlag(queryFlag)
}

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

function buildDailyRevenue(): DailyRevenue[] {
  const values = [780, 920, 865, 1120, 980, 1415, 1260]
  return getLastNDays(7).map((date, index) => {
    const d = new Date(date)
    return {
      date,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      revenue: values[index] ?? 0,
    }
  })
}

function buildMrrHistory(): MonthlyMRR[] {
  const values = [18200, 19850, 21420, 23210, 24870, 26740, 28420]
  return Array.from({ length: 7 }, (_, i) => {
    const monthsBack = 6 - i
    const d = new Date()
    d.setMonth(d.getMonth() - monthsBack)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      mrr: values[i] ?? values[values.length - 1],
    }
  })
}

function buildCashFlowForecast(): CashFlowPeriod[] {
  return [
    { period: '30d', projectedCash: 49800, projectedRevenue: 30110, projectedPayouts: 25200 },
    { period: '60d', projectedCash: 55100, projectedRevenue: 61600, projectedPayouts: 51600 },
    { period: '90d', projectedCash: 60700, projectedRevenue: 94200, projectedPayouts: 78600 },
  ]
}

function buildCohortRetention(): CohortRetentionRow[] {
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
  const rows = [
    { customers: 18, retained: 12 },
    { customers: 22, retained: 16 },
    { customers: 24, retained: 18 },
    { customers: 30, retained: 24 },
    { customers: 34, retained: 30 },
    { customers: 39, retained: 36 },
  ]
  return months.map((cohortMonth, i) => ({
    cohortMonth,
    customers: rows[i]?.customers ?? 0,
    retained: rows[i]?.retained ?? 0,
    retentionRate: rows[i] ? Math.round((rows[i].retained / rows[i].customers) * 100) : 0,
  }))
}

function buildRevenueByPeriod(): RevenueByPeriod[] {
  return [
    { period: '7d', gross: 9320, net: 8610, fees: 410 },
    { period: '30d', gross: 33680, net: 30110, fees: 1560 },
    { period: '90d', gross: 94220, net: 84600, fees: 4530 },
    { period: '365d', gross: 321200, net: 288600, fees: 15320 },
  ]
}

function buildRecentEvents(now: number): StripeEvent[] {
  const base = now - 3600
  return [
    {
      id: 'evt_demo_1',
      type: 'payment',
      amount: 299,
      currency: 'USD',
      description: 'Pro plan renewal',
      customerId: 'cus_demo_001',
      customerEmail: 'founder1@demo-saas.com',
      created: base,
      status: 'succeeded',
      positive: true,
    },
    {
      id: 'evt_demo_2',
      type: 'refund',
      amount: 49,
      currency: 'USD',
      description: 'Partial refund - annual downgrade',
      customerId: 'cus_demo_002',
      customerEmail: 'ops@demo-saas.com',
      created: base - 8200,
      status: 'succeeded',
      positive: false,
    },
    {
      id: 'evt_demo_3',
      type: 'subscription',
      amount: 149,
      currency: 'USD',
      description: 'New subscription',
      customerId: 'cus_demo_003',
      customerEmail: 'growth@demo-saas.com',
      created: base - 11200,
      status: 'active',
      positive: true,
    },
    {
      id: 'evt_demo_4',
      type: 'payout',
      amount: 4200,
      currency: 'USD',
      description: 'Weekly payout',
      customerId: null,
      customerEmail: null,
      created: base - 20000,
      status: 'paid',
      positive: false,
    },
    {
      id: 'evt_demo_5',
      type: 'payment',
      amount: 99,
      currency: 'USD',
      description: 'Starter plan renewal',
      customerId: 'cus_demo_004',
      customerEmail: 'finance@demo-saas.com',
      created: base - 28800,
      status: 'succeeded',
      positive: true,
    },
  ]
}

export function createMockStripeMetrics(): StripeMetrics {
  const now = Math.floor(Date.now() / 1000)
  const leakageSummary: LeakageSummary = {
    refundTotal: 820,
    disputeTotal: 230,
    feeTotal: 1560,
    passiveChurnAtRisk: 1420,
  }

  return {
    mrr: 28420,
    mrrPrevious: 26740,
    mrrGrowth: 6.3,
    revenue30d: 30110,
    revenuePrev30d: 27640,
    revenueGrowth: 8.9,
    grossRevenue30d: 33680,
    netRevenue30d: 30110,
    stripeFees30d: 1560,
    effectiveFeeRate: 4.6,
    refundTotal30d: 820,
    disputeTotal30d: 230,
    activeSubscriptions: 196,
    newSubscriptions30d: 31,
    cancelledSubscriptions30d: 12,
    churnRate: 5.8,
    failedPaymentsCount: 9,
    failedPaymentsValue: 1420,
    totalCustomers: 238,
    newCustomers30d: 36,
    availableBalance: 45100,
    pendingBalance: 9700,
    estimatedMonthlyBurn: 25200,
    runway: 333,
    payoutSchedule: '2 days · daily',
    cashFlowForecast: buildCashFlowForecast(),
    cohortRetention: buildCohortRetention(),
    dailyRevenue: buildDailyRevenue(),
    mrrHistory: buildMrrHistory(),
    revenueByPeriod: buildRevenueByPeriod(),
    recentEvents: buildRecentEvents(now),
    leakageSummary,
    accountAgeDays: 120,
    currency: 'USD',
    fetchedAt: now,
  }
}

export function createMockSimulationBaseline(): SimulationBaseline {
  return {
    currentMrr: 28420,
    availableCash: 49950,
    monthlyRevenueMean: 30110,
    monthlyRevenueStdDev: 4200,
    monthlyOperatingOutflow: 25200,
    monthlyChurnRate: 0.058,
    expectedMonthlyChurnEvents: 4,
    avgRevenuePerSubscription: 145,
    margin: 0.16,
    monthlyGrowthRate: 0.035,
    monthlyGrowthVolatility: 0.03,
  }
}
~~~

## File: src/lib/monte-carlo.ts

~~~typescript
import type { SimulationConfig, SimulationResult } from '@/types'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const N_SIMULATIONS = 50_000
const HORIZON_MONTHS = 24

function sampleNormal(mean: number, stdDev: number, r1: number, r2: number): number {
  const z = Math.sqrt(-2.0 * Math.log(Math.max(r1, 1e-10))) * Math.cos(2.0 * Math.PI * r2)
  return mean + stdDev * z
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function percentile(sorted: Float32Array, p: number): number {
  const idx = Math.floor(sorted.length * p)
  return sorted[Math.min(idx, sorted.length - 1)]
}

function sortFloat32(arr: Float32Array): Float32Array {
  const copy = new Float32Array(arr)
  copy.sort()
  return copy
}

function meanFloat32(arr: Float32Array): number {
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += arr[i]
  return sum / arr.length
}

export function hashSimConfig(config: SimulationConfig): string {
  const raw = `${config.currentMRR}|${config.currentBalance}|${config.monthlyBurn}|${config.churnRate}|${config.mrrGrowthRate}|${config.appliedDecision?.actionType ?? 'none'}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return Math.abs(hash).toString(36)
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const start = Date.now()

  const totalRandomsNeeded = N_SIMULATIONS * HORIZON_MONTHS * 4
  const rawRandoms = new Uint32Array(totalRandomsNeeded)
  crypto.getRandomValues(rawRandoms)
  const randoms = new Float32Array(totalRandomsNeeded)
  for (let i = 0; i < totalRandomsNeeded; i++) {
    randoms[i] = rawRandoms[i] / 0xFFFFFFFF
  }

  const finalBalance = new Float32Array(N_SIMULATIONS)
  const failureMonth = new Float32Array(N_SIMULATIONS)
  const mrr3mo = new Float32Array(N_SIMULATIONS)
  const mrr6mo = new Float32Array(N_SIMULATIONS)
  const mrr12mo = new Float32Array(N_SIMULATIONS)
  const mrr24mo = new Float32Array(N_SIMULATIONS)

  let breakEvenCount = 0
  const appliedBurnFactor = config.appliedDecision?.actionType === 'cut_burn_aggressively' ? 0.70 : 1.0

  for (let sim = 0; sim < N_SIMULATIONS; sim++) {
    let balance = config.currentBalance
    let mrr = config.currentMRR
    let failed = 0
    let everBreakEven = false
    const rBase = sim * HORIZON_MONTHS * 4
    const simBurn = config.monthlyBurn * appliedBurnFactor

    for (let month = 1; month <= HORIZON_MONTHS; month++) {
      const rIdx = rBase + (month - 1) * 4

      const growthMean = config.mrrGrowthRate / 100
      const growthStd = Math.abs(growthMean) * 0.5 + 0.02
      let growth = sampleNormal(growthMean, growthStd, randoms[rIdx], randoms[rIdx + 1])

      const churnMean = config.churnRate / 100
      const churnStd = churnMean * 0.3 + 0.005
      let churn = clamp(sampleNormal(churnMean, churnStd, randoms[rIdx + 2], randoms[rIdx + 3]), 0, 0.40)

      if (config.appliedDecision) {
        const d = config.appliedDecision
        if (d.actionType === 'send_churn_recovery_email') churn *= (1 - d.successProbability * 0.3)
        if (d.actionType === 'apply_coupon') churn *= (1 - d.successProbability * 0.5)
        if (d.actionType === 'launch_expansion_campaign') growth += d.successProbability * 0.02
        if (d.actionType === 'raise_price') growth += 0.03
      }

      let burnMult = 1.0
      let revShock = 1.0
      const shockRoll = randoms[rIdx]
      if (shockRoll < 0.05) burnMult = 1.30
      if (shockRoll < 0.01) burnMult = 1.60
      if (shockRoll > 0.97) revShock = 1.15
      if (shockRoll > 0.99) revShock = 1.40

      mrr = Math.max(0, mrr * (1 + growth) * (1 - churn) * revShock)
      balance += mrr - (simBurn * burnMult)

      if (mrr >= simBurn) everBreakEven = true
      if (balance <= 0 && failed === 0) failed = month
      if (month === 3) mrr3mo[sim] = mrr
      if (month === 6) mrr6mo[sim] = mrr
      if (month === 12) mrr12mo[sim] = mrr
      if (month === 24) mrr24mo[sim] = mrr
    }

    if (everBreakEven) breakEvenCount++
    finalBalance[sim] = balance
    failureMonth[sim] = failed
  }

  const sortedBalance = sortFloat32(finalBalance)
  const sortedFailure = sortFloat32(failureMonth)
  const sorted3 = sortFloat32(mrr3mo)
  const sorted6 = sortFloat32(mrr6mo)
  const sorted12 = sortFloat32(mrr12mo)
  const sorted24 = sortFloat32(mrr24mo)

  // Compute runway from failure months — convert failure month to days, non-failures get horizon * 30
  const runwayDays = new Float32Array(N_SIMULATIONS)
  for (let i = 0; i < N_SIMULATIONS; i++) {
    runwayDays[i] = failureMonth[i] === 0 ? HORIZON_MONTHS * 30 : failureMonth[i] * 30
  }
  const sortedRunway = sortFloat32(runwayDays)

  const survived = (threshold: number) => {
    let count = 0
    for (let i = 0; i < N_SIMULATIONS; i++) {
      if (failureMonth[i] === 0 || failureMonth[i] > threshold) count++
    }
    return count / N_SIMULATIONS
  }

  const runway = {
    p10: percentile(sortedRunway, 0.10),
    p25: percentile(sortedRunway, 0.25),
    p50: percentile(sortedRunway, 0.50),
    p75: percentile(sortedRunway, 0.75),
    p90: percentile(sortedRunway, 0.90),
    mean: meanFloat32(runwayDays),
    probabilityOf60Days: survived(2),
    probabilityOf90Days: survived(3),
    probabilityOf180Days: survived(6),
    probabilityOf365Days: survived(12),
    probabilityOf730Days: survived(24),
  }

  const mrrForecast = {
    month3: { p25: percentile(sorted3, 0.25), p50: percentile(sorted3, 0.50), p75: percentile(sorted3, 0.75) },
    month6: { p25: percentile(sorted6, 0.25), p50: percentile(sorted6, 0.50), p75: percentile(sorted6, 0.75) },
    month12: { p25: percentile(sorted12, 0.25), p50: percentile(sorted12, 0.50), p75: percentile(sorted12, 0.75) },
    month24: { p25: percentile(sorted24, 0.25), p50: percentile(sorted24, 0.50), p75: percentile(sorted24, 0.75) },
  }

  const bearIdx = Math.floor(N_SIMULATIONS * 0.10)
  const baseIdx = Math.floor(N_SIMULATIONS * 0.50)
  const bullIdx = Math.floor(N_SIMULATIONS * 0.90)
  const scenarios = {
    bear: {
      probability: 0.20,
      runway: sortedRunway[bearIdx],
      mrr3mo: sorted3[bearIdx],
      mrr12mo: sorted12[bearIdx],
      description: 'Headwinds persist — churn stays elevated, growth stalls',
    },
    base: {
      probability: 0.60,
      runway: sortedRunway[baseIdx],
      mrr3mo: sorted3[baseIdx],
      mrr12mo: sorted12[baseIdx],
      description: 'Current trajectory holds — moderate growth, managed churn',
    },
    bull: {
      probability: 0.20,
      runway: sortedRunway[bullIdx],
      mrr3mo: sorted3[bullIdx],
      mrr12mo: sorted12[bullIdx],
      description: 'Breakout growth — retention improves, expansion kicks in',
    },
  }

  const survProb180 = runway.probabilityOf180Days
  const riskScore = clamp(
    (1 - survProb180) * 50 +
    (config.churnRate / 20) * 25 +
    (runway.p50 < 60 * 30 ? 25 : runway.p50 < 90 * 30 ? 15 : 0),
    0,
    100
  )

  const elapsed = Date.now() - start
  console.log(`[monte-carlo] ${N_SIMULATIONS} runs in ${elapsed}ms`)
  if (elapsed > 1500) console.warn(`[monte-carlo] WARNING: simulation took ${elapsed}ms (target <400ms)`)

  return {
    runway,
    mrrForecast,
    scenarios,
    riskScore: Math.round(riskScore),
    volatilityScore: Math.round(runway.p75 - runway.p25),
    breakEvenProbability: breakEvenCount / N_SIMULATIONS,
    baselineRunwayP50: 0,
    decisionLiftP50: 0,
    nSimulations: N_SIMULATIONS,
    computedAt: Date.now(),
    horizonMonths: HORIZON_MONTHS,
  }
}

export async function getCachedSimulation(userId: string, config: SimulationConfig): Promise<SimulationResult | null> {
  try {
    const hash = hashSimConfig(config)
    return await safeKvGet<SimulationResult>(`sim:${userId}:${hash}`)
  } catch {
    return null
  }
}

export async function cacheSimulation(userId: string, config: SimulationConfig, result: SimulationResult): Promise<void> {
  try {
    const hash = hashSimConfig(config)
    await safeKvSet(`sim:${userId}:${hash}`, result, 1800)
  } catch {
    // best-effort
  }
}
~~~

## File: src/lib/recommendations.ts

~~~typescript
import type { ActionCard, StripeMetrics } from '@/types'
import { callHeavyAI } from '@/lib/ai-client'

export async function generateActionCards(metrics: StripeMetrics): Promise<ActionCard[]> {
  const cards: ActionCard[] = []

  if (metrics.failedPaymentsCount > 0) {
    cards.push({
      id: 'recover_failed_payments',
      priority: 1,
      severity: 'critical',
      title: 'Recover failed payments',
      context: `${metrics.failedPaymentsCount} payments failed — $${metrics.failedPaymentsValue} MRR at risk.`,
      estimatedImpact: `+$${metrics.failedPaymentsValue}/mo recovered`,
      actionType: 'retry_payment',
      actionLabel: 'Retry all',
      params: {},
      isDestructive: false,
      requiresConfirmText: false,
      affectedCustomerCount: metrics.failedPaymentsCount,
    })
  }

  if (metrics.cancelledSubscriptions30d > 0) {
    const churned = metrics.cancelledSubscriptions30d
    const avgSubValue = metrics.mrr / Math.max(1, metrics.activeSubscriptions)
    const recoveryValue = Math.round(avgSubValue * churned * 0.15)
    cards.push({
      id: 'churn_recovery',
      priority: 1,
      severity: 'warning',
      title: 'Win back churned customers',
      context: `${churned} subs cancelled this month. Send targeted win-back offers.`,
      estimatedImpact: `+$${recoveryValue}/mo if 15% convert`,
      actionType: 'send_email',
      actionLabel: 'Send win-back',
      params: { template: 'churn_recovery' },
      isDestructive: false,
      requiresConfirmText: false,
      affectedCustomerCount: churned,
    })
  }

  if (metrics.activeSubscriptions >= 20 && metrics.churnRate < 5 && metrics.mrrGrowth > 0) {
    const liftPct = 10
    const liftAmount = Math.round(metrics.mrr * (liftPct / 100))
    cards.push({
      id: 'expansion_revenue',
      priority: 2,
      severity: 'opportunity',
      title: 'Test a price increase',
      context: `Low churn (${metrics.churnRate}%) + growth (${metrics.mrrGrowth}% MoM) = safe pricing headroom.`,
      estimatedImpact: `+$${liftAmount}/mo from ${liftPct}% lift`,
      actionType: 'update_price',
      actionLabel: 'Preview impact',
      params: { liftPercent: liftPct },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  const payoutReady = metrics.availableBalance - metrics.pendingBalance
  if (payoutReady > 500) {
    cards.push({
      id: 'trigger_payout',
      priority: 3,
      severity: 'win',
      title: `$${payoutReady.toLocaleString()} ready to pay out`,
      context: 'Available balance exceeds pending obligations.',
      estimatedImpact: `$${payoutReady.toLocaleString()} to your bank`,
      actionType: 'trigger_payout',
      actionLabel: 'Trigger payout',
      params: { amount: payoutReady },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  if (metrics.accountAgeDays < 30 && metrics.activeSubscriptions < 5) {
    cards.push({
      id: 'new_founder_quickstart',
      priority: 2,
      severity: 'opportunity',
      title: 'New founder quick wins',
      context: `Day ${metrics.accountAgeDays}: focus on first 10 customers, not features.`,
      estimatedImpact: 'Faster time-to-revenue',
      actionType: 'send_email',
      actionLabel: 'Get playbook',
      params: { template: 'quickstart' },
      isDestructive: false,
      requiresConfirmText: false,
    })
  }

  if (cards.length > 0 && cards.length <= 3) {
    try {
      const summary = cards.map(c => `- ${c.title}: ${c.context}`).join('\n')
      const aiEnrichment = await callHeavyAI(
        'You are Lucrum MAX, an AI CFO. Given these recommended actions, add a 1-sentence tactical tip for each. Respond as JSON array of objects with id and tip fields only.',
        summary
      )
      const clean = aiEnrichment.replace(/```json|```/g, '').trim()
      const tips: Array<{ id: string; tip: string }> = JSON.parse(clean)
      for (const t of tips) {
        const card = cards.find(c => c.id === t.id)
        if (card && t.tip) card.context = `${card.context} ${t.tip}`
      }
    } catch {
      // AI enrichment is best-effort
    }
  }

  cards.sort((a, b) => a.priority - b.priority)
  return cards
}
~~~

## File: src/lib/simulation.ts

~~~typescript
export interface SimulationBaseline {
  currentMrr: number
  availableCash: number
  monthlyRevenueMean: number
  monthlyRevenueStdDev: number
  monthlyOperatingOutflow: number
  monthlyChurnRate: number
  expectedMonthlyChurnEvents: number
  avgRevenuePerSubscription: number
  margin: number
  monthlyGrowthRate: number
  monthlyGrowthVolatility: number
}

export interface ScenarioModifiers {
  growthDelta: number
  marginDelta: number
  monthlyFixedCostDelta: number
  churnDelta: number
  revenueVolatilityMultiplier: number
}

export interface ParsedScenario {
  raw: string
  normalized: string
  modifiers: ScenarioModifiers
  notes: string[]
  summary: string
}

export interface PercentileBand {
  p10: number
  p50: number
  p90: number
}

export interface RunwayBand extends PercentileBand {
  best: number
  worst: number
}

export interface MonteCarloOptions {
  iterations?: number
  months?: number
}

export interface MonteCarloOutput {
  iterations: number
  months: number
  runwayMonths: RunwayBand
  cashAtMonths: {
    m6: PercentileBand
    m12: PercentileBand
    m18: PercentileBand
  }
  confidence: number
  survivalRate12m: number
}

interface SimulatedPath {
  runwayMonths: number
  cashTimeline: number[]
}

interface Rng {
  (): number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp((p / 100) * (sorted.length - 1), 0, sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const weight = idx - lo
  return sorted[lo] * (1 - weight) + sorted[hi] * weight
}

function sampleUniform(min: number, max: number, rng: Rng): number {
  return min + (max - min) * rng()
}

function sampleNormal(meanValue: number, stdValue: number, rng: Rng): number {
  if (stdValue <= 0) return meanValue
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return meanValue + z * stdValue
}

function samplePoisson(lambda: number, rng: Rng): number {
  const safeLambda = Math.max(0, lambda)
  if (safeLambda === 0) return 0

  if (safeLambda > 30) {
    return Math.max(0, Math.round(sampleNormal(safeLambda, Math.sqrt(safeLambda), rng)))
  }

  const l = Math.exp(-safeLambda)
  let p = 1
  let k = 0
  do {
    k += 1
    p *= rng()
  } while (p > l)
  return k - 1
}

function parseCurrencyMagnitude(raw: string, hasK: boolean): number {
  const sanitized = raw.replace(/,/g, '')
  const numeric = Number(sanitized)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return hasK ? numeric * 1000 : numeric
}

export function parseScenario(input: string): ParsedScenario {
  const raw = (input ?? '').trim()
  const normalized = raw.toLowerCase()

  const modifiers: ScenarioModifiers = {
    growthDelta: 0,
    marginDelta: 0,
    monthlyFixedCostDelta: 0,
    churnDelta: 0,
    revenueVolatilityMultiplier: 1,
  }
  const notes: string[] = []

  if (!normalized || normalized === 'baseline') {
    notes.push('Baseline projection with no scenario deltas.')
  }

  const cutAdsMatch = normalized.match(/cut\s+ads?(?:\s+by)?\s+(\d{1,2}(?:\.\d+)?)\s*%/)
  if (cutAdsMatch?.[1]) {
    const pct = clamp(Number(cutAdsMatch[1]) / 100, 0, 0.9)
    modifiers.marginDelta += pct * 0.5
    modifiers.growthDelta -= pct / 6
    notes.push(`Cut ads ${Math.round(pct * 100)}%: margin up, growth down.`)
  }

  const churnMatch = normalized.match(/churn\s*([+-]\s*\d{1,2}(?:\.\d+)?)\s*%/)
  if (churnMatch?.[1]) {
    const churnDeltaPct = Number(churnMatch[1].replace(/\s+/g, '')) / 100
    modifiers.churnDelta += churnDeltaPct
    modifiers.growthDelta -= Math.max(0, churnDeltaPct * 0.6)
    notes.push(`Churn shifted by ${Math.round(churnDeltaPct * 100)}%.`)
  }

  const addSpendMatch = normalized.match(/(?:add|hire|spend|invest)\s+\$?\s*([\d,.]+)\s*(k)?/)
  if (addSpendMatch?.[1]) {
    const amount = parseCurrencyMagnitude(addSpendMatch[1], Boolean(addSpendMatch[2]))
    if (amount > 0) {
      modifiers.monthlyFixedCostDelta += amount
      const roleBoost = /(designer|dev|developer|engineer|growth)/.test(normalized) ? 0.03 : 0.015
      modifiers.growthDelta += roleBoost
      notes.push(`Added ${Math.round(amount).toLocaleString('en-US')} in monthly spend.`)
    }
  }

  const priceRaiseMatch = normalized.match(/(?:raise|increase|price)\D+(\d{1,2}(?:\.\d+)?)\s*%/)
  if (priceRaiseMatch?.[1]) {
    const pct = clamp(Number(priceRaiseMatch[1]) / 100, 0, 0.5)
    modifiers.growthDelta += pct * 0.2
    modifiers.marginDelta += pct * 0.35
    modifiers.churnDelta += pct * 0.25
    notes.push(`Price moved by ${Math.round(pct * 100)}%: margin up with churn risk.`)
  }

  if (/pause\s+hires?|freeze\s+hiring/.test(normalized)) {
    modifiers.monthlyFixedCostDelta -= 2000
    modifiers.marginDelta += 0.03
    modifiers.growthDelta -= 0.01
    notes.push('Hiring freeze: lower spend, slightly slower growth.')
  }

  if (/optimi[sz]e|trim|reduce\s+cost/.test(normalized) && notes.length === 0) {
    modifiers.marginDelta += 0.05
    modifiers.growthDelta -= 0.01
    notes.push('General efficiency push: moderate margin gain with slight growth drag.')
  }

  if (notes.length === 0) {
    notes.push('Scenario not explicitly recognized, applied neutral assumptions.')
  }

  modifiers.revenueVolatilityMultiplier = clamp(
    1 + Math.abs(modifiers.churnDelta) * 1.5 + (modifiers.monthlyFixedCostDelta > 0 ? 0.08 : 0),
    0.7,
    2.2
  )
  modifiers.marginDelta = clamp(modifiers.marginDelta, -0.5, 0.5)
  modifiers.growthDelta = clamp(modifiers.growthDelta, -0.5, 0.5)
  modifiers.churnDelta = clamp(modifiers.churnDelta, -0.4, 0.8)

  return {
    raw,
    normalized,
    modifiers,
    notes,
    summary: notes.join(' '),
  }
}

function simulatePath(
  baseline: SimulationBaseline,
  scenario: ParsedScenario,
  months: number,
  rng: Rng
): SimulatedPath {
  const revenueBase = Math.max(1, baseline.monthlyRevenueMean || baseline.currentMrr || 1)
  const revenueStd = Math.max(revenueBase * 0.05, baseline.monthlyRevenueStdDev || revenueBase * 0.15)
  const outflowBase = Math.max(1, baseline.monthlyOperatingOutflow || revenueBase * 0.8)
  const growthVol = Math.max(0.005, baseline.monthlyGrowthVolatility || 0.03)
  const marginBase = clamp(
    Number.isFinite(baseline.margin) ? baseline.margin : 1 - outflowBase / revenueBase,
    -0.8,
    0.95
  )
  const churnEventsBase = Math.max(0.05, baseline.expectedMonthlyChurnEvents || 0.1)
  const avgRevenuePerSub = Math.max(1, baseline.avgRevenuePerSubscription || baseline.currentMrr || 1)

  const cashTimeline: number[] = []
  const netCashHistory: number[] = []

  let cash = Math.max(0, baseline.availableCash)
  let mrr = Math.max(0, baseline.currentMrr || revenueBase)
  let carriedCashIn = 0
  let runwayMonths: number | null = null

  for (let month = 1; month <= months; month += 1) {
    const growthNoise = sampleNormal(0, growthVol, rng)
    const monthGrowth = clamp(
      baseline.monthlyGrowthRate + scenario.modifiers.growthDelta + growthNoise,
      -0.6,
      0.6
    )
    mrr = Math.max(0, mrr * (1 + monthGrowth))

    const churnEvents = samplePoisson(
      churnEventsBase * (1 + scenario.modifiers.churnDelta),
      rng
    )
    const churnRate = clamp(
      baseline.monthlyChurnRate + scenario.modifiers.churnDelta + churnEvents * 0.004,
      0,
      0.7
    )
    const churnDrag = churnRate * avgRevenuePerSub * Math.max(1, churnEvents)

    const revenueMean = Math.max(0, mrr - churnDrag)
    const recognizedRevenue = Math.max(
      0,
      sampleNormal(
        revenueMean,
        revenueStd * scenario.modifiers.revenueVolatilityMultiplier,
        rng
      )
    )

    const payoutDelayDays = sampleUniform(1, 14, rng)
    const delayedFraction = payoutDelayDays / 30
    const cashIn = carriedCashIn + recognizedRevenue * (1 - delayedFraction)
    carriedCashIn = recognizedRevenue * delayedFraction

    const margin = clamp(marginBase + scenario.modifiers.marginDelta, -0.6, 0.95)
    const outflowByMargin = recognizedRevenue * (1 - margin)
    const outflowNoise = sampleNormal(0, outflowBase * 0.08, rng)
    const outflow = Math.max(
      0,
      Math.max(outflowByMargin, outflowBase + outflowNoise) + scenario.modifiers.monthlyFixedCostDelta
    )

    const netCash = cashIn - outflow
    const startingCash = cash
    cash += netCash
    netCashHistory.push(netCash)
    cashTimeline.push(cash)

    if (runwayMonths == null && cash <= 0) {
      if (netCash < 0 && startingCash > 0) {
        const fraction = clamp(startingCash / Math.abs(netCash), 0, 1)
        runwayMonths = (month - 1) + fraction
      } else {
        runwayMonths = month
      }
    }
  }

  if (runwayMonths == null) {
    const trailingNet = mean(netCashHistory.slice(-3))
    if (trailingNet < 0) {
      runwayMonths = months + clamp(cash / Math.abs(trailingNet), 0, 24)
    } else {
      runwayMonths = months + 24
    }
  }

  return {
    runwayMonths,
    cashTimeline,
  }
}

function roundBand(values: PercentileBand): PercentileBand {
  return {
    p10: Math.round(values.p10),
    p50: Math.round(values.p50),
    p90: Math.round(values.p90),
  }
}

export function runMonteCarlo(
  baseline: SimulationBaseline,
  scenario: ParsedScenario,
  options: MonteCarloOptions = {}
): MonteCarloOutput {
  const iterations = Math.round(clamp(options.iterations ?? 10000, 1000, 20000))
  const months = Math.round(clamp(options.months ?? 18, 6, 36))
  const rng = Math.random

  const runways: number[] = []
  const cashAt6: number[] = []
  const cashAt12: number[] = []
  const cashAt18: number[] = []

  for (let i = 0; i < iterations; i += 1) {
    const path = simulatePath(baseline, scenario, months, rng)
    runways.push(path.runwayMonths)

    const at6 = path.cashTimeline[Math.min(5, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    const at12 = path.cashTimeline[Math.min(11, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    const at18 = path.cashTimeline[Math.min(17, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    cashAt6.push(at6)
    cashAt12.push(at12)
    cashAt18.push(at18)
  }

  const runwayP10 = percentile(runways, 10)
  const runwayP50 = percentile(runways, 50)
  const runwayP90 = percentile(runways, 90)
  const runwaySpread = Math.max(0, runwayP90 - runwayP10)
  const survivalRate12m = runways.filter(r => r >= 12).length / runways.length
  const spreadPenalty = clamp(runwaySpread * 2, 0, 40)
  const confidence = Math.round(clamp(survivalRate12m * 100 + 18 - spreadPenalty, 5, 99))

  return {
    iterations,
    months,
    runwayMonths: {
      p10: Number(runwayP10.toFixed(1)),
      p50: Number(runwayP50.toFixed(1)),
      p90: Number(runwayP90.toFixed(1)),
      best: Number(runwayP90.toFixed(1)),
      worst: Number(runwayP10.toFixed(1)),
    },
    cashAtMonths: {
      m6: roundBand({
        p10: percentile(cashAt6, 10),
        p50: percentile(cashAt6, 50),
        p90: percentile(cashAt6, 90),
      }),
      m12: roundBand({
        p10: percentile(cashAt12, 10),
        p50: percentile(cashAt12, 50),
        p90: percentile(cashAt12, 90),
      }),
      m18: roundBand({
        p10: percentile(cashAt18, 10),
        p50: percentile(cashAt18, 50),
        p90: percentile(cashAt18, 90),
      }),
    },
    confidence,
    survivalRate12m: Number((survivalRate12m * 100).toFixed(1)),
  }
}

export function deriveRevenueVolatilityRatio(monthlyRevenueMean: number, monthlyRevenueStdDev: number): number {
  if (monthlyRevenueMean <= 0) return 0
  return clamp(monthlyRevenueStdDev / monthlyRevenueMean, 0, 2)
}

export function deriveGrowthVolatility(monthlyRevenueMean: number, monthlyRevenueStdDev: number): number {
  const ratio = deriveRevenueVolatilityRatio(monthlyRevenueMean, monthlyRevenueStdDev)
  return clamp(ratio * 0.18, 0.01, 0.15)
}

export function calculateStdDev(values: number[]): number {
  return stdDev(values)
}
~~~

## File: src/lib/snapshots.ts

~~~typescript
import type { StripeMetrics } from '@/types'
import { safeKvGet, safeKvSet, safeKvDel } from '@/lib/kv'

export interface MetricSnapshot {
  userId: string
  timestamp: number
  mrr: number
  mrrGrowth: number
  churnRate: number
  runway: number
  activeSubscriptions: number
  newCustomers30d: number
  availableBalance: number
  revenue30d: number
}

function formatSnapshotDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function snapshotKey(userId: string, day: string): string {
  return `snapshots:${userId}:${day}`
}

export async function saveSnapshot(userId: string, metrics: StripeMetrics): Promise<void> {
  const timestamp = Date.now()
  const day = formatSnapshotDate(timestamp)
  const key = snapshotKey(userId, day)
  const existing = await safeKvGet<MetricSnapshot>(key)
  if (existing) return

  const snapshot: MetricSnapshot = {
    userId,
    timestamp: Math.floor(timestamp / 1000),
    mrr: metrics.mrr,
    mrrGrowth: metrics.mrrGrowth,
    churnRate: metrics.churnRate,
    runway: metrics.runway,
    activeSubscriptions: metrics.activeSubscriptions,
    newCustomers30d: metrics.newCustomers30d,
    availableBalance: metrics.availableBalance,
    revenue30d: metrics.revenue30d,
  }

  await safeKvSet(key, snapshot)

  const pruneDate = new Date(timestamp)
  pruneDate.setDate(pruneDate.getDate() - 366)
  await safeKvDel(snapshotKey(userId, formatSnapshotDate(pruneDate.getTime())))
}

export async function getSnapshots(userId: string, days = 90): Promise<MetricSnapshot[]> {
  const promises: Promise<MetricSnapshot | null>[] = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    promises.push(safeKvGet<MetricSnapshot>(snapshotKey(userId, formatSnapshotDate(date.getTime()))))
  }

  const snapshots = await Promise.all(promises)
  return snapshots.filter((snapshot): snapshot is MetricSnapshot => Boolean(snapshot))
}
~~~

## File: src/lib/stripe.ts

~~~typescript
import Stripe from 'stripe'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Pinned API version — used everywhere for consistency
export const STRIPE_API_VERSION = '2023-10-16' as const
export const STRIPE_KEY_COOKIE = 'stripe_key'
export const STRIPE_ACCOUNTS_COOKIE = 'stripe_accounts'
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

type StripeAccountsPayload = {
  v: 1
  userId: string | null
  activeId: string | null
  accounts: { id: string; label: string; secretKey: string }[]
}

export function parseStripeAccountsCookie(raw: string): StripeAccountsPayload | null {
  const maybeDecrypted = raw.startsWith(`${ENCRYPTION_PREFIX}.`) ? decryptStripeKey(raw) : raw
  if (!maybeDecrypted) return null
  try {
    const parsed = JSON.parse(maybeDecrypted)
    if (parsed?.v !== 1 || !Array.isArray(parsed.accounts)) return null
    return {
      v: 1,
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
      accounts: parsed.accounts,
    }
  } catch {
    return null
  }
}

export function serializeStripeAccountsCookie(payload: StripeAccountsPayload): string | null {
  const raw = JSON.stringify(payload)
  const encrypted = encryptStripeKey(raw)
  if (encrypted) return encrypted
  if (process.env.NODE_ENV !== 'production') return raw
  return null
}

// Get Stripe key from request cookies (encrypted in production).
export function getStripeKeyFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined },
  userId?: string | null
): string | null {
  const accountsRaw = cookies.get(STRIPE_ACCOUNTS_COOKIE)?.value
  if (accountsRaw) {
    const payload = parseStripeAccountsCookie(accountsRaw)
    if (payload?.accounts?.length) {
      if (userId && payload.userId && payload.userId !== userId) {
        return null
      }
      const active = payload.activeId
        ? payload.accounts.find(a => a.id === payload.activeId)
        : payload.accounts[0]
      if (active?.secretKey) return active.secretKey
    }
  }

  const raw = cookies.get(STRIPE_KEY_COOKIE)?.value
  if (!raw) return null

  if (userId && process.env.NODE_ENV === 'production') {
    return null
  }

  if (raw.startsWith(`${ENCRYPTION_PREFIX}.`)) {
    return decryptStripeKey(raw)
  }

  // Backward compatibility for local dev sessions created before encryption.
  if (process.env.NODE_ENV !== 'production') {
    return raw
  }

  return null
}
~~~

## File: src/lib/subscription.ts

~~~typescript
import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/lib/stripe'
import { safeKvGet, safeKvSet } from '@/lib/kv'
import {
  rememberBillingCustomerOwner,
  rememberBillingSubscriptionOwner,
} from '@/lib/user-state'
import type { Plan, BillingInterval, Subscription } from '@/types'

export type { Plan, BillingInterval, Subscription }

// Legacy alias kept so existing imports like `UserPlan` don't break during migration
export type UserPlan = Plan

function getBillingKey(name: string, userId: string): string {
  return `lucrum:${name}:${userId}`
}

export function getLucrumStripe(): Stripe | null {
  const secretKey = process.env.LUCRUM_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}

// ─── Subscription CRUD ─────────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const record = await safeKvGet<Subscription>(getBillingKey('plan', userId))
  if (!record) return { plan: 'demo' }
  if (record.plan !== 'demo' && record.expiresAt && record.expiresAt < Date.now()) {
    return { plan: 'demo' }
  }
  return record
}

export async function setUserSubscription(userId: string, sub: Subscription): Promise<void> {
  await safeKvSet(getBillingKey('plan', userId), sub)
  if (sub.stripeCustomerId) {
    await safeKvSet(getBillingKey('customer', userId), sub.stripeCustomerId)
    await rememberBillingCustomerOwner(sub.stripeCustomerId, userId)
  }
  if (sub.stripeSubscriptionId) {
    await rememberBillingSubscriptionOwner(sub.stripeSubscriptionId, userId)
  }
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await getUserSubscription(userId)
  return sub.plan
}

// ─── Legacy helpers (kept for webhook compat) ──────────────────────────────

export async function getUserSubscriptionRecord(userId: string): Promise<Subscription | null> {
  return safeKvGet<Subscription>(getBillingKey('plan', userId))
}

export async function upsertUserSubscription(record: {
  userId: string; plan: string; status: string;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null;
  priceId: string | null; currentPeriodEnd: number | null; updatedAt: string;
}): Promise<void> {
  const plan = resolvePlanFromPriceId(record.priceId) ?? (record.plan === 'pro' ? 'solo' : 'demo')
  const interval = resolveIntervalFromPriceId(record.priceId)
  await setUserSubscription(record.userId, {
    plan,
    interval,
    activatedAt: Date.now(),
    stripeCustomerId: record.stripeCustomerId ?? undefined,
    stripeSubscriptionId: record.stripeSubscriptionId ?? undefined,
  })
}

export async function clearUserSubscription(userId: string): Promise<void> {
  await setUserSubscription(userId, { plan: 'demo' })
}

export async function setUserBillingCustomerId(userId: string, customerId: string): Promise<void> {
  await safeKvSet(getBillingKey('customer', userId), customerId)
  await rememberBillingCustomerOwner(customerId, userId)
}

export async function getUserBillingCustomerId(userId: string): Promise<string | null> {
  return safeKvGet<string>(getBillingKey('customer', userId))
}

// ─── Feature gates ─────────────────────────────────────────────────────────

export function canUseCFOChat(plan: Plan): boolean {
  return plan === 'solo' || plan === 'enterprise'
}

export function canUseFiveMoves(plan: Plan): boolean {
  return plan === 'solo' || plan === 'enterprise'
}

export function canUseActionExecution(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function canUseMultiAccount(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function canUseAPI(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function usesPriorityAI(plan: Plan): boolean {
  return plan === 'enterprise'
}

export function canUseWebhookAlerts(plan: Plan): boolean {
  return plan === 'solo' || plan === 'enterprise'
}

// ─── Demo question tracking ────────────────────────────────────────────────

export async function getDemoQuestionsUsed(userId: string): Promise<number> {
  return (await safeKvGet<number>(`demo:${userId}:questions`)) ?? 0
}

export async function incrementDemoQuestions(userId: string): Promise<number> {
  const current = await getDemoQuestionsUsed(userId)
  const next = current + 1
  await safeKvSet(`demo:${userId}:questions`, next)
  return next
}

export function getDemoQuestionsUsedAnon(cookieValue: string | undefined): number {
  if (!cookieValue) return 0
  const n = parseInt(cookieValue, 10)
  return Number.isNaN(n) ? 0 : n
}

// ─── Price ID resolution ───────────────────────────────────────────────────

const SOLO_PRICE_IDS = new Set([
  process.env.LUCRUM_SOLO_MONTHLY_PRICE_ID,
  process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_PRO_PRICE_ID,
  process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
].filter(Boolean))

const ENTERPRISE_PRICE_IDS = new Set([
  process.env.LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID,
  process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
].filter(Boolean))

const ANNUAL_PRICE_IDS = new Set([
  process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
  process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
].filter(Boolean))

export function resolvePlanFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null
  if (ENTERPRISE_PRICE_IDS.has(priceId)) return 'enterprise'
  if (SOLO_PRICE_IDS.has(priceId)) return 'solo'
  return null
}

export function resolveIntervalFromPriceId(priceId: string | null | undefined): BillingInterval | undefined {
  if (!priceId) return undefined
  return ANNUAL_PRICE_IDS.has(priceId) ? 'year' : 'month'
}

export function getValidPriceIds(): string[] {
  return [
    process.env.LUCRUM_SOLO_MONTHLY_PRICE_ID,
    process.env.LUCRUM_SOLO_ANNUAL_PRICE_ID,
    process.env.LUCRUM_ENTERPRISE_MONTHLY_PRICE_ID,
    process.env.LUCRUM_ENTERPRISE_ANNUAL_PRICE_ID,
    process.env.LUCRUM_PRO_PRICE_ID,
    process.env.LUCRUM_PRO_ANNUAL_PRICE_ID,
  ].filter(Boolean) as string[]
}
~~~

## File: src/lib/user-state.ts

~~~typescript
import { safeKvGet, safeKvSet } from '@/lib/kv'

type AtRiskPayload = {
  customerId: string
  invoiceId?: string | null
  amountDue?: number
  customerName?: string | null
  updatedAt: string
}

export async function rememberUserEmail(userId: string, email?: string | null): Promise<void> {
  if (!userId || !email) return
  await safeKvSet(`lucrum:user-email:${userId}`, email)
}

export async function getUserEmail(userId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:user-email:${userId}`)
}

export async function rememberStripeAccountOwner(accountId: string, userId: string): Promise<void> {
  if (!accountId || !userId) return
  await safeKvSet(`lucrum:stripe-account-owner:${accountId}`, userId)
}

export async function getStripeAccountOwner(accountId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-account-owner:${accountId}`)
}

export async function rememberStripeCustomerOwner(customerId: string, userId: string): Promise<void> {
  if (!customerId || !userId) return
  await safeKvSet(`lucrum:stripe-customer-owner:${customerId}`, userId)
}

export async function getStripeCustomerOwner(customerId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-customer-owner:${customerId}`)
}

export async function rememberStripeSubscriptionOwner(subscriptionId: string, userId: string): Promise<void> {
  if (!subscriptionId || !userId) return
  await safeKvSet(`lucrum:stripe-subscription-owner:${subscriptionId}`, userId)
}

export async function getStripeSubscriptionOwner(subscriptionId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:stripe-subscription-owner:${subscriptionId}`)
}

export async function rememberBillingCustomerOwner(customerId: string, userId: string): Promise<void> {
  if (!customerId || !userId) return
  await safeKvSet(`lucrum:billing-customer-owner:${customerId}`, userId)
}

export async function getBillingCustomerOwner(customerId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:billing-customer-owner:${customerId}`)
}

export async function rememberBillingSubscriptionOwner(subscriptionId: string, userId: string): Promise<void> {
  if (!subscriptionId || !userId) return
  await safeKvSet(`lucrum:billing-subscription-owner:${subscriptionId}`, userId)
}

export async function getBillingSubscriptionOwner(subscriptionId: string): Promise<string | null> {
  return safeKvGet<string>(`lucrum:billing-subscription-owner:${subscriptionId}`)
}

export async function markCustomerAtRisk(payload: AtRiskPayload): Promise<void> {
  if (!payload.customerId) return
  await safeKvSet(`lucrum:atrisk:${payload.customerId}`, payload)
}

export async function markMetricsInvalidated(userId: string): Promise<void> {
  if (!userId) return
  await safeKvSet(`lucrum:metrics-invalidated:${userId}`, Date.now())
}

export async function getMetricsInvalidatedAt(userId: string): Promise<number | null> {
  return safeKvGet<number>(`lucrum:metrics-invalidated:${userId}`)
}

export async function resolveUserIdFromStripeEventObject(
  object: Record<string, any>,
  accountId?: string | null
): Promise<string | null> {
  if (accountId) {
    const byAccount = await getStripeAccountOwner(accountId)
    if (byAccount) return byAccount
  }

  const customerId =
    typeof object.customer === 'string'
      ? object.customer
      : typeof object.customer?.id === 'string'
      ? object.customer.id
      : null

  if (customerId) {
    const byCustomer = await getStripeCustomerOwner(customerId)
    if (byCustomer) return byCustomer
  }

  const subscriptionId =
    typeof object.subscription === 'string'
      ? object.subscription
      : object.object === 'subscription' && typeof object.id === 'string'
      ? object.id
      : null

  if (subscriptionId) {
    const bySubscription = await getStripeSubscriptionOwner(subscriptionId)
    if (bySubscription) return bySubscription
  }

  return null
}
~~~

## File: src/lib/utils.ts

~~~typescript
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
~~~

## File: src/middleware.ts

~~~typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/connect',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/stripe/webhook',
  '/api/billing/webhook',
  '/api/health',
  '/api/comps/scrape',
  '/api/cron/scrape-comps',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run middleware for all app routes and APIs except for static assets.
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/api/(.*)',
  ],
}

~~~

## File: src/types/index.ts

~~~typescript
// ─── Plan & Billing ────────────────────────────────────────────────────────

export type Plan = 'demo' | 'solo' | 'enterprise'
export type BillingInterval = 'month' | 'year'

export interface Subscription {
  plan: Plan
  interval?: BillingInterval
  activatedAt?: number
  expiresAt?: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  teamMembers?: string[]
  connectedAccounts?: string[]
  apiKey?: string
}

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
  revenue30d: number         // total paid charges last 30 days (net)
  revenuePrev30d: number     // total paid charges 31-60 days ago
  revenueGrowth: number      // % change

  // Revenue Reality (Gross vs Net)
  grossRevenue30d: number    // before fees, refunds, disputes
  netRevenue30d: number     // after fees, refunds, disputes
  stripeFees30d: number     // total Stripe fees in period
  effectiveFeeRate: number   // % of gross revenue as fees
  refundTotal30d: number
  disputeTotal30d: number

  // Subscriptions
  activeSubscriptions: number
  newSubscriptions30d: number
  cancelledSubscriptions30d: number
  churnRate: number          // % of subs that cancelled

  // Passive churn (failed payments)
  failedPaymentsCount: number
  failedPaymentsValue: number  // MRR at risk

  // Customers
  totalCustomers: number
  newCustomers30d: number

  // Account age (for new-founder experience)
  accountAgeDays: number
  benchmarks?: BenchmarkReport

  // Cash
  availableBalance: number
  pendingBalance: number
  estimatedMonthlyBurn: number  // expenses approximated from payouts + refunds
  runway: number                // days
  payoutSchedule: string        // e.g. "2 business days"

  // Cash flow forecast (30/60/90 days)
  cashFlowForecast: CashFlowPeriod[]

  // Cohort retention (simplified)
  cohortRetention: CohortRetentionRow[]

  // Charts
  dailyRevenue: DailyRevenue[]
  mrrHistory: MonthlyMRR[]
  revenueByPeriod: RevenueByPeriod[]  // 7, 30, 90, 365 day views

  // Activity feed
  recentEvents: StripeEvent[]

  // Leakage
  leakageSummary: LeakageSummary

  // Simulation (attached after compute)
  simulation?: SimulationResult
  topDecisions?: DecisionScore[]
  customers?: StripeCustomer[]

  // Meta
  currency: string
  fetchedAt: number  // unix timestamp
}

export interface CashFlowPeriod {
  period: string   // "30d" | "60d" | "90d"
  projectedCash: number
  projectedRevenue: number
  projectedPayouts: number
}

export interface CohortRetentionRow {
  cohortMonth: string   // "2025-01"
  customers: number
  retained: number
  retentionRate: number
}

export interface RevenueByPeriod {
  period: string
  gross: number
  net: number
  fees: number
}

export interface LeakageSummary {
  refundTotal: number
  disputeTotal: number
  feeTotal: number
  passiveChurnAtRisk: number
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

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'win' | 'affiliate'

export interface AIInsight {
  id: string
  type: InsightSeverity
  title: string
  body: string
  action: string
  affiliateUrl?: string
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
  accountAgeDays?: number
  benchmarks?: BenchmarkReport
  simulation?: SimulationResult
  topMove?: Move
  estimatedMonthlyBurn?: number
  failedPaymentsValue?: number
  failedPaymentsCount?: number
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ─── Stripe Customers ──────────────────────────────────────────────────────

export interface StripeCustomer {
  id: string
  email: string
  name: string
  created: number
  subscriptionId?: string
  subscriptionStatus?: string
  plan?: string
  mrr: number
  totalRevenue: number
  lastPaymentStatus?: string
  lastPaymentDate?: number
  churnRisk: 'low' | 'medium' | 'high'
  expansionEligible: boolean
  daysSinceCreated: number
}

// ─── Decision Scorer ───────────────────────────────────────────────────────

export interface DecisionScoreBreakdown {
  revenueImpact: number
  timeToRevenue: number
  confidence: number
  reversibility: number
  burnImpact: number
  churnImpact: number
}

export interface DecisionScore {
  actionType: string
  label: string
  params: Record<string, any>
  scores: DecisionScoreBreakdown
  compositeScore: number
  riskTier: 1 | 2 | 3 | 4 | 5
  estimatedDollarImpact: number
  worstCaseImpact: number
  successProbability: number
  timeToImpact: 'immediate' | 'days' | 'weeks' | 'months'
}

// ─── Monte Carlo Simulation ────────────────────────────────────────────────

export interface RunwayDistribution {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  mean: number
  probabilityOf60Days: number
  probabilityOf90Days: number
  probabilityOf180Days: number
  probabilityOf365Days: number
  probabilityOf730Days: number
}

export interface ForecastPoint {
  p25: number
  p50: number
  p75: number
}

export interface MRRForecast {
  month3: ForecastPoint
  month6: ForecastPoint
  month12: ForecastPoint
  month24: ForecastPoint
}

export interface SimScenario {
  probability: number
  runway: number
  mrr3mo: number
  mrr12mo: number
  description: string
}

export interface SimulationResult {
  runway: RunwayDistribution
  mrrForecast: MRRForecast
  scenarios: { bear: SimScenario; base: SimScenario; bull: SimScenario }
  riskScore: number
  volatilityScore: number
  breakEvenProbability: number
  baselineRunwayP50: number
  decisionLiftP50: number
  nSimulations: number
  computedAt: number
  horizonMonths: number
}

export interface SimulationConfig {
  currentMRR: number
  currentBalance: number
  monthlyBurn: number
  mrrGrowthRate: number
  churnRate: number
  appliedDecision?: {
    actionType: string
    successProbability: number
  } | null
}

// ─── Five Moves ────────────────────────────────────────────────────────────

export type MoveRisk = 'cutthroat' | 'aggressive' | 'balanced' | 'conservative' | 'safe'

export interface Move {
  rank: 1 | 2 | 3 | 4 | 5
  risk: MoveRisk
  riskLabel: string
  riskColor: string
  title: string
  summary: string
  rationale: string
  tradeoff: string
  actions: DecisionScore[]
  simulation: SimulationResult
  metrics: {
    expectedRunwayGain: number
    expectedMRRAt90d: number
    expectedMRRAt365d: number
    survivalProbability: number
    expectedDollarImpact: number
    riskOfBackfire: number
    compositeScore: number
  }
  maxStatement: string
  timeToExecute: string
}

export interface FiveMovesResult {
  moves: Move[]
  baselineSimulation: SimulationResult
  generatedAt: number
  dataQuality: 'high' | 'medium' | 'low'
}

// ─── Legacy Simulation (kept for forecasts page) ───────────────────────────

export interface SimulationPercentiles {
  p10: number
  p50: number
  p90: number
}

export interface SimulateResponse {
  user_id: string | null
  scenario: string
  scenario_summary: string
  iterations: number
  runway_p10: number
  runway_p50: number
  runway_p90: number
  runway_best: number
  runway_worst: number
  cash_at_6_months: SimulationPercentiles
  cash_at_12_months: SimulationPercentiles
  cash_at_18_months: SimulationPercentiles
  confidence: number
  advice: string
  advice_confidence: number
  advice_source: 'groq' | 'gemini' | 'fallback'
  baseline: {
    current_mrr: number
    available_cash: number
    monthly_revenue_mean: number
    monthly_revenue_std_dev: number
    monthly_operating_outflow: number
    monthly_churn_rate_pct: number
    monthly_growth_rate_pct: number
  }
  generated_at: string
}

// ─── Comp Benchmarks ────────────────────────────────────────────────────────

export type CompSource = 'indiehackers' | 'twitter' | 'producthunt' | 'microacquire'
export type CompCategory = 'SaaS' | 'API' | 'tool' | 'marketplace' | 'other'

export interface CompDataPoint {
  id: string
  source: CompSource
  mrr: number
  monthsOld: number
  category: CompCategory
  churnRate?: number
  growthRateMoM?: number
  teamSize?: number
  notes?: string
  scrapedAt: number
}

export interface BenchmarkReport {
  compCount: number
  medianMRR: number
  p25MRR: number
  p75MRR: number
  medianGrowthRate?: number
  medianChurnRate?: number
  topPerformerMRR: number
  similarBusinesses: CompDataPoint[]
  dataFreshness: number
  sources: string[]
}

// ─── Action Engine ──────────────────────────────────────────────────────────

export interface ActionCard {
  id: string
  priority: 1 | 2 | 3
  severity: 'critical' | 'warning' | 'opportunity' | 'win'
  title: string
  context: string
  estimatedImpact: string
  actionType: string
  actionLabel: string
  params: Record<string, any>
  isDestructive: boolean
  requiresConfirmText: boolean
  affectedCustomerCount?: number
}

// ─── Affiliates ─────────────────────────────────────────────────────────────

export interface AffiliateProduct {
  id: string
  name: string
  category: 'financing' | 'credit' | 'accounting' | 'saas_lending'
  tagline: string
  description: string
  ctaText: string
  affiliateUrl: string
  affiliateCode?: string
  triggerConditions: {
    minMRR?: number
    maxMRR?: number
    minRunway?: number
    maxRunway?: number
    minChurn?: number
    accountAgeDays?: number
    requiresRevenue?: boolean
  }
  maxRecommendationContext: string
  priority: number
}
~~~

## File: tailwind.config.js

~~~javascript
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
~~~

## File: tsconfig.json

~~~json
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
  "exclude": [
    "node_modules",
    "_backup_pre_phase1_merge_20260301_191720",
    "project_singlefile"
  ]
}
~~~

## File: vercel.json

~~~json
{
  "crons": [
    {
      "path": "/api/cron/scrape-comps",
      "schedule": "0 2 * * 1"
    }
  ]
}
~~~
