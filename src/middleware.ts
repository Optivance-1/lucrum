import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/connect',
  '/pricing',
  '/privacy',
  '/terms',
  '/security',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/stripe/webhook',
  '/api/stripe/callback',
  '/api/stripe/connect',
  '/api/billing/webhook',
  '/api/health',
  '/api/comps/scrape',
  '/api/cron/scrape-comps',
  '/api/cron/verify-outcomes',
  '/api/reports/generate',
  '/api/reports/waitlist',
  '/api/reports(.*)',
  '/reports(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run middleware for all app routes and APIs except for static assets.
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/api/(.*)',
  ],
}

