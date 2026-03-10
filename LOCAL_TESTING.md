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
