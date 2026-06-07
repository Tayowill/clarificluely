'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ComingSoonModal } from './ComingSoonModal'
import { InstallModal } from './InstallModal'
import './landing.css'

type LandingPageProps = {
  macDownloadUrl: string
}

const FAQ_ITEMS = [
  {
    q: 'Why real-time vs. a regular AI notetaker?',
    a: 'Clarifi helps you during the call — suggesting what to say, answering questions, and capturing context live — not just after the meeting ends.',
  },
  {
    q: 'Who is Clarifi for?',
    a: 'Sales calls, interviews, client meetings, lectures — anyone who wants an invisible AI co-pilot in the moment.',
  },
  {
    q: 'Is Clarifi free?',
    a: 'Yes. Start free with 5 sessions per day. Upgrade to Pro for unlimited sessions and advanced features.',
  },
  {
    q: 'How is it undetectable in meetings?',
    a: 'Clarifi never joins as a bot, stays invisible on screen share, and runs as a lightweight desktop overlay you control.',
  },
  {
    q: 'What languages and apps are supported?',
    a: 'English transcription today with more languages coming. Works alongside Zoom, Meet, Teams, Slack, and any desktop app.',
  },
  {
    q: 'Can I talk to customer support?',
    a: 'Reach us anytime at support@clarifi.app — we typically respond within 24 hours.',
  },
]

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function GetMacButton({
  onClick,
  className = '',
  large = false,
}: {
  onClick: () => void
  className?: string
  large?: boolean
}) {
  return (
    <button
      type="button"
      className={`landing-cta ${className} ${large ? 'landing-hero-cta' : ''}`}
      onClick={onClick}
    >
      <AppleIcon /> Get for Mac
    </button>
  )
}

function CompareSlider() {
  const [pos, setPos] = useState(50)
  const dragging = useRef(false)

  const move = useCallback((clientX: number, rect: DOMRect) => {
    const pct = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }, [])

  return (
    <div
      className="landing-compare"
      onMouseMove={(e) => {
        if (!dragging.current) return
        move(e.clientX, e.currentTarget.getBoundingClientRect())
      }}
      onMouseUp={() => { dragging.current = false }}
      onMouseLeave={() => { dragging.current = false }}
      onTouchMove={(e) => {
        if (!dragging.current || !e.touches[0]) return
        move(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())
      }}
      onTouchEnd={() => { dragging.current = false }}
    >
      <div className="landing-compare-left" style={{ width: `${pos}%` }}>
        <div style={{ padding: 12, fontSize: 11, color: '#1e40af' }}>
          <div style={{ background: '#1e1e1e', color: '#fff', borderRadius: 8, padding: 8, marginTop: 40 }}>
            AI Response visible to you
          </div>
        </div>
      </div>
      <div className="landing-compare-right" />
      <div
        className="landing-compare-handle"
        style={{ left: `${pos}%` }}
        onMouseDown={() => { dragging.current = true }}
        onTouchStart={() => { dragging.current = true }}
      >
        ⇔
      </div>
    </div>
  )
}

function RecordingTimer() {
  const [seconds, setSeconds] = useState(6)

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => (s >= 59 ? 0 : s + 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return <div className="landing-timer">{mm}:{ss}</div>
}

export function LandingPage({ macDownloadUrl }: LandingPageProps) {
  const [navScrolled, setNavScrolled] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const triggerDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = macDownloadUrl
    a.download = 'Clarifi-0.1.0-arm64.dmg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setInstallOpen(true)
  }, [macDownloadUrl])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-root">
      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="landing-nav-logo">
          <span className="landing-nav-logo-icon">✦</span>
          Clarifi
        </Link>
        <div className="landing-nav-links">
          <button type="button" className="landing-nav-link" onClick={() => scrollTo('undetectable')}>
            Undetectability
          </button>
          <button type="button" className="landing-nav-link" onClick={() => setMobileOpen(true)}>
            Mobile
          </button>
          <Link href="/blog" className="landing-nav-link">
            Blog
          </Link>
        </div>
      </nav>

      <GetMacButton onClick={triggerDownload} className="landing-cta-sticky" />

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-mountains" aria-hidden>
          <svg viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path fill="rgba(255,255,255,0.15)" d="M0,200 L200,80 L400,140 L600,40 L800,120 L1000,60 L1200,100 L1200,200 Z" />
            <path fill="rgba(255,255,255,0.25)" d="M0,200 L300,100 L500,160 L700,70 L900,130 L1200,90 L1200,200 Z" />
          </svg>
        </div>
        <h1>#1 Undetectable AI for Meetings</h1>
        <p>
          Clarifi takes perfect meeting notes and gives real-time answers, all while completely
          undetectable
        </p>
        <GetMacButton onClick={triggerDownload} large />

        <div className="landing-hero-mockup">
          <div className="landing-mockup-bg">
            <div className="landing-overlay-bar">
              <span style={{ color: '#fff', fontSize: 12, padding: '0 8px' }}>✦</span>
              <span style={{ background: '#2b6cff', color: '#fff', borderRadius: 9999, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>✨ Ask</span>
              <span style={{ color: '#fff', fontSize: 12, padding: '4px 8px' }}>⏹</span>
            </div>
            <div className="landing-video-window">
              <div className="landing-video-grid">
                <div className="landing-video-tile">Alex</div>
                <div className="landing-video-tile">Jordan</div>
              </div>
            </div>
          </div>
          <div className="landing-dock">
            <span className="landing-dock-icon" style={{ background: '#e5e7eb' }}>▦</span>
            <span className="landing-dock-icon" style={{ background: '#3b82f6', color: '#fff' }}>◎</span>
            <span className="landing-dock-icon" style={{ background: '#6b7280', color: '#fff' }}>⚙</span>
            <span className="landing-dock-icon" style={{ background: '#2563eb', color: '#fff' }}>📹</span>
            <span className="landing-dock-icon" style={{ background: '#2b6cff', color: '#fff' }}>✦</span>
            <span className="landing-dock-icon" style={{ background: '#e5e7eb' }}>🗑</span>
          </div>
        </div>
      </section>

      {/* How Clarifi helps */}
      <section className="landing-section">
        <div className="landing-section-header">
          <div>
            <h2>How Clarifi helps during a meeting</h2>
          </div>
          <GetMacButton onClick={triggerDownload} />
        </div>
        <div className="landing-two-col">
          <div className="landing-feature-card blue">
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Clarifi ✦ <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 9999 }}>listens</span> in to the conversation
            </p>
            <p style={{ opacity: 0.85, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              It picks up the context of your meeting in real time, so it can help when you need it.
            </p>
            <div className="landing-recording">
              <RecordingTimer />
              <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>● Recording</p>
              <div className="landing-waveform">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
          </div>
          <div className="landing-feature-card light">
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              When you need help, Clarifi ✨ assists you instantly
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Hit ⌘ + Enter and Clarifi helps you with AI in the moment.
            </p>
            <div className="landing-assist-ui">
              <p style={{ marginBottom: 8 }}>Viewed screen. Clarifi is an AI meeting assistant that listens in real time...</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: 0.7, fontSize: 11 }}>
                <span>Assist</span>
                <span>What should I say?</span>
                <span>Follow-up questions</span>
                <span>Recap</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meeting notes */}
      <section className="landing-section">
        <div className="landing-section-header">
          <div>
            <h2>Instant meeting notes</h2>
            <p>The easiest way to get beautiful, shareable meeting notes.</p>
          </div>
          <GetMacButton onClick={triggerDownload} />
        </div>
        <div className="landing-notes-mock">
          <div className="landing-notes-window">
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Creator Platform Program Design Session</p>
            <p style={{ color: '#6b7280', margin: '4px 0 12px' }}>Monday, Nov 3</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: '#6b7280' }}>
              <span style={{ fontWeight: 600, color: '#111' }}>Summary</span>
              <span>Transcript</span>
              <span>Usage</span>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Action Items</p>
            <ul style={{ paddingLeft: 16, color: '#374151', lineHeight: 1.8 }}>
              <li>Choose final label for creator-face videos</li>
              <li>Pick the icon style for Programs</li>
              <li>Decide on the default landing page layout</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Undetectable */}
      <section className="landing-section" id="undetectable">
        <div className="landing-section-header" style={{ flexDirection: 'column', textAlign: 'center', alignItems: 'center' }}>
          <h2>Undetectable in every way</h2>
          <p>Suite of features to use Clarifi without a trace.</p>
        </div>
        <div className="landing-three-col">
          <div className="landing-undetect-card">
            <div style={{ background: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, border: '1px solid #e5e7eb', fontSize: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Meeting participants</p>
              <p style={{ color: '#6b7280' }}>Gina · Todd · Holly</p>
              <span style={{ float: 'right', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 9999, fontSize: 11 }}>✓ No bots detected</span>
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Doesn&apos;t join meetings.</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Clarifi never joins your meetings, so there are no bots and no extra people on the guest list.
            </p>
          </div>
          <div className="landing-undetect-card">
            <CompareSlider />
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Invisible to screen share.</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Clarifi never shows up in shared screens, recordings, or external meeting tools.
            </p>
          </div>
          <div className="landing-undetect-card">
            <div style={{ background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', borderRadius: 12, height: 140, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#1e1e1e', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>AI Response ↗</div>
            </div>
            <div className="landing-keys" style={{ marginTop: 0, marginBottom: 12 }}>
              <span className="landing-key cmd" style={{ fontSize: 11, padding: '4px 10px' }}>⌘</span>
              <span style={{ color: '#9ca3af' }}>+</span>
              <span style={{ display: 'flex', gap: 2 }}>
                {['↑', '↓', '←', '→'].map((k) => (
                  <span key={k} className="landing-key" style={{ fontSize: 10, padding: '4px 8px' }}>{k}</span>
                ))}
              </span>
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Follows your eyes.</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Clarifi window is fully moveable so you can position it exactly where you&apos;re looking.
            </p>
          </div>
        </div>
        <div className="landing-compat">
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#9ca3af', fontWeight: 600 }}>COMPATIBLE WITH EVERY TOOL</p>
          <div className="landing-compat-logos">
            <span>Zoom</span>
            <span>Slack</span>
            <span>Webex</span>
            <span>Microsoft Teams</span>
            <span>Google Meet</span>
          </div>
        </div>
      </section>

      {/* Transcription */}
      <section className="landing-section">
        <div className="landing-stats-row">
          <div className="landing-notes-mock">
            <div className="landing-notes-window">
              <p style={{ color: '#6b7280', fontSize: 12 }}>Thursday, Oct 24 · Alexa, Roy, +3 more</p>
              <p style={{ fontWeight: 700, margin: '8px 0' }}>Strategic Sales Growth Session</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                <span>Summary</span>
                <span style={{ fontWeight: 600, color: '#111' }}>Transcript</span>
                <span>Chats</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
                <strong style={{ color: '#2b6cff' }}>You</strong> · Thanks for joining today...<br />
                <strong>Them</strong> · Happy to walk through the platform...
              </p>
            </div>
          </div>
          <div>
            <div className="landing-section-header" style={{ marginBottom: '1rem' }}>
              <h2>Real-time transcription</h2>
              <GetMacButton onClick={triggerDownload} />
            </div>
            {[
              { num: '12+', title: 'Languages', desc: 'We support over 12 different languages, including English, Chinese, Spanish, and more.' },
              { num: '300ms', title: 'Response time', desc: 'We have the fastest live transcription available. Test us against any other competitor.' },
              { num: '95%', title: 'Transcription accuracy', desc: 'Trusted by many teams for reliable transcription. All processed with industry-leading accuracy.' },
            ].map((stat) => (
              <div key={stat.title} className="landing-stat-item">
                <div className="landing-stat-num">{stat.num}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{stat.title}</div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2>Frequently asked questions</h2>
          <GetMacButton onClick={triggerDownload} />
        </div>
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} className={`landing-faq-item ${openFaq === i ? 'open' : ''}`}>
            <button
              type="button"
              className="landing-faq-trigger"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {item.q}
              <span className="landing-faq-chevron">▼</span>
            </button>
            <div className="landing-faq-content">{item.a}</div>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <footer className="landing-footer">
        <h2>Meeting AI that helps during the call, not after.</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Try Clarifi on your next meeting today.</p>
        <GetMacButton onClick={triggerDownload} large />
        <div className="landing-keys">
          <span className="landing-key cmd">⌘</span>
          <span className="landing-key enter">↵</span>
        </div>
        <div className="landing-footer-grid">
          <div>
            <div className="landing-nav-logo" style={{ color: '#111', marginBottom: 12 }}>
              <span className="landing-nav-logo-icon" style={{ background: '#2b6cff', color: '#fff' }}>✦</span>
              Clarifi
            </div>
            <span style={{ fontSize: 12, color: '#16a34a' }}>● All systems operational</span>
          </div>
          <div>
            <h4>Resources</h4>
            <button type="button" className="landing-nav-link" style={{ color: '#6b7280', padding: 0 }} onClick={() => setMobileOpen(true)}>Mobile</button>
            <Link href="/blog">Blog</Link>
            <Link href="/sign-up">Get started</Link>
          </div>
          <div>
            <h4>Support</h4>
            <a href="mailto:support@clarifi.app">Contact Us</a>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/billing">Pricing</Link>
          </div>
        </div>
      </footer>

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        onDownloadAgain={triggerDownload}
      />
      <ComingSoonModal open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  )
}
