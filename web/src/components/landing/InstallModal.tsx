'use client'

type InstallModalProps = {
  open: boolean
  onClose: () => void
  onDownloadAgain: () => void
}

export function InstallModal({ open, onClose, onDownloadAgain }: InstallModalProps) {
  if (!open) return null

  return (
    <div className="landing-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="landing-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="install-title"
      >
        <button type="button" className="landing-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="landing-downloaded-badge">
          <span>✓</span> Downloaded
        </div>
        <h2 id="install-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          How to install Clarifi
        </h2>
        <div className="landing-install-steps">
          <div>
            <div className="landing-install-step-num">1</div>
            <div className="landing-install-illustration">📁</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              Open <strong>Clarifi.dmg</strong> from your <strong>Downloads</strong> folder
            </p>
          </div>
          <div>
            <div className="landing-install-step-num">2</div>
            <div className="landing-install-illustration">↗️</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              Drag the <strong>Clarifi icon</strong> into your <strong>Applications</strong> folder
            </p>
          </div>
          <div>
            <div className="landing-install-step-num">3</div>
            <div className="landing-install-illustration">🚀</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              Open the <strong>Clarifi</strong> app from your <strong>Applications</strong> folder
            </p>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Problem?{' '}
          <button
            type="button"
            onClick={onDownloadAgain}
            style={{
              background: 'none',
              border: 'none',
              color: '#2b6cff',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            Download again
          </button>
        </p>
      </div>
    </div>
  )
}
