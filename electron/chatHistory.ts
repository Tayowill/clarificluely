import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  usedScreen?: boolean
}

export type ChatSession = {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
}

const CHAT_HISTORY_FILE = 'chat-history.json'
const MAX_SESSIONS = 20
const MAX_MESSAGES_PER_SESSION = 50

function getChatHistoryFilePath(): string {
  return path.join(app.getPath('userData'), CHAT_HISTORY_FILE)
}

function trimSession(session: ChatSession): ChatSession {
  return {
    ...session,
    title: session.title.slice(0, 80),
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
  }
}

export function loadChatSessions(): ChatSession[] {
  try {
    const raw = fs.readFileSync(getChatHistoryFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as ChatSession[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (s) =>
          typeof s.id === 'string' &&
          typeof s.title === 'string' &&
          typeof s.createdAt === 'number' &&
          Array.isArray(s.messages),
      )
      .map(trimSession)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SESSIONS)
  } catch {
    return []
  }
}

function writeChatSessions(sessions: ChatSession[]): ChatSession[] {
  const trimmed = sessions
    .map(trimSession)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_SESSIONS)
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(getChatHistoryFilePath(), JSON.stringify(trimmed))
  } catch (err) {
    console.error('Failed to save chat history:', err)
  }
  return trimmed
}

export function saveChatSession(session: ChatSession): ChatSession[] {
  const existing = loadChatSessions()
  const trimmed = trimSession(session)
  const idx = existing.findIndex((s) => s.id === trimmed.id)
  if (idx >= 0) {
    existing[idx] = trimmed
  } else {
    existing.unshift(trimmed)
  }
  return writeChatSessions(existing)
}

export function deleteChatSession(id: string): ChatSession[] {
  const existing = loadChatSessions().filter((s) => s.id !== id)
  return writeChatSessions(existing)
}

export function clearChatSessions(): ChatSession[] {
  return writeChatSessions([])
}
