const DEFAULT_APP_URL = 'https://www.clarifiapp.com'
export const MAC_DMG_FILENAME = 'Clarifi-0.1.0-arm64.dmg'

export function getMacDownloadPath(): string {
  return `/downloads/${MAC_DMG_FILENAME}`
}

export function getMacDownloadUrl(): string {
  const override = process.env.NEXT_PUBLIC_CLARIFI_MAC_DOWNLOAD_URL?.trim()
  if (override) return override

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL
  ).replace(/\/$/, '')
  return `${appUrl}${getMacDownloadPath()}`
}
