'use client'

type ProductWidgetProps = {
  size?: 'sm' | 'md' | 'lg'
  showCursor?: boolean
  showPill?: boolean
  className?: string
}

export function ActionBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`product-action-bar ${compact ? 'compact' : ''}`}>
      <span>Assist</span>
      <span>What should I say?</span>
      <span>Follow-up questions</span>
      <span>Recap</span>
    </div>
  )
}

export function ProductWidget({
  size = 'md',
  showCursor = false,
  showPill = true,
  className = '',
}: ProductWidgetProps) {
  return (
    <div className={`product-widget ${size} ${className}`}>
      {showPill && (
        <div className="product-widget-pill">
          <span className="product-widget-pill-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/clarifi-logo.png" alt="" className="landing-logo-img" />
          </span>
          <button type="button" className="product-widget-hide">
            Hide <span>▾</span>
          </button>
          <span className="product-widget-stop">⏹</span>
        </div>
      )}

      <div className="product-widget-body">
        <button type="button" className="product-widget-assist-btn">
          Assist
        </button>
        <p className="product-widget-label">Viewed screen.</p>
        <p className="product-widget-response">
          Clarifi is an AI meeting assistant that listens in real time, understands what&apos;s being
          said, and gives you instant answers, notes, and next steps — all while staying completely
          undetectable on your screen.
        </p>
        <ActionBar />
        <div className="product-widget-input">
          <span className="product-widget-input-text">
            Ask about your screen or conversation, or ⌘↵ for Assist
            {showCursor && <span className="product-widget-cursor" />}
          </span>
          <span className="product-widget-smart">✨ Smart</span>
          <span className="product-widget-send">▶</span>
        </div>
      </div>
    </div>
  )
}
