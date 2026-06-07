import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import './onboarding.css'
import OverlayMock from './OverlayMock'
import SignInEmbed from './SignInEmbed'
import { ClarifiLogo, SlideToContinue } from './onboarding-welcome'

type Step =
  | 'welcome'
  | 'sign-in'
  | 'permissions'
  | 'shortcut-enter'
  | 'shortcut-move'
  | 'shortcut-listen'
  | 'shortcut-stealth'
  | 'paywall'

type PermissionKind = 'accessibility' | 'microphone' | 'screen'

type PermissionState = {
  accessibility: boolean
  microphone: boolean
  screen: boolean
  allGranted: boolean
}

type TutorialStep = 'enter' | 'move' | 'listen' | 'stealth'

const STEPS: Step[] = [
  'welcome',
  'sign-in',
  'permissions',
  'shortcut-enter',
  'shortcut-move',
  'shortcut-listen',
  'shortcut-stealth',
  'paywall',
]

type PreviewPanelProps = {
  step: Step
  mockOffset: { x: number; y: number }
  onPreviewListen: () => void
  onPreviewStealth: () => void
}

function MeetingMockFooter() {
  return (
    <div className="overlay-mock-video">
      <div className="overlay-mock-video-tiles">
        <div className="overlay-mock-video-tile" />
        <div className="overlay-mock-video-tile" />
      </div>
      <div className="overlay-mock-video-controls">
        <span>Unmute</span>
        <span>Start Video</span>
        <span className="overlay-mock-video-end">End</span>
      </div>
    </div>
  )
}

function PreviewPanel({ step, mockOffset, onPreviewListen, onPreviewStealth }: PreviewPanelProps) {
  const [previewRecording, setPreviewRecording] = useState(false)

  useEffect(() => {
    setPreviewRecording(false)
  }, [step])

  if (step === 'welcome') {
    return (
      <div className="preview-welcome-scene">
        <div className="preview-welcome-scene-bg">
          <OverlayMock placeholder="Ask me anything" />
          <p className="preview-welcome-tagline">
            Your real-time AI assistant,
            <br />
            always ready to help.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'sign-in') {
    return <SignInEmbed />
  }

  if (step === 'permissions') {
    return (
      <div className="preview-settings-stack">
        <div className="preview-dialog">
          <div className="preview-dialog-title">
            <span>🔒</span>
            <span>
              &quot;Clarifi&quot; would like to control this computer using accessibility
              features.
            </span>
          </div>
          <p>Open System Settings and enable Clarifi under Privacy &amp; Security.</p>
          <div className="preview-dialog-actions">
            <button type="button" className="preview-dialog-btn preview-dialog-btn-primary">
              Open System Settings
            </button>
            <button type="button" className="preview-dialog-btn preview-dialog-btn-secondary">
              Deny
            </button>
          </div>
        </div>
        <div className="preview-settings-pane">
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Accessibility</div>
          <div className="preview-settings-row">
            <span>Clarifi</span>
            <div className="preview-settings-toggle" />
          </div>
          <div className="preview-settings-row">
            <span>Slack</span>
            <div className="preview-settings-toggle off" />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'shortcut-enter') {
    return <OverlayMock placeholder="Ask me anything" />
  }

  if (step === 'shortcut-move') {
    return (
      <OverlayMock
        placeholder="Ask me anything"
        showMoveArrows
        style={{ transform: `translate(${mockOffset.x}px, ${mockOffset.y}px)` }}
      />
    )
  }

  if (step === 'shortcut-listen') {
    return (
      <OverlayMock
        placeholder="Ask me anything"
        isRecording={previewRecording}
        onAudioClick={() => {
          setPreviewRecording(true)
          onPreviewListen()
        }}
        footer={<MeetingMockFooter />}
      />
    )
  }

  if (step === 'shortcut-stealth') {
    return (
      <OverlayMock
        placeholder="Ask me anything"
        stealthEnabled
        onStealthClick={onPreviewStealth}
        footer={<MeetingMockFooter />}
      />
    )
  }

  if (step === 'paywall') {
    return (
      <div className="paywall-grid">
        <div className="paywall-card pro">
          <h4>Pro</h4>
          <div className="paywall-price">
            $20<span>/mo</span>
          </div>
          <ul className="paywall-features">
            <li>Unlimited AI responses</li>
            <li>Unlimited audio sessions</li>
            <li>Access to newest AI models</li>
            <li>Priority chat support</li>
          </ul>
          <button type="button" className="paywall-card-btn">
            Upgrade
          </button>
        </div>
        <div className="paywall-card undetect">
          <span className="paywall-badge">Popular</span>
          <h4>Pro + Undetectability</h4>
          <div className="paywall-price">
            $49<span>/mo</span>
          </div>
          <ul className="paywall-features">
            <li>Everything in Pro</li>
            <li>Hidden from screen share</li>
            <li>Team admin dashboard</li>
            <li>Dedicated support</li>
          </ul>
          <button type="button" className="paywall-card-btn">
            Upgrade
          </button>
        </div>
      </div>
    )
  }

  return null
}

function PermissionRow({
  title,
  description,
  granted,
  onToggle,
}: {
  title: string
  description: string
  granted: boolean
  onToggle: () => void
}) {
  return (
    <div className="permission-row">
      <div className={`permission-icon ${granted ? 'granted' : 'pending'}`}>
        {granted ? '✓' : ''}
      </div>
      <div className="permission-body">
        <div className="permission-title">{title}</div>
        <div className="permission-desc">{description}</div>
      </div>
      <button
        type="button"
        className={`permission-toggle ${granted ? 'on' : 'off'}`}
        onClick={onToggle}
        aria-label={`${title} permission`}
      />
    </div>
  )
}

export default function OnboardingApp() {
  const [step, setStep] = useState<Step>('welcome')
  const [signInStatus, setSignInStatus] = useState<'idle' | 'waiting' | 'connected' | 'error'>(
    'idle',
  )
  const [signInError, setSignInError] = useState('')
  const [permissions, setPermissions] = useState<PermissionState>({
    accessibility: false,
    microphone: false,
    screen: false,
    allGranted: false,
  })
  const [tutorialDone, setTutorialDone] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [mockOffset, setMockOffset] = useState({ x: 0, y: 0 })

  const stepIndex = STEPS.indexOf(step)
  const canGoBack = stepIndex > 0 && step !== 'welcome'

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1])
      setTutorialDone(false)
      setMockOffset({ x: 0, y: 0 })
    }
  }, [step])

  const goBack = useCallback(() => {
    const idx = STEPS.indexOf(step)
    if (idx > 0) {
      void window.electronAPI.invoke('onboarding:stop-tutorial')
      setStep(STEPS[idx - 1])
      setTutorialDone(false)
      setMockOffset({ x: 0, y: 0 })
    }
  }, [step])

  const finishOnboarding = useCallback(async () => {
    if (completing) return
    setCompleting(true)
    try {
      await window.electronAPI.invoke('onboarding:stop-tutorial')
      await window.electronAPI.invoke('onboarding:complete')
    } catch {
      setCompleting(false)
    }
  }, [completing])

  const refreshPermissions = useCallback(async () => {
    const result = (await window.electronAPI.invoke('permissions:status')) as PermissionState
    setPermissions(result)
  }, [])

  const refreshConnection = useCallback(async () => {
    const result = (await window.electronAPI.invoke('auth:connection-status')) as {
      connected?: boolean
      hasApiUrl?: boolean
    }
    if (!result.hasApiUrl) {
      setSignInStatus('connected')
      return true
    }
    if (result.connected) {
      setSignInStatus('connected')
      return true
    }
    return false
  }, [])

  const requestPermission = useCallback(
    async (kind: PermissionKind) => {
      await window.electronAPI.invoke('permissions:request', { kind })
      await refreshPermissions()
    },
    [refreshPermissions],
  )

  const openSignIn = useCallback(async () => {
    setSignInError('')
    setSignInStatus('waiting')
    try {
      await window.electronAPI.invoke('auth:open-sign-in')
    } catch {
      setSignInStatus('error')
      setSignInError('Could not open browser')
    }
  }, [])

  // Sign-in: poll connection + listen for deep link
  useEffect(() => {
    if (step !== 'sign-in') return

    void refreshConnection()

    const onAuth = () => {
      setSignInStatus('connected')
    }
    window.electronAPI.on('onboarding:auth-connected', onAuth)

    const interval = window.setInterval(() => {
      void refreshConnection()
    }, 2000)

    return () => window.clearInterval(interval)
  }, [step, refreshConnection])

  // Auto-advance when signed in
  useEffect(() => {
    if (step === 'sign-in' && signInStatus === 'connected') {
      const timer = window.setTimeout(() => goNext(), 600)
      return () => window.clearTimeout(timer)
    }
  }, [step, signInStatus, goNext])

  // Permissions polling
  useEffect(() => {
    if (step !== 'permissions') return
    void refreshPermissions()
    const interval = window.setInterval(() => {
      void refreshPermissions()
    }, 1000)
    return () => window.clearInterval(interval)
  }, [step, refreshPermissions])

  // Tutorial steps
  const tutorialStep: TutorialStep | null = useMemo(() => {
    if (step === 'shortcut-enter') return 'enter'
    if (step === 'shortcut-move') return 'move'
    if (step === 'shortcut-listen') return 'listen'
    if (step === 'shortcut-stealth') return 'stealth'
    return null
  }, [step])

  useEffect(() => {
    if (!tutorialStep) {
      void window.electronAPI.invoke('onboarding:stop-tutorial')
      return
    }

    setTutorialDone(false)
    void window.electronAPI.invoke('onboarding:start-tutorial', { step: tutorialStep })

    const onTutorial = (payload: unknown) => {
      const data = payload as { type?: TutorialStep }
      if (data.type === tutorialStep) {
        setTutorialDone(true)
      }
    }
    window.electronAPI.on('onboarding:tutorial-event', onTutorial)

    return () => {
      void window.electronAPI.invoke('onboarding:stop-tutorial')
    }
  }, [tutorialStep])

  useEffect(() => {
    const onNudge = (payload: unknown) => {
      const data = payload as { dx?: number; dy?: number }
      const dx = data.dx
      const dy = data.dy
      if (typeof dx !== 'number' || typeof dy !== 'number') return
      setMockOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }
    window.electronAPI.on('onboarding:mock-nudge', onNudge)
  }, [])

  const signalPreviewListen = useCallback(() => {
    void window.electronAPI.invoke('onboarding:tutorial-signal', { type: 'listen' })
  }, [])

  const signalPreviewStealth = useCallback(() => {
    void window.electronAPI.invoke('onboarding:tutorial-signal', { type: 'stealth' })
  }, [])

  const permissionCta = useMemo(() => {
    if (permissions.accessibility) {
      if (permissions.microphone) {
        if (!permissions.screen) return { label: 'Allow screen access', kind: 'screen' as const }
        return null
      }
      return { label: 'Allow microphone access', kind: 'microphone' as const }
    }
    return { label: 'Allow accessibility access', kind: 'accessibility' as const }
  }, [permissions])

  const openBilling = useCallback(async () => {
    await window.electronAPI.invoke('onboarding:open-billing')
  }, [])

  let leftContent: ReactNode
  let primaryCta: ReactNode
  let secondaryCta: ReactNode = null

  if (step === 'welcome') {
    leftContent = (
      <>
        <div className="onboarding-brand">
          <ClarifiLogo />
          <div className="onboarding-brand-text">
            <h1>Welcome to Clarifi</h1>
            <p>The ultimate AI meeting co-pilot.</p>
          </div>
        </div>
        <p className="onboarding-sub" style={{ marginTop: 0 }}>
          Real-time answers and perfect notes — invisible on your screen, invisible on screen share.
        </p>
      </>
    )
    primaryCta = <SlideToContinue onComplete={goNext} />
  } else if (step === 'sign-in') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Sign in to continue</h2>
        <p className="onboarding-sub">
          Use the panel on the right to sign in or create an account. Google, Apple, and email are
          supported. Clarifi Desktop links automatically when you&apos;re done.
        </p>
        {signInStatus === 'connected' && (
          <p className="onboarding-status-text success">Account connected!</p>
        )}
        {signInError && <p className="onboarding-status-text error">{signInError}</p>}
      </>
    )
    primaryCta =
      signInStatus === 'connected' ? (
        <button type="button" className="onboarding-cta onboarding-cta-primary" onClick={goNext}>
          Continue
          <span>›</span>
        </button>
      ) : (
        <p className="onboarding-status-text">Sign in on the right to continue</p>
      )
    secondaryCta = (
      <button type="button" className="onboarding-skip" onClick={() => void openSignIn()}>
        Open in browser instead
      </button>
    )
  } else if (step === 'permissions') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Let&apos;s get you set up</h2>
        <p className="onboarding-sub">
          Clarifi needs a few permissions to assist you during meetings and on your screen.
        </p>
        <div className="permission-list">
          <PermissionRow
            title="Allow Clarifi to assist"
            description="Clarifi uses accessibility access for global shortcuts and app-aware controls."
            granted={permissions.accessibility}
            onToggle={() => void requestPermission('accessibility')}
          />
          <PermissionRow
            title="Allow Clarifi to hear audio"
            description="Clarifi can listen to audio when you start a session."
            granted={permissions.microphone}
            onToggle={() => void requestPermission('microphone')}
          />
          <PermissionRow
            title="Allow Clarifi to see your screen"
            description="Clarifi can answer questions about what you're viewing."
            granted={permissions.screen}
            onToggle={() => void requestPermission('screen')}
          />
        </div>
        {permissions.allGranted && (
          <p className="onboarding-status-text success">All permissions granted</p>
        )}
      </>
    )
    if (permissions.allGranted) {
      primaryCta = (
        <button type="button" className="onboarding-cta onboarding-cta-primary" onClick={goNext}>
          Continue
          <span>›</span>
        </button>
      )
    } else if (permissionCta) {
      primaryCta = (
        <button
          type="button"
          className="onboarding-cta onboarding-cta-primary"
          onClick={() => void requestPermission(permissionCta.kind)}
        >
          {permissionCta.label}
        </button>
      )
    }
  } else if (step === 'shortcut-enter') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Press ⌘↵ to get an instant answer</h2>
        <p className="onboarding-sub">
          Clarifi uses your screen context to respond — try the shortcut while practicing with the
          preview on the right.
        </p>
        <div className="onboarding-press-row">
          <span className="onboarding-kbd">⌘</span>
          <span className="onboarding-kbd-plus">+</span>
          <span className="onboarding-kbd">↵</span>
        </div>
      </>
    )
    primaryCta = (
      <button
        type="button"
        className="onboarding-cta onboarding-cta-secondary"
        onClick={goNext}
        disabled={!tutorialDone}
      >
        {tutorialDone ? 'Continue' : 'Use the shortcut to continue'}
        {tutorialDone && <span>›</span>}
      </button>
    )
  } else if (step === 'shortcut-move') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Now, try to move Clarifi around</h2>
        <p className="onboarding-sub">You can move it in any direction with your keyboard.</p>
        <div className="onboarding-shortcut-row">
          <div className="onboarding-arrow-grid">
            <div className="spacer" />
            <span className="onboarding-kbd">↑</span>
            <div className="spacer" />
            <span className="onboarding-kbd">←</span>
            <div className="spacer" />
            <span className="onboarding-kbd">→</span>
            <div className="spacer" />
            <span className="onboarding-kbd">↓</span>
            <div className="spacer" />
          </div>
          <div className="onboarding-press-row">
            <span className="onboarding-kbd">⌘</span>
            <span className="onboarding-kbd-plus">+</span>
            <span className="onboarding-kbd-label">arrow keys</span>
          </div>
        </div>
      </>
    )
    primaryCta = (
      <button
        type="button"
        className="onboarding-cta onboarding-cta-secondary"
        onClick={goNext}
        disabled={!tutorialDone}
      >
        {tutorialDone ? 'Continue' : 'Use the shortcut to continue'}
        {tutorialDone && <span>›</span>}
      </button>
    )
  } else if (step === 'shortcut-listen') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Clarifi can also listen to you</h2>
        <p className="onboarding-sub">
          Click the audio icon on the right side of the bar to start a session. Clarifi listens to
          your microphone and meeting audio.
        </p>
      </>
    )
    primaryCta = (
      <button
        type="button"
        className="onboarding-cta onboarding-cta-secondary"
        onClick={goNext}
        disabled={!tutorialDone}
      >
        {tutorialDone ? 'Continue' : 'Start a listening session to continue'}
        {tutorialDone && <span>›</span>}
      </button>
    )
  } else if (step === 'shortcut-stealth') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Clarifi stays undetectable</h2>
        <p className="onboarding-sub">
          The green eye means you&apos;re hidden from screen share and recordings. Click it in the
          preview to continue.
        </p>
      </>
    )
    primaryCta = (
      <button
        type="button"
        className="onboarding-cta onboarding-cta-secondary"
        onClick={goNext}
        disabled={!tutorialDone}
      >
        {tutorialDone ? 'Continue' : 'Click the green eye to continue'}
        {tutorialDone && <span>›</span>}
      </button>
    )
  } else if (step === 'paywall') {
    leftContent = (
      <>
        <h2 className="onboarding-heading">Unlock all features with Clarifi Pro</h2>
        <p className="onboarding-sub">
          Get unlimited sessions, priority support, and undetectability on screen share.
        </p>
      </>
    )
    primaryCta = (
      <button
        type="button"
        className="onboarding-cta onboarding-cta-primary"
        onClick={() => void openBilling()}
      >
        View plans
        <span>›</span>
      </button>
    )
    secondaryCta = (
      <button
        type="button"
        className="onboarding-skip"
        onClick={() => void finishOnboarding()}
        disabled={completing}
      >
        {completing ? 'Starting Clarifi…' : 'Start with free →'}
      </button>
    )
  }

  return (
    <div className="onboarding-root">
      <div className="onboarding-drag-region" aria-hidden />
      <div className="onboarding-panel onboarding-panel-left">
        {canGoBack && (
          <button type="button" className="onboarding-back" onClick={goBack}>
            ← Back
          </button>
        )}

        <div className="onboarding-content">
          {leftContent}
          <div className="onboarding-footer">
            {primaryCta}
            {step === 'welcome' && (
              <p className="onboarding-legal">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
            {secondaryCta}
          </div>
        </div>
      </div>

      <div className={`onboarding-preview ${step === 'sign-in' ? 'onboarding-preview-sign-in' : ''}`}>
        {step !== 'sign-in' && <div className="onboarding-preview-grid" />}
        {permissions.allGranted && step === 'permissions' ? (
          <div className="preview-complete">
            <div className="preview-complete-icon">✓</div>
            <h3>All set!</h3>
          </div>
        ) : (
          <PreviewPanel
            step={step}
            mockOffset={mockOffset}
            onPreviewListen={signalPreviewListen}
            onPreviewStealth={signalPreviewStealth}
          />
        )}
      </div>
    </div>
  )
}
