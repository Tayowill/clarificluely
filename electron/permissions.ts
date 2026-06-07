import { shell, systemPreferences } from 'electron'

export type PermissionKind = 'accessibility' | 'microphone' | 'screen'

export type PermissionStatuses = {
  accessibility: boolean
  microphone: boolean
  screen: boolean
}

function mapMediaStatus(status: string): boolean {
  return status === 'granted'
}

export function getPermissionStatuses(): PermissionStatuses {
  const accessibility =
    process.platform === 'darwin'
      ? systemPreferences.isTrustedAccessibilityClient(false)
      : true

  const microphone =
    process.platform === 'darwin'
      ? mapMediaStatus(systemPreferences.getMediaAccessStatus('microphone'))
      : true

  const screen =
    process.platform === 'darwin'
      ? mapMediaStatus(systemPreferences.getMediaAccessStatus('screen'))
      : true

  return { accessibility, microphone, screen }
}

export function allPermissionsGranted(statuses: PermissionStatuses): boolean {
  return statuses.accessibility && statuses.microphone && statuses.screen
}

export async function requestPermission(kind: PermissionKind): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true
  }

  switch (kind) {
    case 'accessibility':
      return systemPreferences.isTrustedAccessibilityClient(true)
    case 'microphone':
      return systemPreferences.askForMediaAccess('microphone')
    case 'screen':
      // macOS only grants screen capture after user enables it in System Settings.
      openPermissionSettings('screen')
      return mapMediaStatus(systemPreferences.getMediaAccessStatus('screen'))
    default:
      return false
  }
}

export function openPermissionSettings(kind: PermissionKind): void {
  if (process.platform !== 'darwin') {
    return
  }

  const urls: Record<PermissionKind, string> = {
    accessibility:
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    microphone:
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
    screen:
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  }

  void shell.openExternal(urls[kind])
}
