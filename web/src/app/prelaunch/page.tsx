import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WaitlistPage } from '@/components/waitlist/WaitlistPage'
import { redirectOAuthCodeIfPresent } from '@/lib/prelaunch-page'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Clarifi — Join the waitlist',
  alternates: { canonical: '/prelaunch' },
  robots: { index: false, follow: false },
}

type PrelaunchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PrelaunchRoute({ searchParams }: PrelaunchPageProps) {
  const params = await searchParams
  await redirectOAuthCodeIfPresent(params)

  const supabaseConfig = getSupabaseEnv()

  return (
    <Suspense fallback={null}>
      <WaitlistPage supabaseConfig={supabaseConfig} siteOrigin={getSiteOrigin()} />
    </Suspense>
  )
}
