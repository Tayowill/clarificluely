import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { WaitlistPage } from '@/components/waitlist/WaitlistPage'
import { authCallbackRedirectPath } from '@/lib/auth-callback-redirect'
import { AUTH_NEXT_COOKIE } from '@/lib/auth-next'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TAGLINE,
  SITE_TITLE,
} from '@/lib/site-metadata'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSiteOrigin } from '@/lib/site-url'

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
  if (typeof params.code === 'string') {
    const q = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') q.set(key, value)
    }
    const cookieStore = await cookies()
    const authNext = cookieStore.get(AUTH_NEXT_COOKIE)?.value ?? null
    const target = authCallbackRedirectPath(q, authNext)
    if (target) redirect(target)
  }

  const supabaseConfig = getSupabaseEnv()

  return (
    <Suspense fallback={null}>
      <WaitlistPage supabaseConfig={supabaseConfig} siteOrigin={getSiteOrigin()} />
    </Suspense>
  )
}
