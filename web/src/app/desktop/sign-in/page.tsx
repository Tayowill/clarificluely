import { AuthForm } from '@/components/auth/AuthForm'
import '@/components/auth/auth.css'

export const metadata = {
  title: 'Desktop sign in — Clarifi',
  robots: { index: false, follow: false },
}

export default function DesktopSignInPage() {
  return (
    <AuthForm
      mode="sign-in"
      next="/desktop/connect"
      title="Sign in to connect desktop"
      subtitle="Authenticate here so Clarifi Desktop can link to your account."
      alternateHref="/desktop/sign-up"
      alternateLabel="Need an account? Sign up"
    />
  )
}
