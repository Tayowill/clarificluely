import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WaitlistPage } from '@/components/waitlist/WaitlistPage'
import { LandingPage } from '@/components/landing/LandingPage'
import { getMacDownloadUrl } from '@/lib/downloads'
import { redirectOAuthCodeIfPresent } from '@/lib/prelaunch-page'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TAGLINE,
  SITE_TITLE,
} from '@/lib/site-metadata'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'
import { isLaunchLive } from '@/lib/waitlist-config'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    url: '/',
    siteName: SITE_NAME,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    images: [SITE_OG_IMAGE.url],
  },
}

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  await redirectOAuthCodeIfPresent(params)

  if (isLaunchLive()) {
    return <LandingPage macDownloadUrl={getMacDownloadUrl()} />
  }

  const supabaseConfig = getSupabaseEnv()

  return (
    <Suspense fallback={null}>
      <WaitlistPage supabaseConfig={supabaseConfig} siteOrigin={getSiteOrigin()} />
    </Suspense>
  )
}
