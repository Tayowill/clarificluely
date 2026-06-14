export type CustomerPlatform = 'mac' | 'windows'

export function isCustomerPlatform(value: string | null | undefined): value is CustomerPlatform {
  return value === 'mac' || value === 'windows'
}

/** Detect desktop OS from a User-Agent string (server) or navigator (client). */
export function detectPlatformFromUserAgent(userAgent: string): CustomerPlatform | null {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) {
    return 'windows'
  }
  if (ua.includes('macintosh') || ua.includes('mac os')) {
    return 'mac'
  }
  return null
}

export function detectClientPlatform(): CustomerPlatform | null {
  if (typeof navigator === 'undefined') return null
  return detectPlatformFromUserAgent(navigator.userAgent)
}
