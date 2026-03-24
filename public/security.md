# Security at Lucrum

## Stripe Key Storage
User Stripe API keys are encrypted using AES-256-GCM with a server-side encryption key before storage. Keys are stored in httpOnly cookies and never logged, never sent to third parties, and never stored in plaintext.

## Authentication
All routes are protected via Clerk authentication. Session tokens are short-lived and rotated automatically.

## Data Access
Lucrum reads your Stripe data on your behalf. We never write to your Stripe account without explicit user confirmation through our Action Execution flow. Every write action is logged to your personal audit trail.

## AI Providers
Your financial data is sent to AI providers (Groq, NVIDIA, Google) to generate insights. Data sent is limited to aggregate metrics only — no customer PII (names, emails, card numbers) is ever sent to AI providers.

## Vulnerability Disclosure
Found a security issue? Email: security@lucrum.app
We respond within 48 hours. We do not pursue legal action against good-faith researchers.

## Encryption in Transit
All data in transit is encrypted via TLS 1.3. HTTPS is enforced on all endpoints.

## Data Retention
Metric snapshots are retained for 365 days. Audit logs are retained for 365 days. Cancellation: all data deleted within 30 days on request.
