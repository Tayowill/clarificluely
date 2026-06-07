import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ count: null })
  }

  const { count, error } = await supabase
    .from('waitlist_signups')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ count: null })
  }

  return NextResponse.json({ count: count ?? 0 })
}
