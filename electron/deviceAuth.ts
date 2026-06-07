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

export async function isDevicePaired(): Promise<boolean> {
  const creds = await getDeviceCredentials()
  const baseUrl = getClarifiApiUrl()
  if (!creds || !baseUrl) return false

  try {
    const response = await fetch(`${baseUrl}/api/desktop/status`, {
      headers: {
        'X-Clarifi-Device-Id': creds.deviceId,
        'X-Clarifi-Device-Secret': creds.deviceSecret,
      },
    })
    if (!response.ok) return false
    const data = (await response.json()) as { paired?: boolean }
    return Boolean(data.paired)
  } catch {
    return false
  }
}

export { exchangeAuthToken, getBillingUrl, getConnectPageUrl, getSignInUrl } from './protocolAuth'
