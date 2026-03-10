'use client'

import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-slate-aug hover:text-white transition-colors text-sm">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-obsidian font-display font-bold">L</span>
            <span className="font-display text-xl font-bold text-gradient-gold">Lucrum</span>
          </Link>
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-4">
            Create your
            <br />
            Lucrum account.
          </h1>
          <p className="text-slate-aug text-lg max-w-md">
            Start free, connect Stripe, and keep your MAX CFO, billing, and audit history tied to one identity.
          </p>
        </div>

        <div className="glass gold-border rounded-3xl p-6 md:p-8 gold-glow">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                card: 'bg-transparent shadow-none',
                rootBox: 'w-full',
                headerTitle: 'text-white font-display',
                headerSubtitle: 'text-slate-aug',
                socialButtonsBlockButton: 'border border-[rgba(201,168,76,0.16)] bg-white/5 text-white hover:bg-white/10',
                formButtonPrimary: 'bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#E8C97A]',
                formFieldInput: 'bg-[#16162A] border border-[rgba(201,168,76,0.18)] text-white',
                footerActionLink: 'text-[#E8C97A] hover:text-white',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
