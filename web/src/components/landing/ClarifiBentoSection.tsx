'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { OverlayDemo } from './OverlayDemo'
import { MacBookMock } from './MacBookMock'
import { RecordingTimer } from './RecordingTimer'

function MenuBarMock() {
  return (
    <div className="bento-menubar">
      <div className="bento-menubar-left">
        <span className="bento-menubar-apple" aria-hidden>
          
        </span>
        <span className="bento-menubar-app">Clarifi</span>
      </div>
      <div className="bento-menubar-right">
        <span className="bento-menubar-recording">
          <span className="bento-rec-dot" />
          Recording
        </span>
        <span className="bento-menubar-timer">
          <RecordingTimer />
        </span>
      </div>
    </div>
  )
}

function AskClarifiScreen() {
  return (
    <div className="bento-app-screen">
      <MenuBarMock />
      <div className="bento-app-body">
        <aside className="bento-sidebar">
          <p className="bento-sidebar-label">Sessions</p>
          <button type="button" className="bento-sidebar-item active">
            Sales call · Today
          </button>
          <button type="button" className="bento-sidebar-item">
            Product review
          </button>
          <button type="button" className="bento-sidebar-item">
            Team sync
          </button>
        </aside>
        <div className="bento-chat-main">
          <div className="bento-chat-thread">
            <div className="bento-chat-user">
              What were my action items from yesterday&apos;s call?
            </div>
            <div className="bento-chat-assist">
              <Image src="/clarifi-logo.png" alt="" width={14} height={14} />
              <span className="bento-gathering-text">Gathering insights from your session…</span>
              <span className="bento-spark" aria-hidden>
                ✨
              </span>
            </div>
            <div className="bento-chat-reply">
              <p className="bento-chat-reply-label">Action items</p>
              <ul>
                <li>Send the one-pager with timeline and pricing</li>
                <li>Schedule a 2-week pilot kickoff</li>
                <li>Confirm CRM integration requirements</li>
              </ul>
            </div>
          </div>
          <div className="bento-chat-input">Ask Clarifi anything…</div>
        </div>
      </div>
      <div className="bento-overlay-slot">
        <OverlayDemo size="sm" />
      </div>
    </div>
  )
}

function RecordMeetingsCard() {
  return (
    <article className="clarifi-bento-card clarifi-bento-record bento-apple-card" data-reveal>
      <div className="bento-apple-card-visual">
        <Image
          src="/bento-record-macbook.jpg"
          alt=""
          fill
          className="bento-record-macbook-img"
          sizes="(max-width: 768px) 100vw, 420px"
        />
      </div>
      <div className="bento-apple-card-copy">
        <h3>Record meetings without a bot in the room</h3>
        <p>
          Your meetings stay completely normal. Just hit record on your desktop and let Clarifi
          handle the rest.
        </p>
      </div>
    </article>
  )
}

function LiveTranscriptMock() {
  return (
    <div className="bento-live-mock">
      <p className="landing-transcript-line">
        <strong>You</strong> · 0:14 — Thanks for walking through the rollout plan today.
      </p>
      <p className="landing-transcript-line">
        <strong>Them</strong> · 0:22 — Happy to — what does onboarding look like on your side?
      </p>
      <p className="landing-transcript-line">
        <strong>You</strong> · 0:31 — We usually start with a two-week pilot…
      </p>
      <div className="bento-suggestions">
        <div className="bento-suggestion type-response">
          <span>💬</span>
          <span>Offer a 2-week pilot, then expand seat-by-seat.</span>
        </div>
        <div className="bento-suggestion type-question">
          <span>❓</span>
          <span>What does your current onboarding workflow look like?</span>
        </div>
        <div className="bento-suggestion type-action">
          <span>✓</span>
          <span>Send a one-pager with timeline and pricing after the call.</span>
        </div>
      </div>
      <div className="bento-live-bar">
        <span className="bento-live-timer">00:14</span>
        <div className="bento-live-waveform active">
          <span />
          <span />
          <span />
          <span />
        </div>
        <span className="bento-live-pause">⏸</span>
        <span className="bento-live-stop">●</span>
      </div>
    </div>
  )
}

export function ClarifiBentoSection() {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('bento-in-view')
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="landing-section clarifi-bento-section">
      <div className="landing-section-header centered" data-reveal>
        <h2>Everything you need from every conversation</h2>
        <p>Record on your Mac, get instant recaps, and live AI support — all in one place.</p>
      </div>

      <div className="clarifi-bento" ref={gridRef}>
        <div className="clarifi-bento-main-col">
          <article className="clarifi-bento-card clarifi-bento-main" data-reveal>
            <h3>Ask Clarifi anything</h3>
            <p>
              Clarifi searches your meetings, transcripts, and screen context to answer questions
              and help you create follow-ups, recaps, and next steps.
            </p>
            <MacBookMock size="lg">
              <AskClarifiScreen />
            </MacBookMock>
          </article>

          <article className="clarifi-bento-card clarifi-bento-live" data-reveal>
            <h3>Live suggestions while you talk</h3>
            <p>Real-time transcription plus AI prompts for what to say, ask, or do next.</p>
            <LiveTranscriptMock />
          </article>
        </div>

        <div className="clarifi-bento-side">
          <RecordMeetingsCard />

          <article className="clarifi-bento-card clarifi-bento-recap" data-reveal>
            <div className="bento-recap-otter">
              <div className="bento-recap-otter-header">
                <h3>Instant recaps you can trust</h3>
                <p>
                  Clarifi turns every session into a clear summary with decisions, action items,
                  and a follow-up draft.
                </p>
              </div>
              <div className="bento-recap-otter-shot">
                <Image
                  src="/bento-recap-summary.png"
                  alt=""
                  width={1024}
                  height={1013}
                  className="bento-recap-summary-img"
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
