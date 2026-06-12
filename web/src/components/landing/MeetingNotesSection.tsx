'use client'

export function MeetingNotesSection() {
  return (
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
  )
}
