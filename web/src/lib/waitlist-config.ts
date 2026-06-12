/** Public launch — August 24, 2026 at 9:00 AM Pacific */
export const WAITLIST_LAUNCH_AT = new Date('2026-08-24T16:00:00.000Z')

export function isLaunchLive(now = Date.now()): boolean {
  return now >= WAITLIST_LAUNCH_AT.getTime()
}

export function getLaunchCountdown(now = Date.now()) {
  const diff = Math.max(0, WAITLIST_LAUNCH_AT.getTime() - now)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, isLive: isLaunchLive(now) }
}
