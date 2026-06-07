import { BrowserView, BrowserWindow } from 'electron'
import { exchangeAuthToken } from './deviceAuth'
import { notifyOnboardingAuthConnected } from './onboarding'
import { getSignInUrl } from './protocolAuth'

type PaneBounds = {
  x: number
  y: number
  width: number
  height: number
}

let authPaneView: BrowserView | null = null
let parentWindow: BrowserWindow | null = null
let lastBounds: PaneBounds | null = null
let isVisible = false

export function setAuthPaneParent(window: BrowserWindow | null): void {
  parentWindow = window
  if (!window) {
    hideAuthPane()
  }
}

function applyBounds(bounds: PaneBounds): void {
  if (!authPaneView || !parentWindow || parentWindow.isDestroyed()) return
  const width = Math.max(Math.round(bounds.width), 200)
  const height = Math.max(Math.round(bounds.height), 320)
  const x = Math.round(bounds.x)
  const y = Math.round(bounds.y)
  authPaneView.setBounds({ x, y, width, height })
  authPaneView.setAutoResize({ width: false, height: false })
}

async function handleClarifiAuthUrl(url: string): Promise<boolean> {
  if (!url.startsWith('clarifi://')) return false
  const result = await exchangeAuthToken(url)
  if (result.ok) {
    notifyOnboardingAuthConnected()
    hideAuthPane()
  }
  return true
}

function attachAuthPaneHandlers(view: BrowserView): void {
  const wc = view.webContents

  wc.on('will-navigate', (event, url) => {
    if (url.startsWith('clarifi://')) {
      event.preventDefault()
      void handleClarifiAuthUrl(url)
    }
  })

  wc.on('will-redirect', (event, url) => {
    if (url.startsWith('clarifi://')) {
      event.preventDefault()
      void handleClarifiAuthUrl(url)
    }
  })

  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('clarifi://')) {
      void handleClarifiAuthUrl(url)
      return { action: 'deny' }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void wc.loadURL(url)
      return { action: 'deny' }
    }
    return { action: 'deny' }
  })
}

function ensureAuthPaneView(): BrowserView {
  if (authPaneView && !authPaneView.webContents.isDestroyed()) {
    return authPaneView
  }

  authPaneView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  attachAuthPaneHandlers(authPaneView)
  return authPaneView
}

export function showAuthPane(url?: string): void {
  if (!parentWindow || parentWindow.isDestroyed()) return

  const view = ensureAuthPaneView()
  const loadUrl = url || getSignInUrl()

  if (!isVisible) {
    parentWindow.addBrowserView(view)
    isVisible = true
  }

  if (lastBounds) {
    applyBounds(lastBounds)
  }

  const current = view.webContents.getURL()
  if (!current || !current.startsWith(loadUrl.split('?')[0])) {
    void view.webContents.loadURL(loadUrl)
  }
}

export function hideAuthPane(): void {
  if (!authPaneView || !parentWindow || parentWindow.isDestroyed()) {
    isVisible = false
    return
  }

  try {
    parentWindow.removeBrowserView(authPaneView)
  } catch {
    // already removed
  }
  isVisible = false
}

export function syncAuthPaneBounds(bounds: PaneBounds): void {
  lastBounds = bounds
  if (!isVisible) return
  applyBounds(bounds)
}

export function reapplyAuthPaneBounds(): void {
  if (lastBounds && isVisible) {
    applyBounds(lastBounds)
  }
}

export function destroyAuthPane(): void {
  hideAuthPane()
  if (authPaneView && !authPaneView.webContents.isDestroyed()) {
    authPaneView.webContents.close()
  }
  authPaneView = null
  lastBounds = null
}
