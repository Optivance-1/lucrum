import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Share2, Twitter, Copy, Check, ArrowRight, BarChart3 } from 'lucide-react'
import { safeKvGet } from '@/lib/kv'
import type { ReportData } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: { month: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = await safeKvGet<ReportData>(`report:${params.month}`)
  
  if (!report) {
    return { title: 'Report Not Found — Lucrum' }
  }

  const topFinding = report.keyFindings[0]?.headline || report.subtitle

  return {
    title: `${report.title} — Lucrum Research`,
    description: topFinding,
    openGraph: {
      title: report.title,
      description: topFinding,
      type: 'article',
      publishedTime: new Date(report.publishedAt).toISOString(),
      authors: ['Lucrum Research'],
      images: [
        {
          url: 'https://lucrumcfo.vercel.app/og-report.png',
          width: 1200,
          height: 630,
          alt: report.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: report.title,
      description: topFinding,
    },
  }
}

export default async function ReportPage({ params }: Props) {
  const report = await safeKvGet<ReportData>(`report:${params.month}`)

  if (!report) {
    notFound()
  }

  const monthName = new Date(`${params.month}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const shareUrl = `https://lucrumcfo.vercel.app/reports/${params.month}`
  const tweetText = encodeURIComponent(
    `${report.keyFindings[0]?.headline || report.title}\n\nFrom @LucrumCFO's State of SaaS Survival report:\n${shareUrl}`
  )

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
          <Link href="/reports" className="text-sm text-slate-aug hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> All reports
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gold" />
            <span className="text-xs font-mono text-slate-aug uppercase tracking-widest">{monthName}</span>
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            {report.title}
          </h1>
          
          <p className="text-lg text-slate-aug mb-6">{report.subtitle}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="glass gold-border rounded-lg px-3 py-1.5">
              <span className="text-slate-aug">Decisions: </span>
              <span className="text-white font-bold">{report.dataPointsUsed}</span>
            </div>
            <div className="glass gold-border rounded-lg px-3 py-1.5">
              <span className="text-slate-aug">Businesses: </span>
              <span className="text-white font-bold">{report.businessesIncluded}</span>
            </div>
            <div className="glass gold-border rounded-lg px-3 py-1.5">
              <span className="text-slate-aug">Published: </span>
              <span className="text-white font-bold">
                {new Date(report.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Key Findings */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-8">Key Findings</h2>
          
          <div className="space-y-8">
            {report.keyFindings.map((finding, idx) => (
              <div key={idx} className="glass gold-border rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-gold">{idx + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white mb-2">
                      {finding.headline}
                    </h3>
                    <p className="text-slate-aug leading-relaxed mb-3">{finding.detail}</p>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-slate-aug">
                        Based on <span className="text-gold">{finding.dataPoints}</span> data points
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        finding.confidence === 'high' 
                          ? 'bg-emerald-aug/10 text-emerald-aug border border-emerald-aug/20'
                          : 'bg-gold/10 text-gold border border-gold/20'
                      }`}>
                        {finding.confidence} confidence
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-12 px-6 border-t border-[rgba(201,168,76,0.1)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-xl font-bold text-white mb-4">Methodology</h2>
          <p className="text-slate-aug leading-relaxed mb-6">{report.methodology}</p>
          
          <h3 className="font-display text-lg font-bold text-white mb-2">Limitations</h3>
          <p className="text-slate-aug leading-relaxed">{report.limitations}</p>
        </div>
      </section>

      {/* Share */}
      <section className="py-12 px-6 border-t border-[rgba(201,168,76,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="glass gold-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-white mb-1">Share this report</h3>
              <p className="text-sm text-slate-aug">Help other founders discover the data</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1DA1F2] text-white text-sm font-semibold hover:opacity-90 transition-all"
              >
                <Twitter className="w-4 h-4" />
                Tweet
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass gold-border text-white text-sm font-semibold hover:border-gold/40 transition-all"
              >
                <Copy className="w-4 h-4" />
                Copy link
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[rgba(201,168,76,0.1)]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            See how your business compares
          </h2>
          <p className="text-slate-aug mb-6">
            Connect your Stripe account to get personalized AI CFO insights and contribute to future reports.
          </p>
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gold text-obsidian font-bold hover:bg-gold-light transition-all"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Next Report */}
      <section className="py-8 px-6 border-t border-[rgba(201,168,76,0.1)]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-slate-aug">
            Next report publishes: <span className="text-gold">{report.nextReportDate}</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-slate-aug text-sm font-mono">Lucrum Research &copy; 2026</span>
          <div className="flex gap-6 text-sm text-slate-aug">
            <Link href="/reports" className="hover:text-white transition-colors">All Reports</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
