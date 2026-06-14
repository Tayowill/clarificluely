import { cookies } from 'next/headers'
import {
  DEV_LAUNCH_PREVIEW_COOKIE,
  devLaunchPreviewCookieOptions,
  isDevEnvironment,
  resolveDevLaunchPreview,
} from '@/lib/launch-preview'

export async function getServerDevLaunchPreview(
  previewFromQuery?: string | null,
): Promise<boolean> {
  if (!isDevEnvironment()) return false
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(DEV_LAUNCH_PREVIEW_COOKIE)?.value ?? null
  return resolveDevLaunchPreview(
    previewFromQuery != null ? { preview: previewFromQuery } : null,
    cookieValue,
  )
}

export function applyDevLaunchPreviewCookies(
  response: {
    cookies: {
      set: (name: string, value: string, options?: object) => void
      delete: (name: string) => void
    }
  },
  preview: string | null,
): void {
  if (!isDevEnvironment() || !preview) return

  if (preview === 'live') {
    response.cookies.set(DEV_LAUNCH_PREVIEW_COOKIE, '1', devLaunchPreviewCookieOptions())
    return
  }

  if (preview === 'waitlist') {
    response.cookies.delete(DEV_LAUNCH_PREVIEW_COOKIE)
  }
}
