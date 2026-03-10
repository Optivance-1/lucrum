import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/connect',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/stripe/webhook',
  '/api/billing/webhook',
  '/api/health',
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

