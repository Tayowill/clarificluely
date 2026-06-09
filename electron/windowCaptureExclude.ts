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
    path.join(__dirname, '../resources/window_capture_exclude.node'),
    path.join(app.getAppPath(), 'resources/window_capture_exclude.node'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
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
      captureModule = null
      return null
    }
    captureModule = require(modulePath) as CaptureExcludeModule
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
