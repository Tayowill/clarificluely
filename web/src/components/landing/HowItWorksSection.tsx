'use client'

import { OverlayDemo } from './OverlayDemo'
import { RecordingTimer } from './RecordingTimer'

export function HowItWorksSection() {
  return (
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
          <div className="landing-card-overlay">
            <OverlayDemo size="sm" defaultRecording />
          </div>
        </div>

        <div className="landing-feature-card light">
          <p className="landing-card-title dark">
            When you need help, Clarifi <span className="landing-pill-muted">assists</span> you
            instantly
          </p>
          <p className="landing-card-sub dark">
            Hit ⌘ + Enter and Clarifi helps you with AI in the moment.
          </p>
          <OverlayDemo size="md" showQuickPrompts defaultScreen />
        </div>
      </div>
    </section>
  )
}
