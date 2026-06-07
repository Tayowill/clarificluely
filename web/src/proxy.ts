import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/preview(.*)',
  '/auth/callback(.*)',
  '/blog(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/desktop/connect(.*)',
  '/desktop/sign-in(.*)',
  '/desktop/sign-up(.*)',
  '/api/desktop/exchange',
  '/api/desktop/status',
  '/api/waitlist(.*)',
  '/api/llm/chat',
  '/api/llm/suggest',
  '/api/llm/transcribe',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
