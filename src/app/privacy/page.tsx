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
          &larr; Lucrum
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-aug text-sm mb-6">Last updated: March 2026</p>

        <div className="space-y-8 text-slate-aug leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. What We Collect</h2>
            <p className="mb-3">
              Lucrum accesses your Stripe account data via the Stripe API using the restricted API key you provide. We process:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Transaction amounts and dates</li>
              <li>Subscription status and plan details</li>
              <li>Customer metadata (email, created date)</li>
              <li>Balance and payout information</li>
              <li>Invoice and payment intent statuses</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-white">not</strong> collect or store customer payment card numbers, bank account details, or full SSN/TIN information.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. How We Use Your Data</h2>
            <p>
              Your Stripe data is used solely to generate the financial dashboards, AI insights, Monte Carlo simulations,
              Five Moves strategic analysis, cash flow forecasts, and action recommendations within Lucrum. We do not sell your data.
            </p>
            <p className="mt-2">
              We may use aggregated, anonymized metrics (e.g., &ldquo;Lucrum users recovered $X in payments this month&rdquo;) to improve
              our product and for marketing purposes. Individual user data is never identifiable in these aggregations.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. AI Providers We Share Data With</h2>
            <p>To generate AI-powered insights, we send limited aggregate financial metrics to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong className="text-white">Groq</strong> — primary AI inference (Llama, Kimi K2, Qwen models)</li>
              <li><strong className="text-white">NVIDIA NIM</strong> — GLM-5 model for deep financial analysis</li>
              <li><strong className="text-white">Google</strong> — Gemini for vision/document analysis</li>
            </ul>
            <p className="mt-2">
              Data sent to AI providers includes only aggregate numbers (MRR, churn rate, runway, etc.). Customer names,
              emails, and payment details are <strong className="text-white">never</strong> sent to any AI provider.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Data Storage &amp; Security</h2>
            <p>
              All data is transmitted over TLS 1.3. Stripe API keys are encrypted using AES-256-GCM with a server-side key
              and stored in httpOnly cookies. Keys are never logged, displayed in UI after initial setup, or stored in plaintext.
              Metric snapshots and audit logs are stored in encrypted key-value storage.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Data Retention</h2>
            <p>
              Metric snapshots are retained for up to 365 days. Audit logs of executed actions are retained for 365 days.
              Upon account cancellation, all user data is deleted within 30 days on request.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Your Rights</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-white">Deletion:</strong> Request complete deletion of your data at any time via email.</li>
              <li><strong className="text-white">Export:</strong> Request an export of your stored metrics and audit logs.</li>
              <li><strong className="text-white">Access:</strong> View all data Lucrum holds about you from your dashboard.</li>
              <li><strong className="text-white">Correction:</strong> Contact us to correct any inaccurate information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">7. Contact</h2>
            <p>
              For privacy questions or data requests:{' '}
              <a href="mailto:privacy@lucrum.app" className="text-gold hover:underline">privacy@lucrum.app</a>
            </p>
            <p className="mt-2">
              For security concerns:{' '}
              <a href="mailto:security@lucrum.app" className="text-gold hover:underline">security@lucrum.app</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
