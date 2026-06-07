import { Suspense } from 'react'
import { WaitlistPage } from '@/components/waitlist/WaitlistPage'

export default function Home() {
  return (
    <Suspense fallback={null}>
      <WaitlistPage />
    </Suspense>
  )
}
