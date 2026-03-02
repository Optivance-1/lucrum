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
