import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  OVERLAY_HEIGHT_COLLAPSED,
  OVERLAY_HEIGHT_EXPANDED,
  OVERLAY_HEIGHT_CHAT,
  OVERLAY_WIDTH,
  clampPosition,
  clampSize,
  getDefaultPosition,
  loadOverlayPosition,
  loadOverlaySize,
  onOverlayMoved,
  saveOverlaySize,
  setFollowEnabled,
  setOverlayBounds,
  startOverlayFollow,
  stopOverlayFollow,
  toggleOverlayFollow as toggleFollowInternal,
  isOverlayFollowEnabled,
} from './overlayPosition'

let overlayWindow: BrowserWindow | null = null

const SETTINGS_FILE = 'overlay-settings.json'

type OverlaySettings = {
  contentProtection: boolean
  followEnabled?: boolean
}

let contentProtectionEnabled = true

/**
 * STEALTH_LIMITATIONS (macOS):
 * Google Meet and Chrome use ScreenCaptureKit, which may capture the overlay
 * despite setContentProtection(true). Electron sets NSWindowSharingNone but
 * ScreenCaptureKit composites the display framebuffer directly on macOS 14+.
 * We re-apply protection after workspace visibility changes and try IOSurfaceCapturer
 * disable in main.ts — Meet may still show the overlay on some macOS versions.
 */

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

function loadOverlaySettings(): void {
  try {
    const raw = fs.readFileSync(getSettingsFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as OverlaySettings
    if (typeof parsed.contentProtection === 'boolean') {
      contentProtectionEnabled = parsed.contentProtection
    }
    if (typeof parsed.followEnabled === 'boolean') {
      setFollowEnabled(parsed.followEnabled)
    }
  } catch {
    contentProtectionEnabled = true
  }
}

function saveOverlaySettings(): void {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(
      getSettingsFilePath(),
      JSON.stringify({
        contentProtection: contentProtectionEnabled,
        followEnabled: isOverlayFollowEnabled(),
      }),
    )
  } catch (err) {
    console.error('Failed to save overlay settings:', err)
  }
}

function applyContentProtection(window: BrowserWindow): void {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    window.setContentProtection(contentProtectionEnabled)
  }
}

/** Follow ON: visible on all Spaces. Pin ON: stays on current Space only. */
function applyWorkspaceVisibility(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  const follow = isOverlayFollowEnabled()
  if (follow) {
    if (process.platform === 'darwin') {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    } else {
      window.setVisibleOnAllWorkspaces(true)
    }
  } else {
    window.setVisibleOnAllWorkspaces(false)
  }
}

/** Re-apply workspace, stealth, and z-order after hide/show (e.g. screen capture). */
export function reapplyOverlayWindowPolicies(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    applyOverlayWindowPolicies(overlayWindow)
  }
}

/** Apply workspace, stealth, and z-order. Content protection runs AFTER workspace visibility. */
function applyOverlayWindowPolicies(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  applyWorkspaceVisibility(window)
  applyContentProtection(window)
  if (process.platform === 'darwin') {
    window.setAlwaysOnTop(true, 'floating', 1)
  } else {
    window.setAlwaysOnTop(true)
  }
}

export function setContentProtectionEnabled(enabled: boolean): void {
  contentProtectionEnabled = enabled
  if (process.env.NODE_ENV === 'development') {
    console.log('[stealth] contentProtection=', enabled)
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    applyOverlayWindowPolicies(overlayWindow)
  }
  saveOverlaySettings()
}

export function toggleContentProtection(): boolean {
  setContentProtectionEnabled(!contentProtectionEnabled)
  return contentProtectionEnabled
}

export function isContentProtectionEnabled(): boolean {
  return contentProtectionEnabled
}

export function toggleOverlayFollow(): boolean {
  const enabled = toggleFollowInternal()
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    applyOverlayWindowPolicies(overlayWindow)
  }
  saveOverlaySettings()
  return enabled
}

export {
  OVERLAY_WIDTH,
  OVERLAY_HEIGHT_COLLAPSED,
  OVERLAY_HEIGHT_EXPANDED,
  OVERLAY_HEIGHT_CHAT,
  isOverlayFollowEnabled,
}

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive()
    }
    reapplyOverlayWindowPolicies()
    return overlayWindow
  }

  loadOverlaySettings()

  const saved = loadOverlayPosition()
  const savedSize = loadOverlaySize()
  const initialWidth = savedSize.width
  const initialHeight = OVERLAY_HEIGHT_COLLAPSED
  const initial = clampPosition(
    saved?.x ?? getDefaultPosition(initialWidth, initialHeight).x,
    saved?.y ?? getDefaultPosition(initialWidth, initialHeight).y,
    initialWidth,
    initialHeight,
  )

  overlayWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initial.x,
    y: initial.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  attachMovePersistence(overlayWindow)
  startOverlayFollow(overlayWindow)
  applyOverlayWindowPolicies(overlayWindow)

  overlayWindow.on('show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      applyOverlayWindowPolicies(overlayWindow)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    const loadDevOverlay = () => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        void overlayWindow.loadURL(`${devUrl}/overlay.html`)
      }
    }
    // Load immediately; retry briefly if Vite is still starting.
    loadDevOverlay()
    setTimeout(loadDevOverlay, 800)
  } else {
    if (!overlayWindow.isDestroyed()) {
      overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'))
    }
  }

  return overlayWindow
}

function attachMovePersistence(window: BrowserWindow): void {
  window.on('moved', () => {
    onOverlayMoved(window)
  })
}

export function destroyOverlayWindow(): void {
  stopOverlayFollow()
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy()
  }
  overlayWindow = null
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function toggleOverlayVisibility(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.showInactive()
    applyOverlayWindowPolicies(overlayWindow)
  }
}

export function setOverlayInteractive(interactive: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setFocusable(interactive)
  if (interactive) {
    overlayWindow.focus()
  }
}

export function setOverlayHeight(height: number): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const { width } = overlayWindow.getBounds()
  setOverlaySize(width, height)
}

export function setOverlaySize(
  width: number,
  height: number,
  persist = true,
  x?: number,
  y?: number,
): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const clamped = clampSize(width, height)
  const [currentX, currentY] = overlayWindow.getPosition()
  const posX = typeof x === 'number' && Number.isFinite(x) ? x : currentX
  const posY = typeof y === 'number' && Number.isFinite(y) ? y : currentY
  const position = clampPosition(posX, posY, clamped.width, clamped.height)
  setOverlayBounds(
    overlayWindow,
    position.x,
    position.y,
    clamped.width,
    clamped.height,
    true,
  )
  if (persist) {
    saveOverlaySize(clamped.width, clamped.height)
  }
}

export function getOverlaySize(): { width: number; height: number } {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return loadOverlaySize()
  }
  const bounds = overlayWindow.getBounds()
  return { width: bounds.width, height: bounds.height }
}
