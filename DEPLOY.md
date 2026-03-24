# Lucrum — production deployment

## Preconditions

1. **Vercel** (or any Node 18+ host) with a **Vercel KV** (or compatible) database.
2. **Clerk** application with URLs pointing at your production domain.
3. **Stripe** Connect app: secret key, webhook signing secret, redirect URLs for `/api/stripe/callback`.

## One-time setup

```bash
cd Lucrum/Lucrum
cp .env.example .env.local
# Edit .env.local with real values — never commit it.
npm ci
npm run build
```

`npm run build` must succeed before you ship. In **production**, missing any variable listed under “Required” in `.env.example` will fail startup checks (unless `SKIP_STARTUP_CHECKS=1`, which is for CI only).

## Vercel

1. Import the repo, root directory `Lucrum/Lucrum` (or your monorepo path).
2. **Environment variables**: copy every key from `.env.example` that you use; set `NODE_ENV=production` implicitly on Vercel.
3. **Cron jobs**: `vercel.json` schedules:
   - `/api/cron/scrape-comps`
   - `/api/cron/verify-outcomes`
   - `/api/reports/generate`  
   Each route expects `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set. Configure the same secret in Vercel env and ensure cron invocations send that header (Vercel Cron can pass headers in project settings where supported).

## After deploy

- Hit **`GET /api/health`** for a quick dependency check.
- Configure **Stripe webhooks** to your production URL for `/api/stripe/webhook` and (if used) `/api/billing/webhook`.
- Operator heartbeat: **`GET /api/cron/heartbeat`** (status JSON). **`POST`** records a check-in: in **production** you must set **`CRON_SECRET`** and call with `Authorization: Bearer <CRON_SECRET>` (same pattern as other cron routes).

## Commands reference

| Command        | Purpose              |
|----------------|----------------------|
| `npm ci`       | Clean install        |
| `npm run build`| Production build     |
| `npm start`    | Start production app |
