import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { getServerUser } from '@/lib/auth-server'
import '@/components/auth/auth.css'

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>
}

export const metadata = {
  title: 'Sign in — Clarifi',
  robots: { index: false, follow: false },
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams
  const redirectNext = next?.startsWith('/') ? next : '/dashboard'
  const user = await getServerUser()
  if (user) redirect(redirectNext)

  return (
    <AuthForm
      mode="sign-in"
      next={redirectNext}
      error={error === 'auth' ? 'Sign-in failed. Please try again.' : null}
      title="Sign in to Clarifi"
      subtitle="Use your email or Google account to access your dashboard and connect the desktop app."
      alternateHref={`/sign-up${redirectNext !== '/dashboard' ? `?next=${encodeURIComponent(redirectNext)}` : ''}`}
      alternateLabel="Don't have an account? Sign up"
    />
  )
}
