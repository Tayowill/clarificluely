import { Suspense } from 'react'
import { PricingPage } from '@/components/pricing/PricingPage'

export const metadata = {
  title: 'Pricing — Clarifi',
  description:
    'Pro for individuals at $19/mo, Pro+ for teams at $39/seat/mo. 7-day free trial on monthly and annual plans.',
  alternates: { canonical: '/pricing' },
}

export default function Page() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  )
}
