import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import {
  collectParticipants,
  displaySpeakerForEntry,
  entriesToDisplayLines,
  isDiarizedSpeakerLabel,
  speakerColorClass,
  speakerInitial,
  type SpeakerLabels,
} from './lib/transcriptSpeakers'
import './overlay.css'

function ToolbarTooltip({
  label,
  children,
  placement = 'above',
}: {
  label: string
  children: ReactNode
  placement?: 'above' | 'below'
}) {
  return (
    <div className="toolbar-tooltip-wrap">
      <span
        className={`toolbar-tooltip ${placement === 'below' ? 'toolbar-tooltip-below' : ''}`}
        role="tooltip"
      >
        {label}
      </span>
      {children}
    </div>
  )
}

interface Suggestion {
  text: string
  type: 'response' | 'question' | 'action'
}

type SessionEntity = {
  name: string
  type: 'person' | 'company' | 'other'
}

type LiveSessionInsights = {
  meetingIntro: string
  runningSummary: string
  topics: string[]
  entities: SessionEntity[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  keyMoments: string[]
  decisions: string[]
  openQuestions: string[]
}

type SessionRecap = {
  summary: string
  highlights: string[]
  discussionPoints?: string[]
  actionItems: string[]
  decisions?: string[]
  openQuestions: string[]
  recapEmailDraft: string
}

function formatRecapDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

function recapDiscussionPoints(recap: SessionRecap): string[] {
  if (recap.discussionPoints && recap.discussionPoints.length > 0) {
    return recap.discussionPoints
  }
  return recap.highlights ?? []
}

function recapDecisions(recap: SessionRecap): string[] {
  return recap.decisions ?? []
}

type TranscriptEntry = {
  id: string
  text: string
  source: 'mic' | 'system'
  speaker: string
  at: number
}

const MIC_SEGMENT_MS = 5000

function formatTranscriptTime(at: number): string {
  const date = new Date(at)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSessionOffset(at: number, startedAt: number | null): string {
  if (!startedAt) return formatTranscriptTime(at)
  const sec = Math.max(0, Math.floor((at - startedAt) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function feedSpeakerLabel(entry: TranscriptEntry): string {
  const speaker = entry.source === 'mic' ? 'Me' : 'Them'
  return speaker.toUpperCase()
}

function normalizeEntry(entry: TranscriptEntry): TranscriptEntry {
  const speaker = entry.speaker?.trim() ?? ''
  return {
    ...entry,
    speaker: speaker || (entry.source === 'mic' ? 'Me' : 'Them'),
  }
}

function generateAudioSessionTitle(
  recap: SessionRecap | null,
  startedAt: number | null,
): string {
  if (recap?.summary) {
    const sentence = recap.summary.split(/[.!?]/)[0]?.trim()
    if (sentence && sentence.length > 0) {
      return sentence.slice(0, 80)
    }
  }
  const date = new Date(startedAt ?? Date.now())
  return `Audio session ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function parseTranscriptPayload(
  payload: unknown,
): { recent: TranscriptEntry[]; full: TranscriptEntry[] } | null {
  if (Array.isArray(payload)) {
    const legacy = (payload as string[]).map((text, index) => ({
      id: `legacy-${index}`,
      text,
      source: 'mic' as const,
      speaker: 'Me',
      at: Date.now(),
    }))
    return { recent: legacy, full: legacy }
  }

  const data = payload as { recent?: TranscriptEntry[]; full?: TranscriptEntry[] }
  if (!Array.isArray(data?.full)) return null

  return {
    recent: (Array.isArray(data.recent) ? data.recent : data.full).map(normalizeEntry),
    full: data.full.map(normalizeEntry),
  }
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  usedScreen?: boolean
}

type ChatSession = {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
  archived?: boolean
}

type PanelMode =
  | 'bar'
  | 'chat'
  | 'history'
  | 'audio_sessions'
  | 'audio_session_detail'
  | 'live_session'
  | 'session_recap'

type AudioSessionChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type StoredAudioSession = {
  id: string
  title: string
  createdAt: number
  endedAt: number
  transcript: TranscriptEntry[]
  recap: SessionRecap | null
  chatMessages: AudioSessionChatMessage[]
  speakerLabels?: SpeakerLabels
}

type ConnectionState = 'loading' | 'connected' | 'needs_connect' | 'optional'

type ModelConfig = {
  id: string
  label: string
  provider: string
  modelId: string
  builtin?: boolean
}

type ModeConfig = {
  id: string
  label: string
  category?: string
  systemPrompt: string
  isActive: boolean
}

type PublicPreferences = {
  activeModelId: string
  models: ModelConfig[]
  activeModeId: string
  modes: ModeConfig[]
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function sessionTitleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  const raw = firstUser?.content ?? 'Chat'
  return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function renderInlineBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let listItems: ReactNode[] = []

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="chat-md-list">
          {listItems}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList(`gap-${idx}`)
      return
    }
    if (trimmed.startsWith('- ')) {
      listItems.push(
        <li key={idx}>{renderInlineBold(trimmed.slice(2))}</li>,
      )
      return
    }
    flushList(`pre-${idx}`)
    if (trimmed.endsWith(':') && trimmed.length < 40 && !trimmed.includes('.')) {
      elements.push(
        <div key={idx} className="chat-md-heading">
          {trimmed}
        </div>,
      )
    } else {
      elements.push(
        <p key={idx} className="chat-md-paragraph">
          {renderInlineBold(trimmed)}
        </p>,
      )
    }
  })
  flushList('end')
  return <>{elements}</>
}

function ChatThread({
  messages,
  onCopy,
  copiedIndex,
}: {
  messages: ChatMessage[]
  onCopy?: (text: string, index: number) => void
  copiedIndex?: number | null
}) {
  return (
    <div>
      {messages.map((msg, i) =>
        msg.role === 'user' ? (
          <div key={i} className="chat-user-row">
            <div className="chat-user-bubble">{msg.content}</div>
          </div>
        ) : (
          <div key={i} className="chat-assistant-block">
            {msg.usedScreen && (
              <div className="chat-viewed-label">Viewed screen</div>
            )}
            <div className="chat-assistant-content">
              {renderMarkdown(msg.content)}
            </div>
            {onCopy && (
              <div className="chat-copy-row">
                <button
                  type="button"
                  className="chat-copy-btn"
                  onClick={() => onCopy(msg.content, i)}
                  aria-label="Copy response"
                >
                  {copiedIndex === i ? (
                    <span className="chat-copy-done">Copied ✓</span>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span className="chat-copy-label">Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ),
      )}
    </div>
  )
}

const typeColors: Record<string, string> = {
  response: 'rgba(34, 197, 94, 0.2)',
  question: 'rgba(59, 130, 246, 0.2)',
  action: 'rgba(249, 115, 22, 0.2)',
}

const typeLabels: Record<string, string> = {
  response: '📘',
  question: '❓',
  action: '💬',
}

const sentimentLabels: Record<LiveSessionInsights['sentiment'], string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  mixed: 'Mixed',
}

const entityIcons: Record<SessionEntity['type'], string> = {
  person: '👤',
  company: '🏢',
  other: '📌',
}

const OVERLAY_HEIGHT_COLLAPSED = 132
const OVERLAY_HEIGHT_CONNECT = 204
const OVERLAY_HEIGHT_EXPANDED = 360
const OVERLAY_HEIGHT_CHAT = 480
const OVERLAY_HEIGHT_LIVE_SESSION = 580
const OVERLAY_HEIGHT_SESSION_RECAP = 640
const DEFAULT_MEETING_MINUTES = 60

const OVERLAY_MIN_WIDTH = 480
const OVERLAY_MAX_WIDTH = 900
const OVERLAY_MIN_HEIGHT = 132
const OVERLAY_MAX_HEIGHT = 700

type ResizeEdge = 'left' | 'top' | 'right' | 'bottom' | 'corner'

function ResizeHandles({
  onResize,
}: {
  onResize: (width: number, height: number) => void
}) {
  const dragRef = useRef<{
    edge: ResizeEdge
    startX: number
    startY: number
    startW: number
    startH: number
    startWinX: number
    startWinY: number
  } | null>(null)
  const [activeEdge, setActiveEdge] = useState<ResizeEdge | null>(null)

  const onMouseDown = (edge: ResizeEdge) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      edge,
      startX: e.screenX,
      startY: e.screenY,
      startW: window.innerWidth,
      startH: window.innerHeight,
      startWinX: window.screenX,
      startWinY: window.screenY,
    }
    setActiveEdge(edge)
    document.body.style.cursor =
      edge === 'left' || edge === 'right'
        ? 'ew-resize'
        : edge === 'top' || edge === 'bottom'
          ? 'ns-resize'
          : 'nwse-resize'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.screenX - drag.startX
      const dy = e.screenY - drag.startY
      let newW = drag.startW
      let newH = drag.startH
      let newX = drag.startWinX
      let newY = drag.startWinY

      if (drag.edge === 'right' || drag.edge === 'corner') {
        newW = drag.startW + dx
      }
      if (drag.edge === 'left') {
        newW = drag.startW - dx
        newX = drag.startWinX + dx
      }
      if (drag.edge === 'bottom' || drag.edge === 'corner') {
        newH = drag.startH + dy
      }
      if (drag.edge === 'top') {
        newH = drag.startH - dy
        newY = drag.startWinY + dy
      }

      newW = Math.max(OVERLAY_MIN_WIDTH, Math.min(newW, OVERLAY_MAX_WIDTH))
      newH = Math.max(OVERLAY_MIN_HEIGHT, Math.min(newH, OVERLAY_MAX_HEIGHT))

      if (drag.edge === 'left') {
        newX = drag.startWinX + (drag.startW - newW)
      }
      if (drag.edge === 'top') {
        newY = drag.startWinY + (drag.startH - newH)
      }

      void window.electronAPI.invoke('overlay:set-bounds', {
        width: newW,
        height: newH,
        x: newX,
        y: newY,
        persist: false,
      })
      onResize(newW, newH)
    }

    const onMouseUp = () => {
      if (dragRef.current) {
        void window.electronAPI.invoke('overlay:set-bounds', {
          width: window.innerWidth,
          height: window.innerHeight,
          x: window.screenX,
          y: window.screenY,
          persist: true,
        })
      }
      dragRef.current = null
      setActiveEdge(null)
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
    }
  }, [onResize])

  const edges: ResizeEdge[] = ['left', 'top', 'right', 'bottom', 'corner']

  return (
    <>
      {edges.map((edge) => (
        <div
          key={edge}
          className={`resize-handle resize-handle-${edge} ${activeEdge === edge ? 'active' : ''}`}
          onMouseDown={onMouseDown(edge)}
        />
      ))}
    </>
  )
}

export default function Overlay() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [status, setStatus] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('bar')
  const [query, setQuery] = useState('')
  const [followEnabled, setFollowEnabled] = useState(true)
  const [stealthEnabled, setStealthEnabled] = useState(true)
  const [screenContextEnabled, setScreenContextEnabled] = useState(false)
  const [chatStatus, setChatStatus] = useState('')
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading')
  const [connectError, setConnectError] = useState('')
  const [prefs, setPrefs] = useState<PublicPreferences | null>(null)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [fullTranscript, setFullTranscript] = useState<TranscriptEntry[]>([])
  const [sessionInsights, setSessionInsights] = useState<LiveSessionInsights | null>(null)
  const [sessionRecap, setSessionRecap] = useState<SessionRecap | null>(null)
  const [showLiveInsights, setShowLiveInsights] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [recapLoading, setRecapLoading] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [transcriptSearch, setTranscriptSearch] = useState('')
  const [sessionClock, setSessionClock] = useState(Date.now())
  const [audioSessions, setAudioSessions] = useState<StoredAudioSession[]>([])
  const [viewingAudioSession, setViewingAudioSession] = useState<StoredAudioSession | null>(null)
  const [audioSessionChatMessages, setAudioSessionChatMessages] = useState<AudioSessionChatMessage[]>(
    [],
  )
  const [audioSessionChatLoading, setAudioSessionChatLoading] = useState(false)
  const [audioSessionChatStatus, setAudioSessionChatStatus] = useState('')
  const [liveSpeakerLabels, setLiveSpeakerLabels] = useState<SpeakerLabels>({})
  const [transcriptionMode, setTranscriptionMode] = useState<'dual' | 'group'>('dual')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isCapturingRef = useRef(false)
  const mimeTypeRef = useRef('audio/webm')
  const micSegmentTimerRef = useRef<number | null>(null)
  const liveTranscriptRef = useRef<HTMLDivElement | null>(null)
  const chatBodyRef = useRef<HTMLDivElement | null>(null)
  const modelMenuRef = useRef<HTMLDivElement | null>(null)
  const overlayInputRef = useRef<HTMLInputElement | null>(null)
  const livePanelRef = useRef<HTMLDivElement | null>(null)

  const needsConnect = connectionState === 'needs_connect'

  const isAudioSessionDetail = panelMode === 'audio_session_detail'
  const isChatPanel = panelMode === 'chat' || chatLoading || isAudioSessionDetail
  const hasActiveChat = chatMessages.length > 0
  const isLiveSession = panelMode === 'live_session' && isRecording
  const isSessionRecap = panelMode === 'session_recap'
  const isLivePanel = isLiveSession || isSessionRecap
  const isExpanded = panelMode === 'history' || panelMode === 'audio_sessions' || isLivePanel
  const allChatSessions = (() => {
    const sessions = [...chatSessions]
    if (activeSessionId && chatMessages.length > 0) {
      const idx = sessions.findIndex((s) => s.id === activeSessionId)
      const current: ChatSession = {
        id: activeSessionId,
        title: sessions[idx]?.title ?? sessionTitleFromMessages(chatMessages),
        createdAt: sessions[idx]?.createdAt ?? Date.now(),
        messages: chatMessages,
      }
      if (idx >= 0) sessions[idx] = current
      else sessions.unshift(current)
    }
    return sessions.sort((a, b) => b.createdAt - a.createdAt)
  })()

  const activeChatSessions = allChatSessions.filter((s) => !s.archived)
  const recentChatSessions = activeChatSessions.slice(0, 3)
  const hasMoreChatHistory = activeChatSessions.length > 3

  const hasAnyHistory =
    chatSessions.length > 0 ||
    chatMessages.length > 0 ||
    transcript.length > 0 ||
    suggestions.length > 0 ||
    Boolean(status)

  const applyBounds = useCallback((width: number, height: number, persist = false) => {
    void window.electronAPI.invoke('overlay:set-bounds', { width, height, persist })
  }, [])

  const syncHeight = useCallback(() => {
    let height = needsConnect ? OVERLAY_HEIGHT_CONNECT : OVERLAY_HEIGHT_COLLAPSED
    if (panelMode === 'chat' || chatLoading) {
      height = OVERLAY_HEIGHT_CHAT
    } else if (panelMode === 'live_session') {
      height = OVERLAY_HEIGHT_LIVE_SESSION
    } else if (panelMode === 'session_recap' || panelMode === 'audio_session_detail') {
      height = OVERLAY_HEIGHT_SESSION_RECAP
    } else if (panelMode === 'history' || panelMode === 'audio_sessions') {
      height = OVERLAY_HEIGHT_EXPANDED
    }
    void window.electronAPI.invoke('overlay:get-bounds').then((bounds) => {
      const b = bounds as { width?: number }
      const width = typeof b?.width === 'number' ? b.width : OVERLAY_MIN_WIDTH
      void window.electronAPI.invoke('overlay:set-bounds', { width, height, persist: true })
    })
  }, [panelMode, chatLoading, needsConnect])

  useEffect(() => {
    syncHeight()
  }, [syncHeight])

  useEffect(() => {
    window.electronAPI.on('transcript:update', (payload) => {
      const parsed = parseTranscriptPayload(payload)
      if (!parsed) return
      setTranscript([...parsed.recent])
      setFullTranscript([...parsed.full])
    })
    window.electronAPI.on('suggestions:update', (s) => {
      if (Array.isArray(s)) {
        setSuggestions([...(s as Suggestion[])])
      }
    })
    window.electronAPI.on('prefs:changed', (next) => {
      setPrefs(next as PublicPreferences)
    })
    window.electronAPI.on('chat:history-changed', (payload) => {
      const data = payload as { sessions?: ChatSession[] }
      if (Array.isArray(data?.sessions)) {
        setChatSessions(data.sessions)
      }
    })
    window.electronAPI.on('audio-sessions:changed', (payload) => {
      const data = payload as { sessions?: StoredAudioSession[] }
      if (Array.isArray(data?.sessions)) {
        setAudioSessions(data.sessions)
      }
    })
  }, [])

  useEffect(() => {
    void window.electronAPI.invoke('prefs:load').then((data) => {
      setPrefs(data as PublicPreferences)
    })
    void window.electronAPI.invoke('audio:prefs-load').then((data) => {
      const prefs = data as { transcriptionMode?: 'dual' | 'group' }
      if (prefs.transcriptionMode) setTranscriptionMode(prefs.transcriptionMode)
    })
    window.electronAPI.on('audio:prefs-changed', (data) => {
      const prefs = data as { transcriptionMode?: 'dual' | 'group' }
      if (prefs.transcriptionMode) setTranscriptionMode(prefs.transcriptionMode)
    })
  }, [])

  useEffect(() => {
    if (!modelMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [modelMenuOpen])

  const persistSession = useCallback(
    async (sessionId: string, messages: ChatMessage[]) => {
      if (messages.length === 0) return
      const existing = chatSessions.find((s) => s.id === sessionId)
      const session: ChatSession = {
        id: sessionId,
        title: existing?.title ?? sessionTitleFromMessages(messages),
        createdAt: existing?.createdAt ?? Date.now(),
        messages,
        archived: existing?.archived,
      }
      const result = (await window.electronAPI.invoke('chat:history-save-session', {
        session,
      })) as { sessions?: ChatSession[] }
      if (Array.isArray(result?.sessions)) {
        setChatSessions(result.sessions)
      }
    },
    [chatSessions],
  )

  useEffect(() => {
    void window.electronAPI.invoke('chat:history-load').then((data) => {
      const result = data as { sessions?: ChatSession[] }
      if (Array.isArray(result?.sessions)) {
        setChatSessions(result.sessions)
      }
    })
    void window.electronAPI.invoke('audio-sessions:load').then((data) => {
      const result = data as { sessions?: StoredAudioSession[] }
      if (Array.isArray(result?.sessions)) {
        setAudioSessions(result.sessions)
      }
    })
  }, [])

  const refreshConnection = useCallback(async () => {
    const status = (await window.electronAPI.invoke('auth:connection-status')) as {
      connected?: boolean
      hasApiUrl?: boolean
    }

    if (!status.hasApiUrl) {
      setConnectionState('optional')
      setConnectError('')
      return
    }

    if (status.connected) {
      setConnectionState('connected')
      setConnectError('')
      return
    }

    setConnectionState('needs_connect')
  }, [])

  useEffect(() => {
    void refreshConnection()
  }, [refreshConnection])

  useEffect(() => {
    if (connectionState !== 'needs_connect') return

    const interval = window.setInterval(() => {
      void window.electronAPI.invoke('auth:connection-status').then((data) => {
        const status = data as { connected?: boolean }
        if (status.connected) {
          setConnectionState('connected')
          setConnectError('')
        }
      })
    }, 3000)

    return () => window.clearInterval(interval)
  }, [connectionState])

  const openConnectPage = useCallback(async () => {
    setConnectError('')
    try {
      await window.electronAPI.invoke('auth:open-connect')
    } catch {
      setConnectError('Could not open browser')
    }
  }, [])

  useEffect(() => {
    void Promise.all([
      window.electronAPI.invoke('overlay:follow-status'),
      window.electronAPI.invoke('overlay:protection-status'),
      window.electronAPI.invoke('screen:context-status'),
    ]).then(([follow, protection, screen]) => {
      const followResult = follow as { enabled?: boolean }
      const protectionResult = protection as { enabled?: boolean }
      const screenResult = screen as { enabled?: boolean }
      if (typeof followResult?.enabled === 'boolean') {
        setFollowEnabled(followResult.enabled)
      }
      if (typeof protectionResult?.enabled === 'boolean') {
        setStealthEnabled(protectionResult.enabled)
      }
      if (typeof screenResult?.enabled === 'boolean') {
        setScreenContextEnabled(screenResult.enabled)
      }
    })
  }, [])

  const checkScroll = useCallback(() => {
    const el = chatBodyRef.current
    if (!el) return
    const hasOverflow = el.scrollHeight > el.clientHeight + 4
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setShowScrollDown(hasOverflow && !atBottom)
  }, [])

  useEffect(() => {
    const el = chatBodyRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll)
    checkScroll()
    return () => el.removeEventListener('scroll', checkScroll)
  }, [chatMessages, audioSessionChatMessages, chatLoading, audioSessionChatLoading, checkScroll, panelMode])

  useEffect(() => {
    const el = chatBodyRef.current
    if (
      el &&
      (chatMessages.length > 0 ||
        audioSessionChatMessages.length > 0 ||
        chatLoading ||
        audioSessionChatLoading)
    ) {
      el.scrollTop = el.scrollHeight
      checkScroll()
    }
  }, [chatMessages, audioSessionChatMessages, chatLoading, audioSessionChatLoading, checkScroll])

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null)
    setChatMessages([])
    setChatStatus('')
    setChatLoading(false)
    setQuery('')
    setPanelMode('bar')
  }, [])

  const loadSession = useCallback((session: ChatSession) => {
    setActiveSessionId(session.id)
    setChatMessages(session.messages)
    setChatStatus('')
    setPanelMode('chat')
  }, [])

  useEffect(() => {
    window.electronAPI.on('chat:session-open', (session) => {
      const data = session as ChatSession
      if (data?.id && Array.isArray(data.messages)) {
        loadSession(data)
      }
    })
  }, [loadSession])

  const toggleFollow = async () => {
    const result = (await window.electronAPI.invoke('overlay:toggle-follow')) as {
      enabled?: boolean
    }
    if (typeof result?.enabled === 'boolean') {
      setFollowEnabled(result.enabled)
    }
  }

  const toggleStealth = async () => {
    const result = (await window.electronAPI.invoke('overlay:toggle-protection')) as {
      enabled?: boolean
    }
    if (typeof result?.enabled === 'boolean') {
      setStealthEnabled(result.enabled)
    }
  }

  const toggleScreenContext = async () => {
    const result = (await window.electronAPI.invoke('screen:context-enabled')) as {
      enabled?: boolean
    }
    if (typeof result?.enabled === 'boolean') {
      setScreenContextEnabled(result.enabled)
    }
  }

  const stopMicCapture = () => {
    isCapturingRef.current = false
    if (micSegmentTimerRef.current) {
      window.clearTimeout(micSegmentTimerRef.current)
      micSegmentTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Recorder may already be stopped between segments.
      }
    }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const pauseMicCapture = () => {
    isCapturingRef.current = false
    if (micSegmentTimerRef.current) {
      window.clearTimeout(micSegmentTimerRef.current)
      micSegmentTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Recorder may already be stopped between segments.
      }
    }
    mediaRecorderRef.current = null
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false
    })
  }

  const resumeMicCapture = () => {
    if (!streamRef.current) return
    isCapturingRef.current = true
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = true
    })
    beginMicSegment(streamRef.current, mimeTypeRef.current)
  }

  const beginMicSegment = (stream: MediaStream, mimeType: string) => {
    if (!isCapturingRef.current) return

    const mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = async (event) => {
      if (!isCapturingRef.current || event.data.size < 500) return
      const arrayBuffer = await event.data.arrayBuffer()
      const base64 = arrayBufferToBase64(arrayBuffer)
      void window.electronAPI.invoke('audio:chunk', { base64, source: 'mic' })
    }

    mediaRecorder.onstop = () => {
      if (isCapturingRef.current) {
        beginMicSegment(stream, mimeType)
      }
    }

    mediaRecorder.start()

    micSegmentTimerRef.current = window.setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, MIC_SEGMENT_MS)
  }

  const startRecording = async () => {
    if (needsConnect) {
      setStatus('Connect your account on the website first')
      setPanelMode('history')
      return
    }

    try {
      const audioPrefs = (await window.electronAPI.invoke('audio:prefs-load')) as {
        preferredMicrophoneId?: string
        transcriptionMode?: 'dual' | 'group'
      }
      const deviceId = audioPrefs?.preferredMicrophoneId?.trim()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      streamRef.current = stream
      mimeTypeRef.current = mimeType
      await window.electronAPI.invoke('audio:start')
      setTranscript([])
      setFullTranscript([])
      setSuggestions([])
      setSessionInsights(null)
      setSessionRecap(null)
      setShowLiveInsights(true)
      setTranscriptSearch('')
      setLiveSpeakerLabels({})
      setSessionStartedAt(Date.now())
      const prefs = audioPrefs as { transcriptionMode?: 'dual' | 'group' }
      if (prefs.transcriptionMode) setTranscriptionMode(prefs.transcriptionMode)
      setIsRecording(true)
      setIsPaused(false)
      isCapturingRef.current = true
      beginMicSegment(stream, mimeType)
      setPanelMode('live_session')
      setStatus('Listening…')
    } catch (err) {
      console.error('Mic error:', err)
      stopMicCapture()
      setStatus('Microphone access denied')
      setPanelMode('bar')
    }
  }

  const runSessionAnalysis = useCallback(async () => {
    setInsightsLoading(true)
    try {
      const insights = (await window.electronAPI.invoke(
        'llm:session-analyze',
      )) as LiveSessionInsights | null
      if (insights) {
        setSessionInsights(insights)
      }
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  const pauseSession = async () => {
    pauseMicCapture()
    await window.electronAPI.invoke('audio:pause')
    setIsPaused(true)
    setStatus('Paused')
  }

  const resumeSession = async () => {
    await window.electronAPI.invoke('audio:resume')
    resumeMicCapture()
    setIsPaused(false)
    setStatus('Listening…')
  }

  const togglePauseSession = () => {
    if (isPaused) {
      void resumeSession()
    } else {
      void pauseSession()
    }
  }

  const stopRecording = async () => {
    stopMicCapture()
    await window.electronAPI.invoke('audio:stop')
    setIsRecording(false)
    setIsPaused(false)
    setStatus('')
    setPanelMode('session_recap')
    setRecapLoading(true)
    try {
      const transcriptEntries = (await window.electronAPI.invoke(
        'audio:session-transcript',
      )) as TranscriptEntry[]
      let speakerLabels: SpeakerLabels = {}
      if (transcriptionMode === 'group') {
        try {
          speakerLabels =
            ((await window.electronAPI.invoke('llm:infer-speaker-labels')) as SpeakerLabels) ?? {}
        } catch {
          speakerLabels = {}
        }
        setLiveSpeakerLabels(speakerLabels)
      }
      const recap = (await window.electronAPI.invoke('llm:session-recap')) as SessionRecap | null
      setSessionRecap(recap)

      const storedSession: StoredAudioSession = {
        id: crypto.randomUUID(),
        title: generateAudioSessionTitle(recap, sessionStartedAt),
        createdAt: sessionStartedAt ?? Date.now(),
        endedAt: Date.now(),
        transcript: Array.isArray(transcriptEntries) ? transcriptEntries : [],
        recap,
        chatMessages: [],
        speakerLabels: Object.keys(speakerLabels).length > 0 ? speakerLabels : undefined,
      }
      const saveResult = (await window.electronAPI.invoke('audio-sessions:save', {
        session: storedSession,
      })) as { sessions?: StoredAudioSession[] }
      if (Array.isArray(saveResult?.sessions)) {
        setAudioSessions(saveResult.sessions)
      }
      setViewingAudioSession(storedSession)
      setAudioSessionChatMessages([])
    } finally {
      setRecapLoading(false)
    }
  }

  const dismissSessionRecap = () => {
    setSessionRecap(null)
    setSessionInsights(null)
    setSessionStartedAt(null)
    setViewingAudioSession(null)
    setAudioSessionChatMessages([])
    setLiveSpeakerLabels({})
    setPanelMode('bar')
  }

  const activeSpeakerLabels: SpeakerLabels =
    viewingAudioSession?.speakerLabels ?? liveSpeakerLabels

  const renameSpeaker = useCallback(
    async (canonicalKey: string, currentDisplay: string) => {
      const next = window.prompt(`Rename ${canonicalKey}`, currentDisplay)
      if (!next?.trim()) return
      const updated: SpeakerLabels = {
        ...activeSpeakerLabels,
        [canonicalKey]: next.trim().slice(0, 48),
      }
      if (viewingAudioSession) {
        const result = (await window.electronAPI.invoke('audio-sessions:update-speaker-labels', {
          id: viewingAudioSession.id,
          speakerLabels: updated,
        })) as { sessions?: StoredAudioSession[] }
        if (Array.isArray(result?.sessions)) {
          setAudioSessions(result.sessions)
          const refreshed = result.sessions.find((s) => s.id === viewingAudioSession.id)
          if (refreshed) setViewingAudioSession(refreshed)
        }
      } else {
        setLiveSpeakerLabels(updated)
      }
    },
    [activeSpeakerLabels, viewingAudioSession],
  )

  const focusSessionInput = () => {
    overlayInputRef.current?.focus()
  }

  const toggleRecording = () => {
    if (isRecording) {
      void stopRecording()
    } else {
      void startRecording()
    }
  }

  const handleBack = () => {
    if (isRecording) {
      setPanelMode('live_session')
      return
    }
    if (isSessionRecap) {
      dismissSessionRecap()
      return
    }
    if (isAudioSessionDetail) {
      setViewingAudioSession(null)
      setAudioSessionChatMessages([])
      setPanelMode('audio_sessions')
      return
    }
    setPanelMode('bar')
  }

  const toggleHistory = () => {
    if (chatLoading || audioSessionChatLoading || isRecording || isSessionRecap) return
    setPanelMode((prev) => (prev === 'history' ? 'bar' : 'history'))
  }

  const toggleAudioSessions = () => {
    if (chatLoading || audioSessionChatLoading || isRecording || isSessionRecap) return
    setPanelMode((prev) => (prev === 'audio_sessions' ? 'bar' : 'audio_sessions'))
  }

  const openAudioSession = useCallback((session: StoredAudioSession) => {
    setViewingAudioSession(session)
    setAudioSessionChatMessages(session.chatMessages ?? [])
    setAudioSessionChatStatus('')
    setPanelMode('audio_session_detail')
  }, [])

  useEffect(() => {
    window.electronAPI.on('audio-sessions:open', (session) => {
      const data = session as StoredAudioSession
      if (data?.id && Array.isArray(data.transcript)) {
        openAudioSession(data)
      }
    })
  }, [openAudioSession])

  const persistAudioSessionChat = useCallback(
    async (sessionId: string, messages: AudioSessionChatMessage[]) => {
      const result = (await window.electronAPI.invoke('audio-sessions:update-chat', {
        id: sessionId,
        messages,
      })) as { sessions?: StoredAudioSession[] }
      if (Array.isArray(result?.sessions)) {
        setAudioSessions(result.sessions)
        const updated = result.sessions.find((s) => s.id === sessionId)
        if (updated) {
          setViewingAudioSession(updated)
        }
      }
    },
    [],
  )

  const handleRenameAudioSession = async (
    session: StoredAudioSession,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation()
    const title = window.prompt('Rename audio session', session.title)
    if (!title?.trim()) return
    const result = (await window.electronAPI.invoke('audio-sessions:rename', {
      id: session.id,
      title: title.trim(),
    })) as { sessions?: StoredAudioSession[] }
    if (Array.isArray(result?.sessions)) {
      setAudioSessions(result.sessions)
    }
  }

  const handleDeleteAudioSession = async (
    session: StoredAudioSession,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation()
    if (!window.confirm(`Delete "${session.title}"?`)) return
    const result = (await window.electronAPI.invoke('audio-sessions:delete', {
      id: session.id,
    })) as { sessions?: StoredAudioSession[] }
    if (Array.isArray(result?.sessions)) {
      setAudioSessions(result.sessions)
    }
    if (viewingAudioSession?.id === session.id) {
      setViewingAudioSession(null)
      setAudioSessionChatMessages([])
      setPanelMode('audio_sessions')
    }
  }

  useEffect(() => {
    if (!isRecording || panelMode !== 'live_session') return

    const initialTimer = window.setTimeout(() => {
      void runSessionAnalysis()
    }, 15_000)

    const interval = window.setInterval(() => {
      void runSessionAnalysis()
    }, 60_000)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [isRecording, panelMode, runSessionAnalysis])

  useEffect(() => {
    if (!isRecording || panelMode !== 'live_session') return
    if (fullTranscript.length > 0 && fullTranscript.length % 8 === 0) {
      void runSessionAnalysis()
    }
  }, [fullTranscript.length, isRecording, panelMode, runSessionAnalysis])

  useEffect(() => {
    if (!isLiveSession) return
    const id = window.setInterval(() => setSessionClock(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [isLiveSession])

  useEffect(() => {
    if (!liveTranscriptRef.current) return
    liveTranscriptRef.current.scrollTop = liveTranscriptRef.current.scrollHeight
  }, [fullTranscript, isLiveSession])

  const keybindActionsRef = useRef({
    handleNewChat,
    toggleRecording,
    toggleHistory,
  })
  keybindActionsRef.current = { handleNewChat, toggleRecording, toggleHistory }

  useEffect(() => {
    window.electronAPI.on('keybind:action', (payload) => {
      const action = (payload as { action?: string }).action
      const actions = keybindActionsRef.current
      switch (action) {
        case 'submit': {
          const form = document.querySelector('.overlay-input-row') as HTMLFormElement | null
          form?.requestSubmit()
          break
        }
        case 'new_chat':
          actions.handleNewChat()
          break
        case 'toggle_recording':
          actions.toggleRecording()
          break
        case 'toggle_history':
          actions.toggleHistory()
          break
        default:
          break
      }
    })
  }, [])

  const openFullHistory = () => {
    void window.electronAPI.invoke('settings:open', { tab: 'history' })
    setPanelMode('bar')
  }

  const reopenChat = () => {
    if (hasActiveChat) {
      setPanelMode('chat')
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  const copyRecapSummary = async (summary: string) => {
    try {
      await navigator.clipboard.writeText(summary)
      setSummaryCopied(true)
      setTimeout(() => setSummaryCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  const scrollToBottom = () => {
    const el = chatBodyRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
      setShowScrollDown(false)
    }
  }

  const handleAudioSessionChatSubmit = async (message: string) => {
    if (!viewingAudioSession) return

    setPanelMode('audio_session_detail')
    setAudioSessionChatLoading(true)
    setAudioSessionChatStatus('Thinking...')

    const userMessage: AudioSessionChatMessage = { role: 'user', content: message }
    const messagesWithUser = [...audioSessionChatMessages, userMessage]
    setAudioSessionChatMessages(messagesWithUser)
    void persistAudioSessionChat(viewingAudioSession.id, messagesWithUser)

    try {
      const transcriptLines = entriesToDisplayLines(
        viewingAudioSession.transcript,
        viewingAudioSession.speakerLabels,
      )
      const result = (await window.electronAPI.invoke('audio-sessions:chat', {
        message,
        transcriptLines,
        recap: viewingAudioSession.recap,
        speakerLabels: viewingAudioSession.speakerLabels,
      })) as { reply?: string; error?: string }

      let assistantMessage: AudioSessionChatMessage | null = null

      if (result.error === 'rate_limit' || result.error === 'rate_limit_exceeded') {
        setAudioSessionChatStatus('Usage limit reached — try again later')
        assistantMessage = {
          role: 'assistant',
          content: 'Usage limit reached — try again later',
        }
      } else if (result.error === 'api_key_missing') {
        setAudioSessionChatStatus('API key not configured')
        assistantMessage = { role: 'assistant', content: 'API key not configured for the active model.' }
      } else if (result.reply) {
        setAudioSessionChatStatus('')
        assistantMessage = { role: 'assistant', content: result.reply }
      } else {
        setAudioSessionChatStatus('Something went wrong')
        assistantMessage = { role: 'assistant', content: 'Something went wrong. Please try again.' }
      }

      if (assistantMessage) {
        const finalMessages = [...messagesWithUser, assistantMessage]
        setAudioSessionChatMessages(finalMessages)
        void persistAudioSessionChat(viewingAudioSession.id, finalMessages)
      }
    } finally {
      setAudioSessionChatLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || chatLoading || audioSessionChatLoading) return
    if (needsConnect) {
      setStatus('Connect your account on the website first')
      return
    }

    const message = query.trim()
    setQuery('')

    if ((isSessionRecap || isAudioSessionDetail) && viewingAudioSession) {
      await handleAudioSessionChatSubmit(message)
      return
    }

    setPanelMode('chat')
    setChatLoading(true)
    setChatStatus('Thinking...')

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      setActiveSessionId(sessionId)
    }

    const userMessage: ChatMessage = { role: 'user', content: message }
    const messagesWithUser = [...chatMessages, userMessage]
    setChatMessages(messagesWithUser)
    void persistSession(sessionId, messagesWithUser)

    try {
      const contextEntries = fullTranscript.length > 0 ? fullTranscript : transcript
      const contextTranscript = entriesToDisplayLines(contextEntries, activeSpeakerLabels)

      const result = (await window.electronAPI.invoke('llm:chat', {
        message,
        transcriptLines: contextTranscript,
        useScreenContext: screenContextEnabled,
      })) as { reply?: string; error?: string }

      let assistantMessage: ChatMessage | null = null

      if (result.error === 'rate_limit' || result.error === 'rate_limit_exceeded') {
        setChatStatus('Usage limit reached — try again later')
        assistantMessage = { role: 'assistant', content: 'Usage limit reached — try again later' }
      } else if (result.error === 'auth_expired' || result.error === 'not_authenticated') {
        setChatStatus('Account not connected — connect again on the website')
        setConnectionState('needs_connect')
        assistantMessage = {
          role: 'assistant',
          content: 'Account not connected. Click Connect on the website while signed in.',
        }
      } else if (result.error === 'api_key_missing') {
        setChatStatus('API key not configured')
        assistantMessage = { role: 'assistant', content: 'API key not configured' }
      } else if (result.error === 'permission_denied') {
        setChatStatus('Screen recording permission required — enable in System Settings')
        assistantMessage = {
          role: 'assistant',
          content: 'Screen recording permission required — enable in System Settings',
        }
      } else if (result.error === 'capture_failed') {
        setChatStatus('Could not capture screen — try again')
        assistantMessage = { role: 'assistant', content: 'Could not capture screen — try again' }
      } else if (result.error === 'chat_failed') {
        setChatStatus('Chat request failed — try again')
        assistantMessage = { role: 'assistant', content: 'Chat request failed — try again' }
      } else if (result.error === 'empty_reply') {
        setChatStatus('No reply received')
        assistantMessage = { role: 'assistant', content: 'No reply received' }
      } else if (result.reply) {
        assistantMessage = {
          role: 'assistant',
          content: result.reply,
          usedScreen: screenContextEnabled,
        }
        setChatStatus('')
      } else {
        setChatStatus('Could not get a reply')
        assistantMessage = { role: 'assistant', content: 'Could not get a reply' }
      }

      if (assistantMessage && sessionId) {
        const fullMessages = [...messagesWithUser, assistantMessage]
        setChatMessages(fullMessages)
        void persistSession(sessionId, fullMessages)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setChatStatus('Chat failed')
      if (sessionId) {
        const fullMessages = [
          ...messagesWithUser,
          { role: 'assistant' as const, content: 'Chat failed' },
        ]
        setChatMessages(fullMessages)
        void persistSession(sessionId, fullMessages)
      }
    } finally {
      setChatLoading(false)
    }
  }

  const renderConnectBanner = () => {
    if (!needsConnect) return null

    return (
      <div className="connect-banner">
        <div className="connect-banner-text">
          <span className="connect-banner-title">Connect your account</span>
          <span className="connect-banner-sub">
            Sign in on the website, then click Open Clarifi to link this app automatically.
          </span>
        </div>
        <button type="button" className="connect-banner-btn" onClick={() => void openConnectPage()}>
          Open on website
        </button>
        {connectError && <span className="connect-banner-error">{connectError}</span>}
      </div>
    )
  }

  const activeModel =
    prefs?.models.find((m) => m.id === prefs?.activeModelId) ?? prefs?.models[0] ?? null
  const activeMode =
    prefs?.modes.find((m) => m.id === prefs?.activeModeId) ?? prefs?.modes[0] ?? null

  const openSettings = (
    tab: 'profile' | 'models' | 'modes' | 'integrations' | 'keybinds' | 'audio' = 'profile',
  ) => {
    void window.electronAPI.invoke('settings:open', { tab })
  }

  const sessionElapsedMin = sessionStartedAt
    ? Math.floor((sessionClock - sessionStartedAt) / 60_000)
    : 0
  const timeRemainingMin = DEFAULT_MEETING_MINUTES - sessionElapsedMin
  const showTimeWarning = isLiveSession && timeRemainingMin <= 10 && timeRemainingMin > 0

  const filteredTranscript = transcriptSearch.trim()
    ? fullTranscript.filter((entry) => {
        const needle = transcriptSearch.trim().toLowerCase()
        const speaker = displaySpeakerForEntry(entry, activeSpeakerLabels)
        return (
          entry.text.toLowerCase().includes(needle) ||
          speaker.toLowerCase().includes(needle) ||
          entry.speaker.toLowerCase().includes(needle)
        )
      })
    : fullTranscript

  const renderLiveTranscriptFeed = (entries: TranscriptEntry[]) => {
    const lastEntry = entries[entries.length - 1]
    const showTalking =
      isLiveSession &&
      !isPaused &&
      lastEntry &&
      sessionClock - lastEntry.at < 6000

    if (entries.length === 0) {
      return (
        <div className="overlay-empty transcript-feed-empty">
          Listening… <strong>Me</strong> is your microphone. <strong>Them</strong> is everyone else
          on the call.
        </div>
      )
    }

    return (
      <>
        {entries.map((entry) => (
          <div key={entry.id} className={`transcript-feed-row source-${entry.source}`}>
            <span className="transcript-feed-time">
              {formatSessionOffset(entry.at, sessionStartedAt)}
            </span>
            <div className="transcript-feed-body">
              <span className="transcript-feed-speaker">{feedSpeakerLabel(entry)}</span>
              <span className="transcript-feed-text">{entry.text}</span>
            </div>
          </div>
        ))}
        {showTalking && (
          <div className={`transcript-feed-row transcript-feed-live source-${lastEntry.source}`}>
            <span className="transcript-feed-time">Now</span>
            <div className="transcript-feed-body">
              <span className="transcript-feed-speaker">{feedSpeakerLabel(lastEntry)}</span>
              <span className="transcript-feed-status">
                <span className="transcript-feed-pulse" aria-hidden />
                Currently talking…
              </span>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderTranscriptLines = (
    entries: TranscriptEntry[],
    labels: SpeakerLabels = activeSpeakerLabels,
    opts?: { showTimestamps?: boolean; allowRename?: boolean },
  ) => {
    const showTimestamps = opts?.showTimestamps ?? false
    const allowRename = opts?.allowRename ?? true

    if (entries.length === 0) {
      return (
        <div className="overlay-empty">
          {transcriptionMode === 'group' ? (
            <>
              Listening… speakers are detected from call audio. Click a speaker name to rename.
            </>
          ) : (
            <>
              Listening… <strong>Me</strong> is your microphone. <strong>Them</strong> is everyone
              else on the call.
            </>
          )}
        </div>
      )
    }

    return entries.map((entry) => {
      const canonicalKey = entry.speaker?.trim() || (entry.source === 'mic' ? 'Me' : 'Them')
      const speaker = displaySpeakerForEntry(entry, labels)
      const colorClass = speakerColorClass(speaker, canonicalKey)
      const canRename = allowRename && isDiarizedSpeakerLabel(canonicalKey)

      return (
        <div
          key={entry.id}
          className={`transcript-turn ${colorClass} source-${entry.source}`}
        >
          <div className={`transcript-avatar ${colorClass}`}>{speakerInitial(speaker)}</div>
          <div className="transcript-turn-body">
            <div className="transcript-turn-header">
              <span
                className={`transcript-speaker${canRename ? ' transcript-speaker-editable' : ''}`}
                onClick={
                  canRename
                    ? () => {
                        void renameSpeaker(canonicalKey, speaker)
                      }
                    : undefined
                }
                title={canRename ? 'Click to rename' : undefined}
              >
                {speaker}
              </span>
              {showTimestamps && (
                <span className="transcript-time">{formatTranscriptTime(entry.at)}</span>
              )}
            </div>
            <span className="transcript-text">{entry.text}</span>
          </div>
        </div>
      )
    })
  }

  const renderLiveInsightsBody = () => {
    const intro =
      sessionInsights?.meetingIntro?.trim() ||
      sessionInsights?.runningSummary?.trim() ||
      (fullTranscript.length === 0 ? '• No content yet…' : status || 'Processing…')

    return (
      <>
        <section className="live-section">
          <h3 className="live-section-title">Meeting Introduction</h3>
          <p className="live-section-body">{intro}</p>
        </section>

        <section className="live-section">
          <h3 className="live-section-title">Actions</h3>
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <div
                key={i}
                className="live-action-row"
                style={{ background: typeColors[s.type] }}
              >
                <span className="suggestion-icon">{typeLabels[s.type]}</span>
                <span className="suggestion-text">{s.text}</span>
              </div>
            ))
          ) : (
            <p className="live-muted">Listening for conversation cues…</p>
          )}
        </section>

        <section className="live-section live-intelligence-grid">
          <div className="live-intel-card">
            <h4>Topics</h4>
            {sessionInsights?.topics?.length ? (
              <ul>
                {sessionInsights.topics.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="live-muted">Detecting topics…</p>
            )}
          </div>
          <div className="live-intel-card">
            <h4>Sentiment</h4>
            <span className={`sentiment-badge sentiment-${sessionInsights?.sentiment ?? 'neutral'}`}>
              {sentimentLabels[sessionInsights?.sentiment ?? 'neutral']}
            </span>
          </div>
          <div className="live-intel-card">
            <h4>Key moments</h4>
            {sessionInsights?.keyMoments?.length ? (
              <ul>
                {sessionInsights.keyMoments.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="live-muted">Watching for highlights…</p>
            )}
          </div>
        </section>

        <section className="live-section live-context-row">
          <div className="live-context-col">
            <h4>Decisions</h4>
            {sessionInsights?.decisions?.length ? (
              <ul>
                {sessionInsights.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="live-muted">None detected yet</p>
            )}
          </div>
          <div className="live-context-col">
            <h4>Open questions</h4>
            {sessionInsights?.openQuestions?.length ? (
              <ul>
                {sessionInsights.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            ) : (
              <p className="live-muted">None yet</p>
            )}
          </div>
        </section>

        {sessionInsights?.entities?.length ? (
          <section className="live-section">
            <h4 className="live-section-subtitle">People & companies</h4>
            <div className="entity-chip-row">
              {sessionInsights.entities.map((entity, i) => (
                <span key={i} className="entity-chip">
                  <span>{entityIcons[entity.type] ?? '📌'}</span>
                  {entity.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {sessionInsights?.runningSummary ? (
          <section className="live-section">
            <h4 className="live-section-subtitle">Running summary</h4>
            <p className="live-section-body live-summary-text">{sessionInsights.runningSummary}</p>
          </section>
        ) : null}

        {showTimeWarning ? (
          <div className="live-time-warning">
            ~{timeRemainingMin} min left in a {DEFAULT_MEETING_MINUTES}-min slot
          </div>
        ) : null}
      </>
    )
  }

  const renderLiveSessionPanel = () => (
    <div className="live-session-panel" ref={livePanelRef}>
      <div className="live-session-header">
        <span className="live-session-title">Live Insights</span>
        <div className="live-session-header-actions">
          {insightsLoading && <span className="live-analyzing">Analyzing…</span>}
          <button
            type="button"
            className={`live-transcript-toggle ${showLiveInsights ? 'active' : ''}`}
            onClick={() => setShowLiveInsights((v) => !v)}
          >
            <span className="live-wave-icon">〰</span>
            {showLiveInsights ? 'Hide analysis' : 'Show analysis'}
          </button>
        </div>
      </div>

      <div className="live-session-body">
        <section className="live-transcript-section">
          <div className="live-transcript-header">
            <h3 className="live-section-title">Live Transcript</h3>
            <span
              className="live-transcript-meta"
              title={
                transcriptionMode === 'group'
                  ? 'Speakers are detected from call audio. Click a name to rename.'
                  : 'Me = your MacBook microphone. Them = system audio from the meeting.'
              }
            >
              {transcriptionMode === 'group'
                ? 'Speaker 1, 2, … = call audio'
                : 'Me = mic · Them = call audio'}
            </span>
          </div>
          <div ref={liveTranscriptRef} className="live-transcript-panel live-transcript-primary">
            {transcriptionMode === 'dual'
              ? renderLiveTranscriptFeed(fullTranscript)
              : renderTranscriptLines(fullTranscript, activeSpeakerLabels, { showTimestamps: true })}
          </div>
        </section>

        {showLiveInsights ? renderLiveInsightsBody() : null}
      </div>

      <button type="button" className="live-session-footer" onClick={focusSessionInput}>
        Click to ask Clarifi
      </button>
    </div>
  )

  const renderRecapSection = (
    heading: string,
    items: string[],
    key: string,
  ) => {
    if (items.length === 0) return null
    return (
      <section className="recap-section" key={key}>
        <h2 className="recap-section-heading">{heading}</h2>
        <div className="recap-section-body">
          {items.map((item, i) => (
            <p key={i} className="recap-line">
              {item}
            </p>
          ))}
        </div>
      </section>
    )
  }

  const renderRecapDocument = (opts: {
    title: string
    date: number
    transcript: TranscriptEntry[]
    recap: SessionRecap
    speakerLabels?: SpeakerLabels
    showBack?: boolean
    onBack?: () => void
    showDone?: boolean
    onDone?: () => void
    transcriptSearch?: string
    onTranscriptSearchChange?: (value: string) => void
    filteredTranscript?: TranscriptEntry[]
  }) => {
    const {
      title,
      date,
      transcript,
      recap,
      speakerLabels = activeSpeakerLabels,
      showBack,
      onBack,
      showDone,
      onDone,
      transcriptSearch,
      onTranscriptSearchChange,
      filteredTranscript: filtered = transcript,
    } = opts

    const participants = collectParticipants(transcript, speakerLabels)
    const discussionPoints = recapDiscussionPoints(recap)
    const decisions = recapDecisions(recap)

    return (
      <div className="recap-document">
        <div className="recap-hero">
          {showBack && (
            <ToolbarTooltip label="Back" placement="below">
              <button
                type="button"
                className="recap-back-btn"
                onClick={onBack}
                aria-label="Back"
              >
                ←
              </button>
            </ToolbarTooltip>
          )}
          <div className="recap-hero-content">
            <h1 className="recap-title">{title}</h1>
            <div className="recap-pills">
              <span className="recap-pill">
                <span className="recap-pill-icon" aria-hidden>
                  📅
                </span>
                {formatRecapDate(date)}
              </span>
              <span className="recap-pill">
                <span className="recap-pill-icon" aria-hidden>
                  👤
                </span>
                {participants.join(', ')}
              </span>
            </div>
          </div>
          {showDone && (
            <button type="button" className="live-recap-dismiss" onClick={onDone}>
              Done
            </button>
          )}
        </div>

        <div className="recap-scroll">
          {recap.summary && (
            <div className="recap-summary-block">
              <div className="recap-summary-header">
                <span className="recap-label">SUMMARY</span>
                <button
                  type="button"
                  className="recap-copy-btn"
                  onClick={() => void copyRecapSummary(recap.summary)}
                >
                  {summaryCopied ? 'Copied' : 'Copy Summary'}
                  <svg
                    className="recap-copy-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <p className="recap-summary-text">{recap.summary}</p>
            </div>
          )}

          {renderRecapSection('Action Items', recap.actionItems, 'action-items')}
          {renderRecapSection('Discussion Points', discussionPoints, 'discussion')}
          {renderRecapSection('Decisions / Agreements', decisions, 'decisions')}
          {renderRecapSection('Open Questions', recap.openQuestions, 'open-questions')}

          {recap.recapEmailDraft && (
            <section className="recap-section recap-email-section">
              <h2 className="recap-section-heading">Recap email draft</h2>
              <pre className="live-email-draft">{recap.recapEmailDraft}</pre>
            </section>
          )}

          {transcript.length > 0 && (
            <section className="recap-section recap-transcript-section">
              <h2 className="recap-section-heading">Full transcript</h2>
              {onTranscriptSearchChange && (
                <input
                  type="search"
                  className="live-transcript-search"
                  placeholder="Search transcript…"
                  value={transcriptSearch ?? ''}
                  onChange={(e) => onTranscriptSearchChange(e.target.value)}
                />
              )}
              <div className="live-transcript-panel recap-transcript">
                {renderTranscriptLines(filtered, speakerLabels)}
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  const renderSessionRecapPanel = () => (
    <div className="live-session-panel session-recap-panel">
      <div className="live-session-body recap-panel-body">
        {recapLoading ? (
          <div className="overlay-empty">Generating recap…</div>
        ) : sessionRecap ? (
          renderRecapDocument({
            title: generateAudioSessionTitle(sessionRecap, sessionStartedAt),
            date: sessionStartedAt ?? Date.now(),
            transcript: fullTranscript,
            recap: sessionRecap,
            speakerLabels: liveSpeakerLabels,
            showBack: true,
            onBack: dismissSessionRecap,
            showDone: true,
            onDone: dismissSessionRecap,
            transcriptSearch,
            onTranscriptSearchChange: setTranscriptSearch,
            filteredTranscript,
          })
        ) : (
          <div className="overlay-empty">Session ended — no transcript captured</div>
        )}
      </div>
    </div>
  )

  const renderToolbar = () => (
    <div className="overlay-toolbar">
      <div className="toolbar-left">
        <div
          className={`overlay-dot ${isRecording ? (isPaused ? 'paused' : 'recording') : ''}`}
        />
        <button
          type="button"
          className="toolbar-brand toolbar-brand-btn"
          onClick={() => openSettings('profile')}
        >
          Clarifi
        </button>

        <div className="toolbar-model-wrap" ref={modelMenuRef}>
          <button
            type="button"
            className={`toolbar-pill ${modelMenuOpen ? 'active' : ''}`}
            onClick={() => setModelMenuOpen((open) => !open)}
          >
            <span className="toolbar-pill-label">{activeModel?.label ?? 'Model'}</span>
            <span className="chevron">▼</span>
          </button>
          {modelMenuOpen && (
            <div className="toolbar-model-menu">
              <button
                type="button"
                className="toolbar-model-item"
                onClick={() => {
                  setModelMenuOpen(false)
                  openSettings('models')
                }}
              >
                Change model
              </button>
            </div>
          )}
        </div>

        <ToolbarTooltip label="Change mode & system prompt">
          <button
            type="button"
            className="toolbar-pill toolbar-mode-btn"
            onClick={() => openSettings('modes')}
          >
            <span className="toolbar-pill-label">{activeMode?.label ?? 'Mode'}</span>
          </button>
        </ToolbarTooltip>

        <ToolbarTooltip label="Uses Screen">
          <button
            type="button"
            className={`toolbar-icon ${screenContextEnabled ? 'active' : ''}`}
            onClick={() => void toggleScreenContext()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
        </ToolbarTooltip>

        <ToolbarTooltip label={stealthEnabled ? 'Hidden from share' : 'Detectable'}>
          <button
            type="button"
            className={`toolbar-icon stealth-btn ${stealthEnabled ? 'active' : ''}`}
            onClick={() => void toggleStealth()}
          >
            {stealthEnabled ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </ToolbarTooltip>

        <ToolbarTooltip label={followEnabled ? 'Follow screen' : 'Pinned position'}>
          <button
            type="button"
            className={`toolbar-icon ${followEnabled ? 'active' : ''}`}
            onClick={() => void toggleFollow()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
        </ToolbarTooltip>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-right">
        {isRecording && (
          <ToolbarTooltip label={isPaused ? 'Resume session' : 'Pause session'}>
            <button
              type="button"
              className={`toolbar-icon pause-btn ${isPaused ? 'paused' : ''}`}
              onClick={togglePauseSession}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </ToolbarTooltip>
        )}

        <ToolbarTooltip
          label={isRecording ? 'Stop Audio Session' : 'Start Audio Session'}
        >
          <button
            type="button"
            className={`toolbar-icon audio-btn ${isRecording ? 'active' : ''}`}
            onClick={toggleRecording}
          >
            <span
              className={`waveform ${isRecording && !isPaused ? 'waveform-active' : ''}`}
            >
              <span />
              <span />
              <span />
              <span />
            </span>
          </button>
        </ToolbarTooltip>

        {(hasActiveChat || panelMode === 'chat') && (
          <button type="button" className="toolbar-new-chat" onClick={handleNewChat}>
            New Chat
          </button>
        )}

        <ToolbarTooltip label="Audio sessions">
          <button
            type="button"
            className={`toolbar-history ${panelMode === 'audio_sessions' ? 'active' : ''}`}
            onClick={toggleAudioSessions}
          >
            <span>Sessions</span>
            <span className={`chevron ${panelMode === 'audio_sessions' ? 'chevron-up' : ''}`}>▼</span>
          </button>
        </ToolbarTooltip>

        <ToolbarTooltip label="History">
          <button
            type="button"
            className={`toolbar-history ${panelMode === 'history' ? 'active' : ''}`}
            onClick={toggleHistory}
          >
            <span>History</span>
            <span className={`chevron ${panelMode === 'history' ? 'chevron-up' : ''}`}>▼</span>
          </button>
        </ToolbarTooltip>
      </div>
    </div>
  )

  if (isChatPanel) {
    const detailMessages = isAudioSessionDetail ? audioSessionChatMessages : chatMessages
    const detailLoading = isAudioSessionDetail ? audioSessionChatLoading : chatLoading
    const detailStatus = isAudioSessionDetail ? audioSessionChatStatus : chatStatus

    return (
      <div className="overlay-root overlay-root-chat">
        <ResizeHandles onResize={applyBounds} />
        <div className="overlay-panel">
          <form className="chat-header" onSubmit={(e) => void handleSubmit(e)}>
            <ToolbarTooltip label="Back" placement="below">
              <button
                type="button"
                className="chat-back-btn"
                onClick={handleBack}
                aria-label="Back"
              >
                ←
              </button>
            </ToolbarTooltip>
            <input
              type="text"
              className="overlay-input chat-followup-input"
              placeholder={
                isAudioSessionDetail
                  ? 'Ask about this recording…'
                  : 'Ask follow-up'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={detailLoading}
            />
            <ToolbarTooltip label="Send message">
              <button
                type="submit"
                className="overlay-submit"
                disabled={detailLoading}
              >
                ↵
              </button>
            </ToolbarTooltip>
          </form>

          <div className="chat-body" ref={chatBodyRef}>
            {isAudioSessionDetail && viewingAudioSession && (
              <div className="audio-session-detail-recap">
                {viewingAudioSession.recap ? (
                  renderRecapDocument({
                    title: viewingAudioSession.title,
                    date: viewingAudioSession.createdAt,
                    transcript: viewingAudioSession.transcript,
                    recap: viewingAudioSession.recap,
                    speakerLabels: viewingAudioSession.speakerLabels,
                    filteredTranscript: viewingAudioSession.transcript,
                  })
                ) : (
                  <>
                    <h3 className="recap-title">{viewingAudioSession.title}</h3>
                    {viewingAudioSession.transcript.length > 0 && (
                      <section className="recap-section recap-transcript-section">
                        <h2 className="recap-section-heading">Full transcript</h2>
                        <div className="live-transcript-panel recap-transcript">
                          {renderTranscriptLines(
                            viewingAudioSession.transcript,
                            viewingAudioSession.speakerLabels ?? {},
                          )}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}

            <ChatThread
              messages={detailMessages}
              onCopy={(text, i) => void copyToClipboard(text, i)}
              copiedIndex={copiedIndex}
            />

            {detailLoading && (
              <div className="chat-assistant-block">
                {!isAudioSessionDetail && screenContextEnabled && (
                  <div className="chat-viewed-label">Viewed screen</div>
                )}
                <div className="chat-status-text">{detailStatus || 'Thinking...'}</div>
              </div>
            )}

            {!detailLoading && detailStatus && (
              <div className="chat-status-text">{detailStatus}</div>
            )}
          </div>

          {showScrollDown && (
            <button
              type="button"
              className="chat-scroll-down"
              onClick={scrollToBottom}
              aria-label="Scroll down"
            >
              ↓
            </button>
          )}

          {renderToolbar()}
        </div>
      </div>
    )
  }

  return (
    <div className="overlay-root">
      <ResizeHandles onResize={applyBounds} />
      <div className="overlay-bar">
        {renderConnectBanner()}
        <form className="overlay-input-row" onSubmit={(e) => void handleSubmit(e)}>
          {hasActiveChat && panelMode === 'bar' && (
            <ToolbarTooltip label="Back to chat" placement="below">
              <button
                type="button"
                className="chat-back-btn"
                onClick={reopenChat}
                aria-label="Back to chat"
              >
                ←
              </button>
            </ToolbarTooltip>
          )}
          <input
            ref={overlayInputRef}
            type="text"
            className="overlay-input"
            placeholder={
              needsConnect
                ? 'Connect account on website to start'
                : isLiveSession
                  ? 'Ask about this meeting…'
                  : isSessionRecap
                    ? 'Ask about this recording…'
                    : hasActiveChat
                      ? 'Ask follow-up'
                      : screenContextEnabled
                        ? 'Ask anything about your screen'
                        : 'Ask me anything'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={chatLoading || needsConnect}
            onFocus={() => {
              if (hasActiveChat && panelMode === 'bar') reopenChat()
            }}
          />
          <ToolbarTooltip label="Send message">
            <button
              type="submit"
              className="overlay-submit"
              disabled={chatLoading}
            >
              ↵
            </button>
          </ToolbarTooltip>
        </form>

        {renderToolbar()}
      </div>

      {isLiveSession && renderLiveSessionPanel()}
      {isSessionRecap && renderSessionRecapPanel()}

      {isExpanded && panelMode === 'audio_sessions' && (
        <div className="overlay-expanded overlay-expanded-history">
          <div className="expanded-section">
            <div className="expanded-label">Audio sessions</div>
            {audioSessions.length === 0 ? (
              <div className="overlay-empty">No audio sessions yet — start one with the audio button</div>
            ) : (
              audioSessions.map((session) => (
                <div key={session.id} className="history-session-row audio-session-row">
                  <button
                    type="button"
                    className="audio-session-row-open"
                    onClick={() => openAudioSession(session)}
                  >
                    <span className="history-session-title">{session.title}</span>
                    <span className="history-session-meta">
                      <span className="history-session-time">
                        {formatRelativeTime(session.createdAt)}
                      </span>
                      <span className="history-session-badge">Open</span>
                    </span>
                  </button>
                  <div className="audio-session-row-actions">
                    <button
                      type="button"
                      className="audio-session-action-btn"
                      onClick={(e) => void handleRenameAudioSession(session, e)}
                      aria-label="Rename"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="audio-session-action-btn audio-session-action-delete"
                      onClick={(e) => void handleDeleteAudioSession(session, e)}
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isExpanded && panelMode === 'history' && (
        <div className="overlay-expanded overlay-expanded-history">
          {status && <div className="overlay-status">{status}</div>}

          {activeChatSessions.length > 0 && (
            <div className="expanded-section">
              <div className="expanded-label">Chats</div>
              {hasActiveChat && panelMode === 'history' && (
                <button
                  type="button"
                  className="history-continue-btn"
                  onClick={reopenChat}
                >
                  Continue chat
                </button>
              )}
              {recentChatSessions.map((session) => {
                const isActive = session.id === activeSessionId
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`history-session-row ${isActive ? 'history-session-row--active' : ''}`}
                    onClick={() => loadSession(session)}
                  >
                    <span className="history-session-title">{session.title}</span>
                    <span className="history-session-meta">
                      <span className="history-session-time">
                        {formatRelativeTime(session.createdAt)}
                      </span>
                      <span className={`history-session-badge ${isActive ? 'history-session-badge--active' : ''}`}>
                        {isActive ? 'Active' : 'Resume'}
                      </span>
                    </span>
                  </button>
                )
              })}
              {(hasMoreChatHistory || activeChatSessions.length > 0) && (
                <button type="button" className="history-view-all-btn" onClick={openFullHistory}>
                  View full history
                </button>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="expanded-section">
              <div className="expanded-label">Suggestions</div>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="overlay-suggestion"
                  style={{ background: typeColors[s.type] }}
                >
                  <span className="suggestion-icon">{typeLabels[s.type]}</span>
                  <span className="suggestion-text">{s.text}</span>
                </div>
              ))}
            </div>
          )}

          {transcript.length > 0 && (
            <div className="expanded-section">
              <div className="expanded-label">Transcript</div>
              {renderTranscriptLines(transcript.slice(-15))}
            </div>
          )}

          {isRecording &&
            suggestions.length === 0 &&
            transcript.length === 0 &&
            chatMessages.length === 0 &&
            allChatSessions.length === 0 && (
            <div className="overlay-empty">
              {status === 'Transcribing...' ? 'Transcribing...' : 'Listening... speak now'}
            </div>
          )}

          {!isRecording && !hasAnyHistory && (
            <div className="overlay-empty">No history yet</div>
          )}
        </div>
      )}
    </div>
  )
}
