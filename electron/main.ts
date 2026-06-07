import * as path from 'path'

import { app, BrowserWindow, globalShortcut, systemPreferences } from 'electron'
import { exchangeAuthToken } from './deviceAuth'
import { registerHandlers } from './ipc/handlers'
import { loadRuntimeEnv } from './keys'
import { queueAuthUrl, takePendingAuthUrl } from './protocolAuth'
import { checkForSignedUpdates, configureUpdater } from './updater'
import {
  createOverlayWindow,
  getOverlayWindow,
  toggleOverlayVisibility,
} from './overlay'
import { stopOverlayFollow } from './overlayPosition'

// Best-effort: helps setContentProtection on older macOS capture paths (may not affect ScreenCaptureKit/Meet)
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-features', 'IOSurfaceCapturer')
}

const isDev = !app.isPackaged
const PROTOCOL = 'clarifi'

let mainWindow: BrowserWindow | null = null

async function handleAuthDeepLink(url: string): Promise<void> {
  const result = await exchangeAuthToken(url)
  if (result.ok) {
    console.log('Desktop connected via web auth')
  } else {
    console.error('Desktop auth exchange failed:', result.error)
  }
}

function registerProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

if (process.platform === 'darwin') {
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url.startsWith(`${PROTOCOL}://`)) {
      if (app.isReady()) {
        void handleAuthDeepLink(url)
      } else {
        queueAuthUrl(url)
      }
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const authUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (authUrl) void handleAuthDeepLink(authUrl)
  })
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !isDev,
      allowRunningInsecureContent: false,
    },
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com; media-src 'self'; object-src 'none';",
          ],
        },
      })
    })
  }

  if (isDev) {
    mainWindow.webContents.openDevTools()
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

async function initializeStorage(): Promise<void> {
  try {
    const { getKey } = await import('./store')
    await getKey('__storage_healthcheck__')
  } catch (err) {
    console.error('Storage init failed:', err)
  }
}

app.whenReady().then(async () => {
  loadRuntimeEnv()
  registerProtocolClient()

  const pending = takePendingAuthUrl()
  if (pending) await handleAuthDeepLink(pending)

  if (!isDev && process.argv.length > 1) {
    const authArg = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (authArg) await handleAuthDeepLink(authArg)
  }

  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }

  await configureUpdater()
  await initializeStorage()

  registerHandlers()

  if (isDev) {
    const window = createWindow()
    window.webContents.once('did-finish-load', () => {
      createOverlayWindow()
    })
  } else {
    // Production: overlay only (no "MyApp" dev shell window).
    createOverlayWindow()
  }

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleOverlayVisibility()
  })

  if (!isDev) {
    void checkForSignedUpdates()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopOverlayFollow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (isDev) {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
    return
  }

  const overlay = getOverlayWindow()
  if (!overlay || overlay.isDestroyed()) {
    createOverlayWindow()
  } else if (!overlay.isVisible()) {
    overlay.showInactive()
  }
})
