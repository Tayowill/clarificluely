export const DEV_LAUNCH_PREVIEW_COOKIE = 'clarifi_dev_launch_preview'

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export type SearchParamsLike =
  | { get(name: string): string | null | undefined }
  | { preview?: string | null | undefined }

function getPreviewParam(searchParams?: SearchParamsLike | null): string | null | undefined {
  if (!searchParams) return undefined
  if ('get' in searchParams && typeof searchParams.get === 'function') {
    return searchParams.get('preview')
  }
  if ('preview' in searchParams) {
    return searchParams.preview
  }
  return undefined
}

/** Dev-only: ?preview=live shows post-launch UI; ?preview=waitlist clears it. */
export function resolveDevLaunchPreview(
  searchParams?: SearchParamsLike | null,
  cookieValue?: string | null,
): boolean {
  if (!isDevEnvironment()) return false

  const preview = getPreviewParam(searchParams)
  if (preview === 'waitlist') return false
  if (preview === 'live') return true

  return cookieValue === '1'
}

export function devLaunchPreviewCookieOptions() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    httpOnly: false,
    maxAge: 60 * 60 * 24,
  }
}

function readPreviewCookieClient(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${DEV_LAUNCH_PREVIEW_COOKIE}=`))
  return match?.split('=')[1] ?? null
}

/** Dev-only query suffix for links while previewing post-launch UI. */
export function devPreviewHref(path: string): string {
  if (!isDevEnvironment() || typeof window === 'undefined') return path
  const active = resolveDevLaunchPreview(
    { preview: new URLSearchParams(window.location.search).get('preview') },
    readPreviewCookieClient(),
  )
  if (!active) return path
  const [base, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('preview', 'live')
  const qs = params.toString()
  return qs ? `${base}?${qs}` : path
}
