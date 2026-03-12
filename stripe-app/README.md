# Lucrum Stripe App

Native Stripe Dashboard integration for Lucrum AI CFO.

## Overview

This Stripe App surfaces Lucrum's AI CFO insights directly inside the Stripe Dashboard:

- **Dashboard Home**: Shows MRR, runway, churn + top recommended move
- **Customer Detail**: Shows churn risk score and recommended actions per customer

## Setup

### Prerequisites

1. Install the Stripe Apps CLI:
```bash
npm install -g @stripe/stripe-apps-cli
```

2. Authenticate with your Stripe account:
```bash
stripe login
```

### Development

1. Start the local development server:
```bash
cd stripe-app
stripe apps start
```

2. The app will be available in your Stripe Dashboard (Test mode)

### Deployment

1. Upload the app to Stripe:
```bash
stripe apps upload
```

2. Submit for review:
```bash
stripe apps submit
```

## Configuration

Add to your `.env.local`:
```
STRIPE_APP_SIGNING_SECRET=whsec_...
```

Get the signing secret from the Stripe Apps Dashboard after upload.

## API Endpoints

The app fetches data from:

- `GET /api/stripe-app/summary` - Dashboard metrics + top move
- `GET /api/stripe-app/customer` - Per-customer churn risk

Both endpoints verify the `x-stripe-signature` header.

## Review Guidelines

Before submitting for Stripe App Marketplace review:

1. Ensure first 10 users have confirmed value
2. Include screenshots of app in action
3. Write clear app description (MAX AI CFO focus)
4. Test in both live and test modes

**Note**: Stripe featured apps get 10x organic distribution. 
Target: Featured placement within 60 days of launch.

## Stripe App Review Guidelines

https://stripe.com/docs/stripe-apps/review-requirements

Key requirements:
- Clear value proposition
- No misleading claims
- Proper error handling
- Responsive design
- Privacy policy link

## Architecture

```
stripe-app/
├── stripe-app.json          # App manifest
├── src/
│   ├── index.tsx            # App entry point
│   ├── views/
│   │   ├── AppView.tsx      # Main dashboard view
│   │   ├── InsightsView.tsx # Customer detail view
│   │   └── ConnectView.tsx  # Onboarding view
│   └── components/
│       ├── MetricCard.tsx
│       ├── MoveCard.tsx
│       └── ConnectPrompt.tsx
```

## Why This Matters

The Stripe App Marketplace is the highest-leverage distribution channel for Lucrum:

1. **Zero CAC** — Stripe surfaces the app to every Dashboard user
2. **Acquisition alignment** — Native Stripe tools are exactly what Stripe acquires
3. **Trust signal** — Stripe App listing = implicit endorsement
4. **Lock-in** — Users see Lucrum insights every time they open Stripe
