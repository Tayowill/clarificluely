import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { authCallbackRedirectPath } from '@/lib/auth-callback-redirect'
import { updateSupabaseSession } from '@/lib/supabase/middleware'
import { getSiteOrigin } from '@/lib/site-url'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sitemap.xml',
  '/robots.txt',
  '/auth/callback(.*)',
  '/blog(.*)',
  '/pricing',
  '/privacy',
  '/terms',
  '/subprocessors',
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
  const { pathname, searchParams } = request.nextUrl

  if (pathname.startsWith('/preview')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname === '/' && searchParams.get('code')) {
    const target = authCallbackRedirectPath(searchParams)
    if (target) {
      const siteOrigin = getSiteOrigin(request.nextUrl.origin)
      return NextResponse.redirect(new URL(target, siteOrigin))
    }
  }

  const supabaseResponse = await updateSupabaseSession(request)

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  return supabaseResponse
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',
    '/(api|trpc)(.*)',
  ],
}
