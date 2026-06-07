import { app } from 'electron'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { getPackagedApiUrl } from './app-config'
import { getKey } from './store'

let envLoaded = false

/** Load API keys from .env.local (dev) or userData/.env (packaged). Never bake keys into the build. */
export function loadRuntimeEnv(): void {
  if (envLoaded) return
  envLoaded = true

  if (!app.isPackaged) {
    const devEnv = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(devEnv)) {
      dotenv.config({ path: devEnv })
    }
    return
  }

  const userEnv = path.join(app.getPath('userData'), '.env')
  if (fs.existsSync(userEnv)) {
    dotenv.config({ path: userEnv })
  }
}

export async function getAnthropicApiKey(): Promise<string | null> {
  loadRuntimeEnv()
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return process.env.ANTHROPIC_API_KEY.trim()
  }
  return getKey('anthropic')
}

export async function getGroqApiKey(): Promise<string | null> {
  loadRuntimeEnv()
  if (process.env.GROQ_API_KEY?.trim()) {
    return process.env.GROQ_API_KEY.trim()
  }
  return getKey('groq')
}

/** Clarifi cloud API — desktop connects via clarifi:// auth from the website. */
export function getClarifiApiUrl(): string | null {
  loadRuntimeEnv()
  const url = process.env.CLARIFI_API_URL?.trim()
  if (url) return url
  if (app.isPackaged) return getPackagedApiUrl()
  return null
}
