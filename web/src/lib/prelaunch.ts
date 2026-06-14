import { isCreatorUser } from '@/lib/creator'
import { isLaunchLive } from '@/lib/waitlist-config'

/** App surfaces that stay closed until the public launch countdown ends. */
const PRELAUNCH_BLOCKED_PREFIXES = [
  '/dashboard',
  '/sign-in',
  '/sign-up',
  '/desktop/connect',
] as const

export function isPrelaunchBlockedPath(pathname: string): boolean {
  return PRELAUNCH_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function resolvePrelaunchAuthNext(next: string): string {
  if (isLaunchLive() || !isPrelaunchBlockedPath(next)) return next
  return '/?joined=1'
}

export function shouldBlockPrelaunchAccess(pathname: string, userId?: string | null): boolean {
  if (isLaunchLive()) return false
  if (
    process.env.NODE_ENV === 'development' &&
    (pathname === '/desktop/connect' || pathname.startsWith('/desktop/connect/'))
  ) {
    return false
  }
  if (!isPrelaunchBlockedPath(pathname)) return false
  if (userId && isCreatorUser(userId)) return false
  return true
}
