import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinWaitlist } from '@/lib/waitlist'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/?error=auth`)
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      await joinWaitlist(supabase)
      return NextResponse.redirect(`${origin}${next}?joined=1`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
