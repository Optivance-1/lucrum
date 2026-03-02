/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Stripe bundled in server components/runtime in Next 14.
    serverComponentsExternalPackages: ['stripe'],
  },
}

module.exports = nextConfig
