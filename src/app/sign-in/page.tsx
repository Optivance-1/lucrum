'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}

