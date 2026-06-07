import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { joinWaitlist } from '@/lib/waitlist'

export const dynamic = 'force-dynamic'

function redirectAfterAuth(request: Request, path: string) {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'

  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }
  return NextResponse.redirect(`${origin}${path}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') ? next : '/'

  if (!code) {
    return redirectAfterAuth(request, '/?error=auth')
  }

  const supabase = await createClient()
  if (!supabase) {
    return redirectAfterAuth(request, '/?error=config')
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return redirectAfterAuth(request, '/?error=auth')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return redirectAfterAuth(request, '/?error=auth')
  }

  const admin = getSupabaseAdmin()
  if (admin) {
    const { error: insertError } = await admin.from('waitlist_signups').upsert(
      { user_id: user.id, email: user.email },
      { onConflict: 'user_id' },
    )
    if (insertError) {
      return redirectAfterAuth(request, '/?error=waitlist')
    }
  } else {
    const result = await joinWaitlist(supabase)
    if (!result.ok) {
      return redirectAfterAuth(request, '/?error=waitlist')
    }
  }

  return redirectAfterAuth(request, `${safeNext}?joined=1`)
}
