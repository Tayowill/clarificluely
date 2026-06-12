import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthRedirect } from '@/components/auth/AuthRedirect'
import { getServerUser } from '@/lib/auth-server'
import { isLaunchLive } from '@/lib/waitlist-config'
import '@/components/auth/auth.css'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>
}

export const metadata = {
  title: 'Sign up — Clarifi',
  robots: { index: false, follow: false },
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams
  const redirectNext = next?.startsWith('/') ? next : '/dashboard'
  if (!isLaunchLive()) redirect('/')

  const user = await getServerUser()
  if (user) redirect('/?joined=1')

  return (
    <>
      <AuthRedirect next={redirectNext} />
      <AuthForm
      mode="sign-up"
      next={redirectNext}
      error={error === 'auth' ? 'Sign-up failed. Please try again.' : null}
      title="Create your Clarifi account"
      subtitle="Sign up with email or Google to use Clarifi on desktop and manage your plan."
      alternateHref={`/sign-in${redirectNext !== '/dashboard' ? `?next=${encodeURIComponent(redirectNext)}` : ''}`}
      alternateLabel="Already have an account? Sign in"
    />
    </>
  )
}
