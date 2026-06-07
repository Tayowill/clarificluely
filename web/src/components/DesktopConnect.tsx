'use client'

import { useState } from 'react'

export function DesktopConnect() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)

  async function openClarifiDesktop() {
    setLoading(true)
    setError(null)
    setOpened(false)

    try {
      const res = await fetch('/api/desktop/authorize', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.deepLink) {
        setError(data.error || 'Could not authorize desktop')
        return
      }

      window.location.href = data.deepLink
      setOpened(true)
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 border border-white/10 rounded-2xl mb-6">
      <h2 className="font-semibold mb-1">Connect Clarifi Desktop</h2>
      <p className="text-sm text-white/50 mb-4">
        Download and open Clarifi, then click below while signed in here. The desktop app will
        connect automatically — no codes or API keys needed.
      </p>

      <button
        type="button"
        onClick={openClarifiDesktop}
        disabled={loading}
        className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50"
      >
        {loading ? 'Opening…' : 'Open Clarifi Desktop'}
      </button>

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      {opened && (
        <p className="text-sm text-green-400 mt-4">
          Launching Clarifi… If nothing opens, install the desktop app first, then try again.
        </p>
      )}
    </div>
  )
}
