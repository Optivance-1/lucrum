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
