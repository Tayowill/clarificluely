import { AuthForm } from '@/components/auth/AuthForm'
import '@/components/auth/auth.css'

export const metadata = {
  title: 'Desktop sign up — Clarifi',
  robots: { index: false, follow: false },
}

export default function DesktopSignUpPage() {
  return (
    <AuthForm
      mode="sign-up"
      next="/desktop/connect"
      title="Create account for desktop"
      subtitle="Sign up to pair Clarifi Desktop with your plan and usage limits."
      alternateHref="/desktop/sign-in"
      alternateLabel="Already have an account? Sign in"
    />
  )
}
