import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'
import { getMacDownloadUrl } from '@/lib/downloads'
import { redirectOAuthCodeIfPresent } from '@/lib/prelaunch-page'
import { canAccessLivePreview } from '@/lib/site-preview'
import { isLaunchLive } from '@/lib/waitlist-config'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Clarifi — Undetectable AI for Meetings',
    alternates: { canonical: isLaunchLive() ? '/' : '/live' },
    robots: isLaunchLive() ? undefined : { index: false, follow: false },
  }
}

type LivePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LiveRoute({ searchParams }: LivePageProps) {
  const params = await searchParams
  await redirectOAuthCodeIfPresent(params)

  const headerStore = await headers()
  const hostname = headerStore.get('host')

  if (!canAccessLivePreview(hostname)) {
    redirect('/')
  }

  return <LandingPage macDownloadUrl={getMacDownloadUrl()} />
}
