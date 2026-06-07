import { SignIn } from '@clerk/nextjs'
import { clerkAppearanceEmbed } from '@/lib/clerk-appearance'

export default function DesktopSignInPage() {
  return (
    <main className="min-h-screen bg-[#f0f0f2] flex items-center justify-center p-4">
      <SignIn
        appearance={clerkAppearanceEmbed}
        routing="path"
        path="/desktop/sign-in"
        signUpUrl="/desktop/sign-up"
        forceRedirectUrl="/desktop/connect"
        fallbackRedirectUrl="/desktop/connect"
      />
    </main>
  )
}
