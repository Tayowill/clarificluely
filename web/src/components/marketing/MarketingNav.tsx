'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback } from 'react'

type MarketingNavProps = {
  active?: 'blog' | 'pricing'
  scrolled?: boolean
}

export function MarketingNav({ active, scrolled = false }: MarketingNavProps) {
  const scrollToJoin = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.location.href = '/#join'
  }, [])

  return (
    <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-nav-inner">
        <Link href="/" className="landing-nav-logo">
          <span className="landing-nav-logo-icon">
            <Image
              src="/clarifi-logo.png"
              alt="Clarifi"
              width={32}
              height={32}
              className="landing-logo-img"
            />
          </span>
          Clarifi
        </Link>
        <div className="landing-nav-links waitlist-nav-links">
          <Link
            href="/blog"
            className={`landing-nav-link${active === 'blog' ? ' landing-nav-link-active' : ''}`}
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className={`landing-nav-link${active === 'pricing' ? ' landing-nav-link-active' : ''}`}
          >
            Pricing
          </Link>
        </div>
        <button
          type="button"
          className="landing-cta landing-nav-cta"
          onClick={scrollToJoin}
        >
          Join the waitlist
        </button>
      </div>
    </nav>
  )
}
