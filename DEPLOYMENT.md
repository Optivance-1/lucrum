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

