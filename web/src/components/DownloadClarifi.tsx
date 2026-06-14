'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MAC_DMG_FILENAME,
  WIN_EXE_FILENAME,
  getMacDownloadPath,
  getWindowsDownloadPath,
} from '@/lib/downloads'
import { type CustomerPlatform, detectClientPlatform } from '@/lib/platform'

type DownloadClarifiProps = {
  variant?: 'dashboard' | 'compact'
  onDownloaded?: (platform: CustomerPlatform) => void
  className?: string
}

async function recordPlatform(platform: CustomerPlatform): Promise<void> {
  try {
    await fetch('/api/customer/platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
  } catch {
    /* ignore — unauthenticated or offline */
  }
}

function triggerFileDownload(path: string, filename: string): void {
  const a = document.createElement('a')
  a.href = path
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function DownloadClarifi({
  variant = 'dashboard',
  onDownloaded,
  className,
}: DownloadClarifiProps) {
  const [detected, setDetected] = useState<CustomerPlatform | null>(null)

  useEffect(() => {
    const platform = detectClientPlatform()
    if (!platform) return
    setDetected(platform)
    void recordPlatform(platform)
  }, [])

  const download = useCallback(
    (platform: CustomerPlatform) => {
      const path = platform === 'windows' ? getWindowsDownloadPath() : getMacDownloadPath()
      const filename = platform === 'windows' ? WIN_EXE_FILENAME : MAC_DMG_FILENAME
      triggerFileDownload(path, filename)
      void recordPlatform(platform)
      onDownloaded?.(platform)
    },
    [onDownloaded],
  )

  const primary = detected ?? 'mac'
  const secondary = primary === 'mac' ? 'windows' : 'mac'

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={className}
        onClick={() => download(primary)}
      >
        Get for {primary === 'mac' ? 'macOS' : 'Windows'}
      </button>
    )
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => download(primary)}
        className="inline-block bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/90"
      >
        Download for {primary === 'mac' ? 'macOS' : 'Windows'}
      </button>
      <button
        type="button"
        onClick={() => download(secondary)}
        className="inline-block border border-white/20 px-6 py-2 rounded-lg text-sm hover:bg-white/5"
      >
        Download for {secondary === 'mac' ? 'macOS' : 'Windows'}
      </button>
    </div>
  )
}
