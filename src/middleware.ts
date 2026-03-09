import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: [
    '/',
    '/api/stripe/webhook',
    '/api/health',
  ],
})

export const config = {
  matcher: [
    // Protect all application routes and APIs except for static assets and the public routes above.
    '/((?!(?:_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$)).*)',
    '/api/(.*)',
  ],
}

