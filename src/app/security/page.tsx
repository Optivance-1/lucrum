import Link from 'next/link'

export const metadata = {
  title: 'Security | Lucrum',
  description: 'How Lucrum protects your financial data',
}

const SECTIONS = [
  {
    title: 'Stripe Connect OAuth',
    body: 'Lucrum uses Stripe Connect OAuth — the industry-standard authentication method used by Baremetrics, ChartMogul, ProfitWell, and every serious Stripe integration. We never receive, store, or see your Stripe secret key. You authorize access on stripe.com directly, and we receive only a scoped access token with the permissions you approve.',
  },
  {
    title: 'Access Token Storage',
    body: 'Your OAuth access token is encrypted at rest using AES-256-GCM with a server-side encryption key and stored in Vercel KV. Tokens are never logged, never sent to third parties, and never stored in plaintext. You can revoke access at any time from your Stripe Dashboard under Connected Applications.',
  },
  {
    title: 'Authentication',
    body: 'All routes are protected via Clerk authentication. Session tokens are short-lived and rotated automatically.',
  },
  {
    title: 'Scoped Permissions',
    body: 'By default, Lucrum requests read-only access to your Stripe data. This means we can analyze your metrics but cannot modify anything in your account. Enterprise users who enable Action Execution authorize read-write access, which enables payment recovery, coupon creation, and other actions — always with explicit confirmation.',
  },
  {
    title: 'Data Access',
    body: 'Lucrum reads your Stripe data on your behalf to generate insights and recommendations. We never write to your Stripe account without explicit user confirmation through our Action Execution flow. Every write action is logged to your personal audit trail.',
  },
  {
    title: 'AI Providers',
    body: 'Your financial data is sent to AI providers (Groq, NVIDIA, Google) to generate insights. Data sent is limited to aggregate metrics only — no customer PII (names, emails, card numbers) is ever sent to AI providers.',
  },
  {
    title: 'Encryption in Transit',
    body: 'All data in transit is encrypted via TLS 1.3. HTTPS is enforced on all endpoints.',
  },
  {
    title: 'Data Retention',
    body: 'Metric snapshots are retained for 365 days. Audit logs are retained for 365 days. Cancellation: all data deleted within 30 days on request.',
  },
  {
    title: 'Vulnerability Disclosure',
    body: 'Found a security issue? Email security@lucrum.app. We respond within 48 hours. We do not pursue legal action against good-faith researchers.',
  },
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white">
      <nav className="border-b border-[rgba(201,168,76,0.12)] py-4 px-6">
        <Link href="/" className="font-display font-bold text-gradient-gold">
          &larr; Lucrum
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold mb-4">Security at Lucrum</h1>
        <p className="text-slate-aug text-sm mb-10">
          We take the security of your financial data seriously. Here is how we protect it.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s, i) => (
            <section key={i}>
              <h2 className="text-white font-semibold text-lg mb-2">{s.title}</h2>
              <p className="text-slate-aug leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(201,168,76,0.1)]">
          <p className="text-slate-aug text-sm">
            Questions? Contact us at{' '}
            <a href="mailto:security@lucrum.app" className="text-gold hover:underline">
              security@lucrum.app
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
