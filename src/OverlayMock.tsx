import type { CSSProperties, ReactNode } from 'react'
import './overlay-mock.css'

function ScreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function StealthHiddenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function StealthVisibleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function FollowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

export type OverlayMockProps = {
  placeholder?: string
  screenContextEnabled?: boolean
  stealthEnabled?: boolean
  followEnabled?: boolean
  isRecording?: boolean
  onStealthClick?: () => void
  onAudioClick?: () => void
  showMoveArrows?: boolean
  className?: string
  style?: CSSProperties
  footer?: ReactNode
}

export default function OverlayMock({
  placeholder = 'Ask me anything',
  screenContextEnabled = false,
  stealthEnabled = true,
  followEnabled = true,
  isRecording = false,
  onStealthClick,
  onAudioClick,
  showMoveArrows = false,
  className = '',
  style,
  footer,
}: OverlayMockProps) {
  const stealthInteractive = Boolean(onStealthClick)
  const audioInteractive = Boolean(onAudioClick)

  return (
    <div className={`overlay-mock ${className}`.trim()} style={style}>
      {showMoveArrows && (
        <div className="overlay-mock-arrows" aria-hidden>
          <span className="up">↑</span>
          <span className="down">↓</span>
          <span className="left">←</span>
          <span className="right">→</span>
        </div>
      )}

      <div className="overlay-mock-bar">
        <div className="overlay-mock-input-row">
          <input
            type="text"
            className="overlay-mock-input"
            placeholder={placeholder}
            readOnly
            tabIndex={-1}
          />
          <button type="button" className="overlay-mock-submit" tabIndex={-1} aria-hidden>
            ↵
          </button>
        </div>

        <div className="overlay-mock-toolbar">
          <div className="overlay-mock-toolbar-left">
            <div className={`overlay-mock-dot ${isRecording ? 'recording' : ''}`} />
            <span className="overlay-mock-brand">Clarifi</span>

            <button
              type="button"
              className={`overlay-mock-icon ${screenContextEnabled ? 'active' : ''}`}
              tabIndex={-1}
              aria-hidden={!screenContextEnabled}
            >
              <ScreenIcon />
            </button>

            {stealthInteractive ? (
              <button
                type="button"
                className={`overlay-mock-icon stealth-btn ${stealthEnabled ? 'active' : ''}`}
                onClick={onStealthClick}
                aria-label="Undetectable on screen share"
              >
                {stealthEnabled ? <StealthHiddenIcon /> : <StealthVisibleIcon />}
              </button>
            ) : (
              <span
                className={`overlay-mock-icon stealth-btn ${stealthEnabled ? 'active' : ''}`}
                aria-hidden
              >
                {stealthEnabled ? <StealthHiddenIcon /> : <StealthVisibleIcon />}
              </span>
            )}

            <span className={`overlay-mock-icon ${followEnabled ? 'active' : ''}`} aria-hidden>
              <FollowIcon />
            </span>
          </div>

          <div className="overlay-mock-divider" />

          <div className="overlay-mock-toolbar-right">
            {audioInteractive ? (
              <button
                type="button"
                className={`overlay-mock-icon audio-btn ${isRecording ? 'active' : ''}`}
                onClick={onAudioClick}
                aria-label="Start audio session"
              >
                <span className={`overlay-mock-waveform ${isRecording ? 'waveform-active' : ''}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            ) : (
              <span
                className={`overlay-mock-icon audio-btn ${isRecording ? 'active' : ''}`}
                aria-hidden
              >
                <span className={`overlay-mock-waveform ${isRecording ? 'waveform-active' : ''}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            )}

            <button type="button" className="overlay-mock-history" tabIndex={-1} aria-hidden>
              <span>History</span>
              <span className="overlay-mock-chevron">▼</span>
            </button>
          </div>
        </div>
      </div>

      {footer}
    </div>
  )
}
