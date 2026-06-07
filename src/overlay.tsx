import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
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
}

type PanelMode = 'bar' | 'chat' | 'history'

type ConnectionState = 'loading' | 'connected' | 'needs_connect' | 'optional'

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
  response: '💬',
  question: '❓',
  action: '⚡',
}

const OVERLAY_HEIGHT_COLLAPSED = 132
const OVERLAY_HEIGHT_CONNECT = 204
const OVERLAY_HEIGHT_EXPANDED = 360
const OVERLAY_HEIGHT_CHAT = 480

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
  const [transcript, setTranscript] = useState<string[]>([])
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
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading')
  const [connectError, setConnectError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chatBodyRef = useRef<HTMLDivElement | null>(null)

  const needsConnect = connectionState === 'needs_connect'

  const isChatPanel = panelMode === 'chat' || chatLoading
  const hasActiveChat = chatMessages.length > 0
  const isExpanded = panelMode === 'history'
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
    } else if (panelMode === 'history') {
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
    window.electronAPI.on('transcript:update', (lines) => {
      if (Array.isArray(lines)) {
        setTranscript([...(lines as string[])])
      }
    })
    window.electronAPI.on('suggestions:update', (s) => {
      if (Array.isArray(s)) {
        setSuggestions([...(s as Suggestion[])])
      }
    })
  }, [])

  const persistSession = useCallback(
    async (sessionId: string, messages: ChatMessage[]) => {
      if (messages.length === 0) return
      const existing = chatSessions.find((s) => s.id === sessionId)
      const session: ChatSession = {
        id: sessionId,
        title: existing?.title ?? sessionTitleFromMessages(messages),
        createdAt: existing?.createdAt ?? Date.now(),
        messages,
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
  }, [chatMessages, chatLoading, checkScroll, panelMode])

  useEffect(() => {
    const el = chatBodyRef.current
    if (el && (chatMessages.length > 0 || chatLoading)) {
      el.scrollTop = el.scrollHeight
      checkScroll()
    }
  }, [chatMessages, chatLoading, checkScroll])

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
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        handleNewChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        void window.electronAPI.invoke('onboarding:tutorial-signal', { type: 'enter' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleNewChat])

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

  const startRecording = async () => {
    if (needsConnect) {
      setStatus('Connect your account on the website first')
      setPanelMode('history')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer()
          const base64 = arrayBufferToBase64(arrayBuffer)
          setStatus('Transcribing...')
          await window.electronAPI.invoke('audio:chunk', base64)
          setStatus('Listening...')
        }
      }

      mediaRecorder.start(5000)
      await window.electronAPI.invoke('audio:start')
      setTranscript([])
      setSuggestions([])
      setIsRecording(true)
      setPanelMode('history')
      setStatus('Listening...')
    } catch (err) {
      console.error('Mic error:', err)
      setStatus('Microphone access denied')
      setPanelMode('history')
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
      mediaRecorderRef.current = null
    }
    await window.electronAPI.invoke('audio:stop')
    setIsRecording(false)
    setStatus('')
  }

  const toggleRecording = () => {
    if (isRecording) {
      void stopRecording()
    } else {
      void startRecording()
    }
  }

  const handleBack = () => {
    setPanelMode('bar')
  }

  const toggleHistory = () => {
    if (chatLoading) return
    setPanelMode((prev) => (prev === 'history' ? 'bar' : 'history'))
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

  const scrollToBottom = () => {
    const el = chatBodyRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
      setShowScrollDown(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || chatLoading) return
    if (needsConnect) {
      setStatus('Connect your account on the website first')
      return
    }

    const message = query.trim()
    setQuery('')
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
      const result = (await window.electronAPI.invoke('llm:chat', {
        message,
        transcriptLines: transcript,
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

  const renderToolbar = () => (
    <div className="overlay-toolbar">
      <div className="toolbar-left">
        <div className={`overlay-dot ${isRecording ? 'recording' : ''}`} />
        <span className="toolbar-brand">Clarifi</span>

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
        <ToolbarTooltip
          label={isRecording ? 'Stop Audio Session' : 'Start Audio Session'}
        >
          <button
            type="button"
            className={`toolbar-icon audio-btn ${isRecording ? 'active' : ''}`}
            onClick={toggleRecording}
          >
            <span className={`waveform ${isRecording ? 'waveform-active' : ''}`}>
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
              placeholder="Ask follow-up"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={chatLoading}
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

          <div className="chat-body" ref={chatBodyRef}>
            <ChatThread
              messages={chatMessages}
              onCopy={(text, i) => void copyToClipboard(text, i)}
              copiedIndex={copiedIndex}
            />

            {chatLoading && (
              <div className="chat-assistant-block">
                {screenContextEnabled && (
                  <div className="chat-viewed-label">Viewed screen</div>
                )}
                <div className="chat-status-text">{chatStatus || 'Thinking...'}</div>
              </div>
            )}

            {!chatLoading && chatStatus && (
              <div className="chat-status-text">{chatStatus}</div>
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
            type="text"
            className="overlay-input"
            placeholder={
              needsConnect
                ? 'Connect account on website to start'
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

      {isExpanded && panelMode === 'history' && (
        <div className="overlay-expanded overlay-expanded-history">
          {status && <div className="overlay-status">{status}</div>}

          {allChatSessions.length > 0 && (
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
              {allChatSessions.map((session) => {
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
              {transcript.slice(-10).map((line, i) => (
                <div key={i} className="overlay-transcript-line">
                  {line}
                </div>
              ))}
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
