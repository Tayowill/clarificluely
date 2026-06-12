import { isLaunchLive } from '@/lib/waitlist-config'

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.split(':')[0]?.toLowerCase() ?? ''
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

/** `/live` is public after launch; before launch only on local dev. */
export function canAccessLivePreview(hostname?: string | null): boolean {
  if (isLaunchLive()) return true
  if (!hostname) return process.env.NODE_ENV === 'development'
  return isLocalHostname(hostname)
}

export function shouldBlockLivePreview(hostname: string): boolean {
  return !canAccessLivePreview(hostname)
}
