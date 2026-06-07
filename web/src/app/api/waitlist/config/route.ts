import { NextResponse } from 'next/server'
import { getSupabaseEnv } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const env = getSupabaseEnv()
  if (!env) {
    return NextResponse.json({ enabled: false })
  }

  return NextResponse.json({
    enabled: true,
    url: env.url,
    key: env.key,
  })
}
