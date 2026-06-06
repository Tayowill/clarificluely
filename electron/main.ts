import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { app, BrowserWindow, ipcMain, session } from 'electron'
import { registerHandlers } from './ipc/handlers'
import { checkForSignedUpdates, configureUpdater } from './updater'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
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

  registerHandlers(mainWindow)

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
  await configureUpdater()
  await initializeStorage()
  createWindow()

  if (!isDev) {
    void checkForSignedUpdates()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
