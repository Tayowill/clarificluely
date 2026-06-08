import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authCallbackRedirectPath } from '@/lib/auth-callback-redirect'
import { isPublicPath } from '@/lib/protected-routes'
import { getSiteOrigin } from '@/lib/site-url'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim()
  if (!url || !key) return null
  return { url, key }
}

export default async function proxy(request: NextRequest) {
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

  let response = NextResponse.next({ request })
  const env = getSupabaseEnv()

  if (env) {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    await supabase.auth.getUser()

    if (!isPublicPath(pathname)) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const signIn = new URL('/sign-in', request.url)
        signIn.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
        return NextResponse.redirect(signIn)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',
    '/(api|trpc)(.*)',
  ],
}
