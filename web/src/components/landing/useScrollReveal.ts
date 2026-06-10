'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const REVEAL_ATTR = 'data-revealed'
const READY_CLASS = 'js-reveal-ready'

function isInRevealViewport(el: Element) {
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  return rect.top < vh * 0.88 && rect.bottom > vh * 0.12
}

export function useScrollReveal() {
  const pathname = usePathname()

  useEffect(() => {
    document.documentElement.classList.remove(READY_CLASS)
    document.querySelectorAll(`[data-reveal][${REVEAL_ATTR}]`).forEach((el) => {
      el.removeAttribute(REVEAL_ATTR)
    })

    // #region agent log
    fetch('http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '82728a' },
      body: JSON.stringify({
        sessionId: '82728a',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'useScrollReveal.ts:effect-start',
        message: 'scroll reveal effect started',
        data: {
          pathname,
          readyState: document.readyState,
          revealCount: document.querySelectorAll('[data-reveal]').length,
          alreadyRevealed: document.querySelectorAll(`[data-reveal][${REVEAL_ATTR}]`).length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    let cancelled = false
    let observer: IntersectionObserver | null = null
    let mutationObserver: MutationObserver | null = null
    let raf2 = 0

    const markRevealed = (el: Element) => {
      if (el.hasAttribute(REVEAL_ATTR)) return
      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '82728a' },
        body: JSON.stringify({
          sessionId: '82728a',
          runId: 'post-fix',
          hypothesisId: 'H3',
          location: 'useScrollReveal.ts:mark-revealed',
          message: 'setting data-revealed attribute',
          data: {
            className: (el as HTMLElement).className,
            readyState: document.readyState,
            htmlReady: document.documentElement.classList.contains(READY_CLASS),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      el.setAttribute(REVEAL_ATTR, '')
    }

    const startObserving = () => {
      if (cancelled) return

      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '82728a' },
        body: JSON.stringify({
          sessionId: '82728a',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'useScrollReveal.ts:deferred-start',
          message: 'deferred scroll reveal init',
          data: {
            pathname,
            readyState: document.readyState,
            revealCount: document.querySelectorAll('[data-reveal]').length,
            alreadyRevealed: document.querySelectorAll(`[data-reveal][${REVEAL_ATTR}]`).length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion

      document.querySelectorAll(`[data-reveal]:not([${REVEAL_ATTR}])`).forEach((el) => {
        if (isInRevealViewport(el)) markRevealed(el)
      })

      document.documentElement.classList.add(READY_CLASS)

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              markRevealed(entry.target)
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      )

      const observe = () => {
        if (!observer) return
        const targets = document.querySelectorAll(`[data-reveal]:not([${REVEAL_ATTR}])`)
        // #region agent log
        fetch('http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '82728a' },
          body: JSON.stringify({
            sessionId: '82728a',
            runId: 'pre-fix',
            hypothesisId: 'H2',
            location: 'useScrollReveal.ts:observe',
            message: 'observing reveal targets',
            data: { count: targets.length, readyState: document.readyState },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        targets.forEach((el) => observer!.observe(el))
      }

      observe()

      mutationObserver = new MutationObserver(observe)
      mutationObserver.observe(document.body, { childList: true, subtree: true })
    }

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(startObserving)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      observer?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [pathname])
}
