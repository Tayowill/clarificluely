import { auth } from '@clerk/nextjs/server'
import { createDesktopAuthToken } from '@/lib/device-auth'

export async function POST() {
  const session = await auth()
  if (!session.userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await createDesktopAuthToken(session.userId)
  if (!result) {
    return Response.json({ error: 'token_creation_failed' }, { status: 503 })
  }

  const deepLink = `clarifi://auth?token=${encodeURIComponent(result.token)}`

  return Response.json({
    token: result.token,
    expiresAt: result.expiresAt,
    deepLink,
  })
}
