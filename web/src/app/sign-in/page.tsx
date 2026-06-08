import { AuthForm } from '@/components/auth/AuthForm'
import '@/components/auth/auth.css'

type PageProps = {
  searchParams: Promise<{ next?: string }>
}

export const metadata = {
  title: 'Sign in — Clarifi',
  robots: { index: false, follow: false },
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  const redirectNext = next?.startsWith('/') ? next : '/dashboard'

  return (
    <AuthForm
      mode="sign-in"
      next={redirectNext}
      title="Sign in to Clarifi"
      subtitle="Use your email or Google account to access your dashboard and connect the desktop app."
      alternateHref={`/sign-up${redirectNext !== '/dashboard' ? `?next=${encodeURIComponent(redirectNext)}` : ''}`}
      alternateLabel="Don't have an account? Sign up"
    />
  )
}
