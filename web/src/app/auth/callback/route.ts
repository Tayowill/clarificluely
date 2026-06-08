import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_NEXT_COOKIE, resolveAuthNext } from '@/lib/auth-next'
import { isCreatorUser } from '@/lib/creator'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'
import { joinWaitlist } from '@/lib/waitlist'

export const dynamic = 'force-dynamic'

function redirectTo(request: Request, path: string) {
  const siteOrigin = getSiteOrigin(new URL(request.url).origin)
  const response = NextResponse.redirect(`${siteOrigin}${path}`)
  response.cookies.set(AUTH_NEXT_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

function isWaitlistRedirect(next: string): boolean {
  return next === '/'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = await cookies()
  const authNextCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value ?? null
  const next = resolveAuthNext(
    searchParams.get('next') ?? authNextCookie,
    '/dashboard',
  )
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  const env = getSupabaseEnv()

  if (!code || !env) {
    return redirectTo(request, '/sign-in?error=auth')
  }

  const successPath = isWaitlistRedirect(safeNext) ? '/?joined=1' : safeNext
  let response = redirectTo(request, successPath)

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('auth callback exchange failed:', error.message)
    return redirectTo(
      request,
      isWaitlistRedirect(safeNext) ? '/?error=auth' : `/sign-in?next=${encodeURIComponent(safeNext)}&error=auth`,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return redirectTo(request, '/sign-in?error=auth')
  }

  const admin = getSupabaseAdmin()

  if (isWaitlistRedirect(safeNext)) {
    if (admin) {
      const { error: insertError } = await admin.from('waitlist_signups').upsert(
        { user_id: user.id, email: user.email },
        { onConflict: 'user_id' },
      )
      if (insertError) {
        return redirectTo(request, '/?error=waitlist')
      }
    } else {
      const result = await joinWaitlist(supabase)
      if (!result.ok) {
        return redirectTo(request, '/?error=waitlist')
      }
    }
  } else if (admin) {
    await admin.from('profiles').upsert(
      {
        user_id: user.id,
        plan: isCreatorUser(user.id) ? 'pro_plus' : 'free',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  }

  return response
}
