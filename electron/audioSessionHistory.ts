import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { SessionRecap } from './llm'
import {
  normalizeTranscriptEntry,
  type SpeakerLabels,
  type TranscriptEntry,
} from './transcriptUtils'

export type AudioSessionChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type StoredAudioSession = {
  id: string
  title: string
  createdAt: number
  endedAt: number
  transcript: TranscriptEntry[]
  recap: SessionRecap | null
  chatMessages: AudioSessionChatMessage[]
  speakerLabels?: SpeakerLabels
}

const AUDIO_SESSIONS_FILE = 'audio-sessions-history.json'
const MAX_SESSIONS = 30
const MAX_CHAT_MESSAGES = 50

function getFilePath(): string {
  return path.join(app.getPath('userData'), AUDIO_SESSIONS_FILE)
}

function trimSession(session: StoredAudioSession): StoredAudioSession {
  const transcript = Array.isArray(session.transcript)
    ? session.transcript
        .filter(
          (entry) =>
            typeof entry.id === 'string' &&
            typeof entry.text === 'string' &&
            (entry.source === 'mic' || entry.source === 'system'),
        )
        .map((entry) =>
          normalizeTranscriptEntry({
            id: entry.id,
            text: entry.text,
            source: entry.source,
            speaker: typeof entry.speaker === 'string' ? entry.speaker : undefined,
            at: typeof entry.at === 'number' ? entry.at : Date.now(),
          }),
        )
        .slice(-500)
    : []

  const speakerLabels: SpeakerLabels = {}
  if (session.speakerLabels && typeof session.speakerLabels === 'object') {
    for (const [key, value] of Object.entries(session.speakerLabels)) {
      if (typeof key === 'string' && typeof value === 'string' && value.trim()) {
        speakerLabels[key] = value.trim().slice(0, 48)
      }
    }
  }

  return {
    ...session,
    title: session.title.slice(0, 80),
    transcript,
    chatMessages: Array.isArray(session.chatMessages)
      ? session.chatMessages.slice(-MAX_CHAT_MESSAGES)
      : [],
    speakerLabels,
  }
}

export function loadAudioSessions(): StoredAudioSession[] {
  try {
    const raw = fs.readFileSync(getFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as StoredAudioSession[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (s) =>
          typeof s.id === 'string' &&
          typeof s.title === 'string' &&
          typeof s.createdAt === 'number' &&
          typeof s.endedAt === 'number' &&
          Array.isArray(s.transcript),
      )
      .map(trimSession)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SESSIONS)
  } catch {
    return []
  }
}

function writeSessions(sessions: StoredAudioSession[]): StoredAudioSession[] {
  const trimmed = sessions
    .map(trimSession)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_SESSIONS)
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(getFilePath(), JSON.stringify(trimmed))
  } catch (err) {
    console.error('Failed to save audio sessions:', err)
  }
  notifyAudioSessionsChanged(trimmed)
  return trimmed
}

export function notifyAudioSessionsChanged(sessions?: StoredAudioSession[]): void {
  const payload = sessions ?? loadAudioSessions()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('audio-sessions:changed', { sessions: payload })
    }
  }
}

export function saveAudioSession(session: StoredAudioSession): StoredAudioSession[] {
  const existing = loadAudioSessions()
  const trimmed = trimSession(session)
  const idx = existing.findIndex((s) => s.id === trimmed.id)
  if (idx >= 0) {
    existing[idx] = trimmed
  } else {
    existing.unshift(trimmed)
  }
  return writeSessions(existing)
}

export function deleteAudioSession(id: string): StoredAudioSession[] {
  return writeSessions(loadAudioSessions().filter((s) => s.id !== id))
}

export function renameAudioSession(id: string, title: string): StoredAudioSession[] {
  const trimmedTitle = title.trim().slice(0, 80)
  if (!trimmedTitle) return loadAudioSessions()
  const existing = loadAudioSessions()
  const idx = existing.findIndex((s) => s.id === id)
  if (idx < 0) return existing
  existing[idx] = { ...existing[idx], title: trimmedTitle }
  return writeSessions(existing)
}

export function getAudioSessionById(id: string): StoredAudioSession | null {
  return loadAudioSessions().find((s) => s.id === id) ?? null
}

export function updateAudioSessionSpeakerLabels(
  id: string,
  speakerLabels: SpeakerLabels,
): StoredAudioSession[] {
  const existing = loadAudioSessions()
  const idx = existing.findIndex((s) => s.id === id)
  if (idx < 0) return existing
  existing[idx] = {
    ...existing[idx],
    speakerLabels,
  }
  return writeSessions(existing)
}

export function updateAudioSessionChat(
  id: string,
  chatMessages: AudioSessionChatMessage[],
): StoredAudioSession[] {
  const existing = loadAudioSessions()
  const idx = existing.findIndex((s) => s.id === id)
  if (idx < 0) return existing
  existing[idx] = {
    ...existing[idx],
    chatMessages: chatMessages.slice(-MAX_CHAT_MESSAGES),
  }
  return writeSessions(existing)
}

export function clearAudioSessions(): StoredAudioSession[] {
  return writeSessions([])
}
