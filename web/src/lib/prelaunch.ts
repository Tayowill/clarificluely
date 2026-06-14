import { isCreatorUser } from '@/lib/creator'
import { isLaunchLive } from '@/lib/waitlist-config'

/** App surfaces that stay closed until the public launch countdown ends. */
const PRELAUNCH_BLOCKED_PREFIXES = [
  '/dashboard',
  '/desktop/connect',
] as const

export function pathFromNext(next: string): string {
  return next.split('?')[0] || next
}

export function isBillingCheckoutNext(next: string): boolean {
  return pathFromNext(next) === '/billing'
}

export function isPrelaunchBlockedPath(pathname: string): boolean {
  const path = pathFromNext(pathname)
  return PRELAUNCH_BLOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

export function resolvePrelaunchAuthNext(next: string): string {
  if (isLaunchLive() || !isPrelaunchBlockedPath(next)) return next
  return '/?joined=1'
}

/** Where to send the user after sign-in during prelaunch. */
export function resolvePostAuthRedirect(next: string): string {
  if (isLaunchLive()) return next
  if (isBillingCheckoutNext(next)) return next
  if (next === '/' || next.startsWith('/?')) return '/?joined=1'
  return resolvePrelaunchAuthNext(next)
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
