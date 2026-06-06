import { app, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const KEYTAR_SERVICE = 'clarifi'

async function loadKeytar(): Promise<{
  setPassword: (service: string, account: string, password: string) => Promise<void>
  getPassword: (service: string, account: string) => Promise<string | null>
  deletePassword: (service: string, account: string) => Promise<boolean>
} | null> {
  try {
    const keytarModule = await import('keytar')
    const keytar = keytarModule.default ?? keytarModule
    return keytar as {
      setPassword: (service: string, account: string, password: string) => Promise<void>
      getPassword: (service: string, account: string) => Promise<string | null>
      deletePassword: (service: string, account: string) => Promise<boolean>
    }
  } catch {
    return null
  }
}

function encryptedFilePath(service: string): string {
  return path.join(app.getPath('userData'), `${service}.enc`)
}

export async function saveKey(service: string, key: string): Promise<void> {
  try {
    const keytar = await loadKeytar()
    if (keytar) {
      await keytar.setPassword(KEYTAR_SERVICE, service, key)
      return
    }
  } catch {
    // fall through to safeStorage
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key)
      const filePath = encryptedFilePath(service)
      fs.writeFileSync(filePath, encrypted)
      return
    }
  } catch {
    // fall through
  }

  throw new Error('No secure storage available')
}

export async function getKey(service: string): Promise<string | null> {
  try {
    const keytar = await loadKeytar()
    if (keytar) {
      return await keytar.getPassword(KEYTAR_SERVICE, service)
    }
  } catch {
    // fall through to safeStorage
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const filePath = encryptedFilePath(service)
      if (fs.existsSync(filePath)) {
        const encrypted = fs.readFileSync(filePath)
        return safeStorage.decryptString(Buffer.from(encrypted))
      }
    }
  } catch {
    // fall through
  }

  return null
}

export async function deleteKey(service: string): Promise<void> {
  try {
    const keytar = await loadKeytar()
    if (keytar) {
      await keytar.deletePassword(KEYTAR_SERVICE, service)
    }
  } catch {
    // fall through
  }

  try {
    const filePath = encryptedFilePath(service)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // ignore cleanup errors
  }
}
