import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { WaitlistPage } from '@/components/waitlist/WaitlistPage'
import { authCallbackRedirectPath } from '@/lib/auth-callback-redirect'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  if (typeof params.code === 'string') {
    const q = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') q.set(key, value)
    }
    const target = authCallbackRedirectPath(q)
    if (target) redirect(target)
  }

  const supabaseConfig = getSupabaseEnv()

  return (
    <Suspense fallback={null}>
      <WaitlistPage supabaseConfig={supabaseConfig} siteOrigin={getSiteOrigin()} />
    </Suspense>
  )
}
