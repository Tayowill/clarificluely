import { Suspense } from 'react'
import { PricingPage } from '@/components/pricing/PricingPage'

export const metadata = {
  title: 'Pricing — Clarifi',
  description:
    'Start free on Mac. Upgrade to Pro for unlimited AI and notes, or Pro+ for undetectable screen share.',
  alternates: { canonical: '/pricing' },
}

export default function Page() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  )
}
