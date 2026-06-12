import { LandingPage } from '@/components/landing/LandingPage'
import { getMacDownloadUrl } from '@/lib/downloads'

/** Full marketing site — parked while waitlist is live at / */
export default function PreviewPage() {
  return <LandingPage macDownloadUrl={getMacDownloadUrl()} />
}
