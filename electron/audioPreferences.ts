import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type AudioPreferences = {
  transcriptionLanguage: string
  outputLanguage: string
  preferredMicrophoneId: string
  preferredMicrophoneLabel: string
}

const PREFS_FILE = 'audio-preferences.json'

const DEFAULTS: AudioPreferences = {
  transcriptionLanguage: 'en',
  outputLanguage: 'en',
  preferredMicrophoneId: '',
  preferredMicrophoneLabel: '',
}

const OUTPUT_LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
}

function prefsPath(): string {
  return path.join(app.getPath('userData'), PREFS_FILE)
}

let cached: AudioPreferences | null = null

export function loadAudioPreferences(): AudioPreferences {
  if (cached) return cached
  try {
    const raw = fs.readFileSync(prefsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>
    cached = {
      transcriptionLanguage:
        typeof parsed.transcriptionLanguage === 'string'
          ? parsed.transcriptionLanguage
          : DEFAULTS.transcriptionLanguage,
      outputLanguage:
        typeof parsed.outputLanguage === 'string'
          ? parsed.outputLanguage
          : DEFAULTS.outputLanguage,
      preferredMicrophoneId:
        typeof parsed.preferredMicrophoneId === 'string'
          ? parsed.preferredMicrophoneId
          : DEFAULTS.preferredMicrophoneId,
      preferredMicrophoneLabel:
        typeof parsed.preferredMicrophoneLabel === 'string'
          ? parsed.preferredMicrophoneLabel
          : DEFAULTS.preferredMicrophoneLabel,
    }
    return cached
  } catch {
    cached = { ...DEFAULTS }
    return cached
  }
}

export function saveAudioPreferences(prefs: AudioPreferences): void {
  cached = prefs
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs, null, 2))
  } catch (err) {
    console.error('Failed to save audio preferences:', err)
  }
  notifyAudioPrefsChanged()
}

export function getTranscriptionLanguage(): string {
  return loadAudioPreferences().transcriptionLanguage
}

export function getOutputLanguage(): string {
  return loadAudioPreferences().outputLanguage
}

export function getOutputLanguageInstruction(): string {
  const code = getOutputLanguage()
  const label = OUTPUT_LANGUAGE_LABELS[code] ?? 'English'
  if (code === 'en') return ''
  return `\n\nRespond in ${label}.`
}

export function notifyAudioPrefsChanged(): void {
  const payload = loadAudioPreferences()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('audio:prefs-changed', payload)
    }
  }
}
