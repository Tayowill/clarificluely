import { LandingPage } from '@/components/landing/LandingPage'
import { getMacDownloadUrl } from '@/lib/downloads'

export default function Home() {
  return <LandingPage macDownloadUrl={getMacDownloadUrl()} />
}
