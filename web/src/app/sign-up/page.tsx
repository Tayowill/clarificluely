import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { getServerUser } from '@/lib/auth-server'
import '@/components/auth/auth.css'

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
  const user = await getServerUser()
  if (user) redirect(redirectNext)

  return (
    <AuthForm
      mode="sign-up"
      next={redirectNext}
      error={error === 'auth' ? 'Sign-up failed. Please try again.' : null}
      title="Create your Clarifi account"
      subtitle="Sign up with email or Google to use Clarifi on desktop and manage your plan."
      alternateHref={`/sign-in${redirectNext !== '/dashboard' ? `?next=${encodeURIComponent(redirectNext)}` : ''}`}
      alternateLabel="Already have an account? Sign in"
    />
  )
}
