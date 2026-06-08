'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { PRICING_FEATURES, getPricingPlans } from '@/lib/pricing'
import '@/components/landing/landing.css'
import './pricing.css'

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 5L11 11M11 5L5 11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PricingPage() {
  const searchParams = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const [navScrolled, setNavScrolled] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const plans = getPricingPlans()

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing-root pricing-page">
      <MarketingNav active="pricing" scrolled={navScrolled} />

      <main className="pricing-main">
        <div className="pricing-hero-glow pricing-hero-glow-a" aria-hidden />
        <div className="pricing-hero-glow pricing-hero-glow-b" aria-hidden />

        {checkoutSuccess && (
          <p className="pricing-checkout-success" role="status">
            Payment received — thanks for subscribing. Sign in to link your plan to your account.
          </p>
        )}

        <section className="pricing-hero">
          <h1 className="pricing-hero-title">Start for free.</h1>
          <p className="pricing-hero-sub">
            Whether you&apos;re using Clarifi for meetings, interviews, sales calls, or just
            curious — it&apos;s free to start.
          </p>

          <div className="pricing-toggles">
            <div className="pricing-device-toggle" role="tablist" aria-label="Device">
              <button
                type="button"
                role="tab"
                aria-selected={device === 'desktop'}
                className={device === 'desktop' ? 'active' : ''}
                onClick={() => setDevice('desktop')}
              >
                Desktop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={device === 'mobile'}
                className={device === 'mobile' ? 'active' : ''}
                onClick={() => setDevice('mobile')}
              >
                Mobile
              </button>
            </div>
            <div className="pricing-billing-note">Billed monthly · cancel anytime</div>
          </div>
        </section>

        {device === 'mobile' ? (
          <section className="pricing-mobile-soon">
            <p>Clarifi for mobile is coming soon.</p>
            <Link href="/#join" className="landing-cta">
              Join the waitlist
            </Link>
          </section>
        ) : (
          <>
            <section className="pricing-cards">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`pricing-card${plan.id === 'pro_plus' ? ' pricing-card-featured' : ''}`}
                >
                  <div className="pricing-card-head">
                    <h2 className="pricing-card-name">
                      {plan.name}
                      {plan.badge ? <span className="pricing-card-badge">{plan.badge}</span> : null}
                    </h2>
                    <div className="pricing-card-price">
                      <span className="pricing-card-amount">{plan.price}</span>
                      {plan.period ? (
                        <span className="pricing-card-period">{plan.period}</span>
                      ) : null}
                    </div>
                  </div>

                  {plan.id === 'starter' ? (
                    <Link href={plan.href} className="pricing-card-cta-waitlist">
                      {plan.cta}
                    </Link>
                  ) : (
                    <a
                      href={plan.href}
                      className="pricing-card-cta"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {plan.cta}
                    </a>
                  )}

                  <p className="pricing-card-tagline">{plan.tagline}</p>

                  <ul className="pricing-card-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span className="pricing-feature-check" aria-hidden>
                          <CheckIcon />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            <section className="pricing-compare">
              <h2 className="pricing-compare-title">Features</h2>
              <div className="pricing-compare-grid">
                <div className="pricing-compare-header">
                  <span />
                  <span>Starter</span>
                  <span>Pro</span>
                  <span>Pro + Undetectability</span>
                </div>
                {PRICING_FEATURES.map((row) => (
                  <div key={row.label} className="pricing-compare-row">
                    <span className="pricing-compare-label">{row.label}</span>
                    {(['starter', 'pro', 'proPlus'] as const).map((col) => {
                      const value = row[col]
                      return (
                        <span key={col} className="pricing-compare-cell">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <span className="pricing-compare-yes">
                                <CheckIcon />
                              </span>
                            ) : (
                              <span className="pricing-compare-no">
                                <XIcon />
                              </span>
                            )
                          ) : (
                            value
                          )}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
