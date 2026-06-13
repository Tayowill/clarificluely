'use client'

import { HeroSalesDemo } from '@/components/landing/HeroSalesDemo'
import './sales-call-demo.css'

export function SalesCallDemo() {
  return (
    <div className="scd-page">
      <div className="scd-intro">
        <p className="scd-eyebrow">Live demo</p>
        <h1>Clarifi on a real sales call</h1>
        <p className="scd-sub">
          Your footage in a Zoom-style layout — Clarifi recording and assisting from the top,
          invisible on screen share.
        </p>
      </div>

      <HeroSalesDemo />
    </div>
  )
}
