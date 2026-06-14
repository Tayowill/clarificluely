'use client'

import { useEffect, useState } from 'react'
import { DEV_LAUNCH_PREVIEW_COOKIE, resolveDevLaunchPreview } from '@/lib/launch-preview'
import { getLaunchCountdown } from '@/lib/waitlist-config'

function readPreviewCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${DEV_LAUNCH_PREVIEW_COOKIE}=`))
  return match?.split('=')[1] ?? null
}

function readPreviewQuery(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('preview')
}

export function useLaunchCountdown() {
  const [devPreviewLive, setDevPreviewLive] = useState(false)
  const [countdown, setCountdown] = useState<ReturnType<typeof getLaunchCountdown> | null>(null)

  useEffect(() => {
    const syncPreview = () => {
      setDevPreviewLive(
        resolveDevLaunchPreview(
          { preview: readPreviewQuery() },
          readPreviewCookie(),
        ),
      )
    }

    syncPreview()
    const onPopState = () => syncPreview()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const tick = () => setCountdown(getLaunchCountdown(Date.now(), devPreviewLive))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [devPreviewLive])

  return countdown
}
