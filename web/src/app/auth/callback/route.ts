import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'
import { joinWaitlist } from '@/lib/waitlist'

export const dynamic = 'force-dynamic'

function redirectTo(request: Request, path: string) {
  const siteOrigin = getSiteOrigin(new URL(request.url).origin)
  return NextResponse.redirect(`${siteOrigin}${path}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') ? next : '/'
  const env = getSupabaseEnv()

  if (!code || !env) {
    return redirectTo(request, '/?error=auth')
  }

  const cookieStore = await cookies()
  const successPath = `${safeNext}?joined=1`
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email) {
      const admin = getSupabaseAdmin()
      if (admin) {
        await admin.from('waitlist_signups').upsert(
          { user_id: user.id, email: user.email },
          { onConflict: 'user_id' },
        )
      } else {
        await joinWaitlist(supabase)
      }
      return response
    }

    return redirectTo(request, '/?error=auth')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return redirectTo(request, '/?error=auth')
  }

  const admin = getSupabaseAdmin()
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

  return response
}
