'use client'

type ComingSoonModalProps = {
  open: boolean
  onClose: () => void
}

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
  if (!open) return null

  return (
    <div className="landing-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="landing-modal"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="coming-soon-title"
      >
        <button type="button" className="landing-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="landing-coming-soon">
          <div className="landing-coming-soon-icon">📱</div>
          <h2 id="coming-soon-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
            Mobile app coming soon
          </h2>
          <p style={{ color: '#6b7280', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Clarifi for iOS and Android is on the way. Get the Mac app today for the full experience.
          </p>
        </div>
      </div>
    </div>
  )
}
