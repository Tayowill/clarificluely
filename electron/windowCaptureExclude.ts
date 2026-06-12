import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

type CaptureExcludeModule = {
  setCaptureExclude: (nativeHandle: Buffer, exclude: boolean) => boolean
}

let captureModule: CaptureExcludeModule | null | undefined

function resolveNativeModulePath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'window_capture_exclude.node'),
    path.join(__dirname, 'resources/window_capture_exclude.node'),
    path.join(__dirname, '../resources/window_capture_exclude.node'),
    path.join(app.getAppPath(), 'resources/window_capture_exclude.node'),
  ]

  if (!app.isPackaged) {
    candidates.push(path.join(process.cwd(), 'resources/window_capture_exclude.node'))
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  console.warn('[stealth] window_capture_exclude.node not found. Tried:', candidates)
  return null
}

function loadCaptureModule(): CaptureExcludeModule | null {
  if (captureModule !== undefined) {
    return captureModule
  }

  if (process.platform !== 'darwin') {
    captureModule = null
    return null
  }

  try {
    const modulePath = resolveNativeModulePath()
    if (!modulePath) {
      console.warn(
        '[stealth] ScreenCaptureKit exclusion unavailable — stealth hide-from-share will not work on macOS 15+',
      )
      captureModule = null
      return null
    }
    captureModule = require(modulePath) as CaptureExcludeModule
    console.log('[stealth] loaded native capture-exclusion module from', modulePath)
    return captureModule
  } catch (err) {
    console.warn('[stealth] Failed to load window_capture_exclude native module:', err)
    captureModule = null
    return null
  }
}

/** macOS 15+: exclude overlay from ScreenCaptureKit via private CGS APIs. */
export function applyMacCaptureExclusion(nativeHandle: Buffer, exclude: boolean): boolean {
  const mod = loadCaptureModule()
  if (!mod?.setCaptureExclude) {
    return false
  }
  try {
    return mod.setCaptureExclude(nativeHandle, exclude)
  } catch (err) {
    console.warn('[stealth] setCaptureExclude failed:', err)
    return false
  }
}

export function isMacCaptureExclusionAvailable(): boolean {
  return loadCaptureModule() !== null
}
