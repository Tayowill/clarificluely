import fetch from 'node-fetch'
import { getClarifiApiUrl } from './keys'
import { getKey } from './store'
import { exchangeAuthToken, getConnectPageUrl } from './protocolAuth'

const DEVICE_ID_KEY = 'device_id'
const DEVICE_SECRET_KEY = 'device_secret'

export async function getDeviceCredentials(): Promise<{
  deviceId: string
  deviceSecret: string
} | null> {
  const deviceId = await getKey(DEVICE_ID_KEY)
  const deviceSecret = await getKey(DEVICE_SECRET_KEY)
  if (!deviceId || !deviceSecret) return null
  return { deviceId, deviceSecret }
}

export type ConnectedAccount = {
  provider: string
  label: string
  email?: string
}

export type DeviceProfile = {
  paired: boolean
  userId?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  localAvatarUrl?: string
  connectedAccounts?: ConnectedAccount[]
  plan?: string
  planLabel?: string
  sessionsToday?: number
  sessionsLimit?: number | null
}

export async function fetchDeviceProfile(): Promise<DeviceProfile> {
  const creds = await getDeviceCredentials()
  const baseUrl = getClarifiApiUrl()
  if (!creds || !baseUrl) return { paired: false }

  try {
    const response = await fetch(`${baseUrl}/api/desktop/profile`, {
      headers: {
        'X-Clarifi-Device-Id': creds.deviceId,
        'X-Clarifi-Device-Secret': creds.deviceSecret,
      },
    })
    if (!response.ok) return { paired: false }
    const data = (await response.json()) as DeviceProfile
    const { getLocalAvatarDataUrl } = await import('./profileLocal')
    const localAvatarUrl = getLocalAvatarDataUrl()
    return {
      ...data,
      paired: Boolean(data.paired),
      localAvatarUrl: localAvatarUrl ?? undefined,
    }
  } catch {
    return { paired: false }
  }
}

export async function updateDeviceProfile(input: {
  firstName: string
  lastName: string
}): Promise<DeviceProfile> {
  const creds = await getDeviceCredentials()
  const baseUrl = getClarifiApiUrl()
  if (!creds || !baseUrl) return { paired: false }

  const response = await fetch(`${baseUrl}/api/desktop/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Clarifi-Device-Id': creds.deviceId,
      'X-Clarifi-Device-Secret': creds.deviceSecret,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) return fetchDeviceProfile()

  const data = (await response.json()) as DeviceProfile
  const { getLocalAvatarDataUrl } = await import('./profileLocal')
  const localAvatarUrl = getLocalAvatarDataUrl()
  return {
    ...data,
    paired: Boolean(data.paired),
    localAvatarUrl: localAvatarUrl ?? undefined,
  }
}

export async function isDevicePaired(): Promise<boolean> {
  const profile = await fetchDeviceProfile()
  return profile.paired
}

export {
  exchangeAuthToken,
  getBillingUrl,
  getConnectPageUrl,
  getDashboardUrl,
  getSignInUrl,
} from './protocolAuth'
