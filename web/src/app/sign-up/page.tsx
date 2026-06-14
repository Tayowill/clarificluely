import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthRedirect } from '@/components/auth/AuthRedirect'
import { getServerUser } from '@/lib/auth-server'
import { getServerDevLaunchPreview } from '@/lib/launch-preview-server'
import { canAccessAuthDuringPrelaunch, resolvePostAuthRedirect } from '@/lib/prelaunch'
import { isLaunchLive } from '@/lib/waitlist-config'
import '@/components/auth/auth.css'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string; preview?: string }>
}

export const metadata = {
  title: 'Sign up — Clarifi',
  robots: { index: false, follow: false },
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { next, error } = params
  const devPreviewLive = await getServerDevLaunchPreview(params.preview)
  const redirectNext = next?.startsWith('/') ? next : '/dashboard'
  if (!canAccessAuthDuringPrelaunch(redirectNext, devPreviewLive)) {
    redirect('/')
  }

  const user = await getServerUser()
  if (user) {
    redirect(
      isLaunchLive(undefined, devPreviewLive)
        ? redirectNext
        : resolvePostAuthRedirect(redirectNext, devPreviewLive),
    )
  }

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
