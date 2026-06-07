'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ComingSoonModal } from './ComingSoonModal'
import { InstallModal } from './InstallModal'
import { ActionBar, ProductWidget } from './ProductWidget'
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

const TESTIMONIALS = [
  {
    name: 'Marcus T.',
    role: 'Sales Director',
    company: 'Fintech startup',
    quote:
      'I close more deals because Clarifi feeds me answers in real time. Nobody on the call has any idea.',
  },
  {
    name: 'Priya N.',
    role: 'Product Manager',
    company: 'Enterprise SaaS',
    quote:
      'Screen share stays clean. Clarifi only exists on my screen — exactly what I needed for client demos.',
  },
  {
    name: 'James L.',
    role: 'Consultant',
    company: 'Independent',
    quote:
      'I used to scramble for notes after calls. Now I get action items live and walk out confident.',
  },
  {
    name: 'Elena R.',
    role: 'Recruiter',
    company: 'Talent agency',
    quote:
      'Interview prep on the fly without a bot joining the Zoom. Undetectable and genuinely useful.',
  },
]

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    tagline: 'Try Clarifi on your next call',
    features: ['5 sessions per day', 'Real-time assist', 'Meeting notes', 'Mac desktop app'],
    cta: 'download' as const,
    featured: false,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/mo',
    tagline: 'For professionals who live in meetings',
    features: ['Unlimited sessions', 'Priority support', 'Advanced AI models', 'Transcript export'],
    cta: 'billing' as const,
    featured: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/mo',
    tagline: 'Shared seats for growing teams',
    features: ['Everything in Pro', 'Team admin dashboard', 'Usage analytics', 'Dedicated support'],
    cta: 'billing' as const,
    featured: false,
  },
]

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function ClarifiLogo() {
  return (
    <Image
      src="/clarifi-logo.png"
      alt="Clarifi"
      width={32}
      height={32}
      className="landing-logo-img"
    />
  )
}

function GetMacButton({
  onClick,
  className = '',
  large = false,
  dark = false,
}: {
  onClick: () => void
  className?: string
  large?: boolean
  dark?: boolean
}) {
  return (
    <button
      type="button"
      className={`landing-cta ${dark ? 'landing-cta-dark' : ''} ${className} ${large ? 'landing-cta-large' : ''}`}
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
    const pct = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100))
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
        <div className="landing-compare-code">
          <div className="landing-compare-codebar" />
          <div className="landing-compare-overlay">AI Response</div>
        </div>
        <span className="landing-compare-badge visible">Visible to you</span>
      </div>
      <div className="landing-compare-right">
        <div className="landing-compare-code solo" />
        <span className="landing-compare-badge hidden">Invisible to others</span>
      </div>
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
  const [seconds, setSeconds] = useState(14)

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

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export function LandingPage({ macDownloadUrl }: LandingPageProps) {
  const [navScrolled, setNavScrolled] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useScrollReveal()

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40)
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
        <div className="landing-nav-inner">
          <Link href="/" className="landing-nav-logo">
            <span className="landing-nav-logo-icon">
              <ClarifiLogo />
            </span>
            Clarifi
          </Link>

          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('how-it-works')}>
              How it works
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('undetectable')}>
              Undetectability
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('pricing')}>
              Pricing
            </button>
            <button type="button" className="landing-nav-link" onClick={() => setMobileOpen(true)}>
              Mobile
            </button>
            <Link href="/blog" className="landing-nav-link">
              Blog
            </Link>
          </div>

          <GetMacButton onClick={triggerDownload} className="landing-nav-cta" />
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-glow landing-hero-glow-a" aria-hidden />
        <div className="landing-hero-glow landing-hero-glow-b" aria-hidden />
        <div className="landing-hero-content">
          <h1>#1 Undetectable AI for Meetings</h1>
          <p>
            Real-time answers and perfect notes — invisible on your screen, invisible on screen share.
          </p>
          <GetMacButton onClick={triggerDownload} large />
        </div>

        <div className="landing-hero-widget-wrap">
          <ProductWidget size="lg" showCursor showPill />
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section landing-section-tint" id="how-it-works" data-reveal>
        <div className="landing-section-header">
          <h2>How Clarifi helps during a meeting</h2>
        </div>
        <div className="landing-two-col">
          <div className="landing-feature-card blue">
            <p className="landing-card-title">
              Clarifi <span className="landing-pill-white">listens</span> in to the conversation
            </p>
            <p className="landing-card-sub">
              It picks up the context of your meeting in real time, so it can help when you need it.
            </p>
            <div className="landing-recording">
              <RecordingTimer />
              <p className="landing-recording-label">● Recording</p>
              <div className="landing-waveform">
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <div className="landing-card-action-bar">
              <ActionBar compact />
            </div>
          </div>

          <div className="landing-feature-card light">
            <p className="landing-card-title dark">
              When you need help, Clarifi <span className="landing-pill-muted">assists</span> you instantly
            </p>
            <p className="landing-card-sub dark">
              Hit ⌘ + Enter and Clarifi helps you with AI in the moment.
            </p>
            <ProductWidget size="sm" showPill showCursor={false} />
          </div>
        </div>
      </section>

      {/* Meeting notes */}
      <section className="landing-section" data-reveal>
        <div className="landing-section-header centered">
          <h2>Instant meeting notes</h2>
          <p>The easiest way to get beautiful, shareable meeting notes.</p>
        </div>
        <div className="landing-notes-stack">
          <div className="landing-notes-layer mobile">
            <div className="landing-notes-window">
              <p className="landing-notes-title">Design Session</p>
              <p className="landing-notes-meta">Nov 3 · Summary</p>
              <ul>
                <li>Choose video label</li>
                <li>Pick icon style</li>
              </ul>
            </div>
          </div>
          <div className="landing-notes-layer tablet">
            <div className="landing-notes-window">
              <p className="landing-notes-title">Creator Platform Program Design Session</p>
              <p className="landing-notes-meta">Monday, Nov 3</p>
              <div className="landing-notes-tabs">
                <span className="active">Summary</span>
                <span>Transcript</span>
                <span>Usage</span>
              </div>
              <p className="landing-notes-heading">Action Items</p>
              <ul>
                <li>Choose final label for creator-face videos</li>
                <li>Pick the icon style for Programs</li>
              </ul>
            </div>
          </div>
          <div className="landing-notes-layer desktop">
            <div className="landing-notes-window">
              <p className="landing-notes-title">Creator Platform Program Design Session</p>
              <p className="landing-notes-meta">Monday, Nov 3</p>
              <div className="landing-notes-tabs">
                <span className="active">Summary</span>
                <span>Transcript</span>
                <span>Usage</span>
              </div>
              <p className="landing-notes-heading">Action Items</p>
              <ul>
                <li>Choose final label for creator-face videos</li>
                <li>Pick the icon style for Programs</li>
                <li>Decide on the default landing page layout</li>
              </ul>
              <div className="landing-notes-ask">Ask Clarifi about this meeting…</div>
            </div>
          </div>
        </div>
      </section>

      {/* Undetectable */}
      <section className="landing-section landing-section-tint" id="undetectable" data-reveal>
        <div className="landing-section-header centered">
          <h2>Undetectable in every way</h2>
          <p>Suite of features to use Clarifi without a trace.</p>
        </div>
        <div className="landing-undetect-grid">
          <div className="landing-undetect-feature grad-purple">
            <div className="landing-undetect-visual">
              <div className="landing-participants">
                <p className="landing-participants-title">Meeting participants</p>
                <p>Gina Huels · Todd Cremin · Holly Gleason</p>
                <span className="landing-no-bots">✓ No bots detected</span>
              </div>
            </div>
            <h3>Doesn&apos;t join meetings.</h3>
            <p>No bots. No extra people on the guest list.</p>
          </div>

          <div className="landing-undetect-feature grad-pink">
            <div className="landing-undetect-visual">
              <CompareSlider />
            </div>
            <h3>Invisible to screen share.</h3>
            <p>Never shows up in shared screens, recordings, or external tools.</p>
          </div>

          <div className="landing-undetect-feature grad-blue">
            <div className="landing-undetect-visual landing-undetect-move">
              <div className="landing-move-widget">
                <ProductWidget size="sm" showPill={false} />
              </div>
              <div className="landing-keys-row">
                <span className="landing-key-mini">⌘</span>
                <span>+</span>
                <span className="landing-key-mini">↑</span>
                <span className="landing-key-mini">↓</span>
                <span className="landing-key-mini">←</span>
                <span className="landing-key-mini">→</span>
              </div>
            </div>
            <h3>Follows your eyes.</h3>
            <p>Fully moveable — position it exactly where you&apos;re looking.</p>
          </div>

          <div className="landing-undetect-feature grad-navy">
            <div className="landing-undetect-visual landing-compat-visual">
              <span>Zoom</span>
              <span>Slack</span>
              <span>Teams</span>
              <span>Meet</span>
              <span>Webex</span>
            </div>
            <h3>Works everywhere.</h3>
            <p>Compatible with every tool your team already uses.</p>
          </div>
        </div>
      </section>

      {/* Transcription */}
      <section className="landing-section" data-reveal>
        <div className="landing-stats-row">
          <div className="landing-transcript-mock">
            <div className="landing-notes-window">
              <p className="landing-notes-meta">Thursday, Oct 24 · Alexa, Roy, +3 more</p>
              <p className="landing-notes-title">Strategic Sales Growth Session</p>
              <div className="landing-notes-tabs">
                <span>Summary</span>
                <span className="active">Transcript</span>
                <span>Chats</span>
              </div>
              <p className="landing-transcript-line">
                <strong>You</strong> · Thanks for joining today, excited to walk through the platform.
              </p>
              <p className="landing-transcript-line">
                <strong>Them</strong> · Happy to — let&apos;s start with the core value prop.
              </p>
            </div>
          </div>
          <div>
            <h2 className="landing-stats-heading">Real-time transcription</h2>
            {[
              { num: '12+', title: 'Languages', desc: 'English, Chinese, Spanish, and more.' },
              { num: '300ms', title: 'Response time', desc: 'The fastest live transcription available.' },
              { num: '95%', title: 'Transcription accuracy', desc: 'Industry-leading accuracy, trusted by teams.' },
            ].map((stat) => (
              <div key={stat.title} className="landing-stat-item">
                <div className="landing-stat-num">{stat.num}</div>
                <div className="landing-stat-title">{stat.title}</div>
                <p>{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="landing-section landing-section-dark" data-reveal>
        <div className="landing-section-header centered">
          <h2>Loved by professionals who live in meetings</h2>
        </div>
        <div className="landing-testimonials">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="landing-testimonial-author">
                <span className="landing-testimonial-avatar">{t.name[0]}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role} · {t.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section landing-section-tint" id="pricing" data-reveal>
        <div className="landing-section-header centered">
          <h2>Simple pricing</h2>
          <p>Start free. Upgrade when you need more.</p>
        </div>
        <div className="landing-pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <div key={tier.name} className={`landing-pricing-card ${tier.featured ? 'featured' : ''}`}>
              {tier.featured && <span className="landing-pricing-badge">Most popular</span>}
              <h3>{tier.name}</h3>
              <p className="landing-pricing-price">
                {tier.price}
                {tier.period && <span>{tier.period}</span>}
              </p>
              <p className="landing-pricing-tagline">{tier.tagline}</p>
              <ul className="landing-pricing-features">
                {tier.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {tier.cta === 'download' ? (
                <GetMacButton onClick={triggerDownload} className="landing-pricing-cta" />
              ) : (
                <Link href="/billing" className="landing-cta landing-pricing-cta">
                  View plans
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section" data-reveal>
        <div className="landing-section-header">
          <h2>Frequently asked questions</h2>
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
      <section className="landing-prefooter" data-reveal>
        <h2>Meeting AI that helps during the call, not after.</h2>
        <p>Try Clarifi on your next meeting today.</p>
        <GetMacButton onClick={triggerDownload} large />
        <div className="landing-keys">
          <span className="landing-key cmd">⌘</span>
          <span className="landing-key enter">↵</span>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand-col">
            <Link href="/" className="landing-footer-logo">
              <span className="landing-footer-logo-icon">
                <ClarifiLogo />
              </span>
              Clarifi
            </Link>
            <span className="landing-footer-status">● All systems operational</span>
            <p className="landing-footer-tagline">AI that helps you, invisibly.</p>
          </div>

          <div className="landing-footer-columns">
            <div className="landing-footer-col">
              <h4>Resources</h4>
              <button type="button" className="landing-footer-link-btn" onClick={() => setMobileOpen(true)}>
                Mobile <span className="landing-footer-badge">New</span>
              </button>
              <Link href="/blog">Blog</Link>
              <Link href="/sign-up">Get started</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Support</h4>
              <a href="mailto:support@clarifi.app">Contact Us</a>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Legal</h4>
              <Link href="/sign-in">Privacy Policy</Link>
              <Link href="/billing">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} Clarifi. All rights reserved.
          </span>
          <div className="landing-footer-social">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
            <a href="https://github.com/Tayowill/clarificluely" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
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
