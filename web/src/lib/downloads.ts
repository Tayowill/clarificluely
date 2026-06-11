export const MAC_DMG_FILENAME = 'Clarifi-0.1.0-arm64.dmg'

/** Same-origin path so dashboard downloads work on any deployed host (Vercel preview, production, etc.). */
export function getMacDownloadPath(): string {
  return `/downloads/${MAC_DMG_FILENAME}`
}

export function getMacDownloadUrl(origin?: string): string {
  const override = process.env.NEXT_PUBLIC_CLARIFI_MAC_DOWNLOAD_URL?.trim()
  if (override) return override

  const path = getMacDownloadPath()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (appUrl) return `${appUrl}${path}`

  if (origin) return `${origin.replace(/\/$/, '')}${path}`
  return path
}
