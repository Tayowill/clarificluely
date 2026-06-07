/** When Supabase sends OAuth to Site URL (/?code=...), forward to /auth/callback. */
export function authCallbackRedirectPath(searchParams: URLSearchParams): string | null {
  if (!searchParams.get('code')) return null

  const callback = new URLSearchParams(searchParams)
  if (!callback.has('next')) {
    callback.set('next', '/')
  }
  return `/auth/callback?${callback.toString()}`
}
