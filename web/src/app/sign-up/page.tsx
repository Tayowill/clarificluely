import { AuthForm } from '@/components/auth/AuthForm'
import '@/components/auth/auth.css'

type PageProps = {
  searchParams: Promise<{ next?: string }>
}

export const metadata = {
  title: 'Sign up — Clarifi',
  robots: { index: false, follow: false },
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  const redirectNext = next?.startsWith('/') ? next : '/dashboard'

  return (
    <AuthForm
      mode="sign-up"
      next={redirectNext}
      title="Create your Clarifi account"
      subtitle="Sign up with email or Google to use Clarifi on desktop and manage your plan."
      alternateHref={`/sign-in${redirectNext !== '/dashboard' ? `?next=${encodeURIComponent(redirectNext)}` : ''}`}
      alternateLabel="Already have an account? Sign in"
    />
  )
}
