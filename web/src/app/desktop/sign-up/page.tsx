import { SignUp } from '@clerk/nextjs'
import { clerkAppearanceEmbed } from '@/lib/clerk-appearance'

export default function DesktopSignUpPage() {
  return (
    <main className="min-h-screen bg-[#f0f0f2] flex items-center justify-center p-4">
      <SignUp
        appearance={clerkAppearanceEmbed}
        routing="path"
        path="/desktop/sign-up"
        signInUrl="/desktop/sign-in"
        forceRedirectUrl="/desktop/connect"
        fallbackRedirectUrl="/desktop/connect"
      />
    </main>
  )
}
