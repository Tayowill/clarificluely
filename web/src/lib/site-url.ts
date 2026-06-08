const DEFAULT_SITE_URL = 'https://www.clarifiapp.com'

/** Canonical origin for OAuth redirects — avoids www/non-www PKCE cookie mismatches. */
export function getSiteOrigin(requestOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location
    if (hostname === 'clarifiapp.com' || hostname === 'www.clarifiapp.com') {
      return DEFAULT_SITE_URL
    }
    return origin
  }

  if (requestOrigin) {
    try {
      const host = new URL(requestOrigin).hostname
      if (host === 'clarifiapp.com' || host === 'www.clarifiapp.com') {
        return DEFAULT_SITE_URL
      }
      return requestOrigin.replace(/\/$/, '')
    } catch {
      return DEFAULT_SITE_URL
    }
  }

  return DEFAULT_SITE_URL
}

export function authCallbackUrl(next = '/', origin?: string): string {
  const safeNext = next.startsWith('/') ? next : '/'
  // Match the current browser host so PKCE verifier cookies stay on the same origin.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
  }
  return `${getSiteOrigin(origin)}/auth/callback?next=${encodeURIComponent(safeNext)}`
}
