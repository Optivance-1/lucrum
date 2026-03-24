/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Stripe bundled in server components/runtime in Next 14.
    serverComponentsExternalPackages: ['stripe'],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return []

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.stripe.com https://images.clerk.dev",
      "font-src 'self' data:",
      "connect-src 'self' https://api.groq.com https://api.openai.com https://*.stripe.com https://*.clerk.com https://*.clerk.accounts.dev",
      "frame-src https://js.stripe.com https://connect-js.stripe.com https://*.clerk.com https://*.clerk.accounts.dev",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

