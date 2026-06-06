import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

const ALLOWED_UPDATE_HOSTS = ['github.com', 'api.github.com'] as const

export async function configureUpdater(): Promise<void> {
  if (!app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.allowDowngrade = false

  autoUpdater.on('update-available', () => {
    // User must explicitly approve before download begins.
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error.message)
  })

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: process.env.GH_UPDATE_OWNER ?? 'your-org',
    repo: process.env.GH_UPDATE_REPO ?? 'my-app',
  })

  autoUpdater.requestHeaders = {}

  const originalCheckForUpdates = autoUpdater.checkForUpdates.bind(autoUpdater)

  autoUpdater.checkForUpdates = async () => {
    const feedUrl = autoUpdater.getFeedURL()
    if (typeof feedUrl === 'string') {
      const hostname = new URL(feedUrl).hostname
      if (!ALLOWED_UPDATE_HOSTS.includes(hostname as (typeof ALLOWED_UPDATE_HOSTS)[number])) {
        throw new Error(`Blocked update from untrusted host: ${hostname}`)
      }
    }
    return originalCheckForUpdates()
  }
}

export async function checkForSignedUpdates(): Promise<void> {
  if (!app.isPackaged) {
    return
  }
  await autoUpdater.checkForUpdates()
}
