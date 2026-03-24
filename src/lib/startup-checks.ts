export function runStartupChecks(): void {
  if (process.env.SKIP_STARTUP_CHECKS === '1') {
    return
  }

  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CLERK_SECRET_KEY',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ]

  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    const msg = `Missing required env vars: ${missing.join(', ')}`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.warn(`[startup] ${msg} (allowed in non-production; set all before production deploy)`)
    return
  }

  const optional = ['RESEND_API_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']
  optional.filter((k) => !process.env[k]).forEach((k) => {
    console.warn(`[startup] ${k} not set — some features may be unavailable`)
  })
}
