import { useEffect, useRef } from 'react'

export default function SignInEmbed() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const syncBounds = () => {
      const rect = host.getBoundingClientRect()
      void window.electronAPI.invoke('onboarding:auth-pane-sync', {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    }

    void window.electronAPI.invoke('onboarding:auth-pane-show').then(() => {
      syncBounds()
    })

    const resizeObserver = new ResizeObserver(() => {
      syncBounds()
    })
    resizeObserver.observe(host)
    window.addEventListener('resize', syncBounds)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncBounds)
      void window.electronAPI.invoke('onboarding:auth-pane-hide')
    }
  }, [])

  return <div ref={hostRef} className="onboarding-auth-embed" />
}
