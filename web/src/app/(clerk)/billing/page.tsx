'use client'

import Link from 'next/link'
import { useState } from 'react'

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['5 sessions/day', 'Mic transcription', 'Basic suggestions'],
    checkout: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$20',
    period: '/month',
    features: ['Unlimited sessions', 'AI suggestions', 'Meeting history', 'Playbook editor'],
    checkout: true,
  },
  {
    id: 'pro_plus' as const,
    name: 'Pro+',
    price: '$75',
    period: '/month',
    features: ['Everything in Pro', 'System audio capture', 'Priority support', 'Early features'],
    checkout: true,
  },
]

export default function BillingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(plan: 'pro' | 'pro_plus') {
    setLoadingPlan(plan)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Checkout unavailable — configure Stripe price IDs')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error — try again')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <Link href="/dashboard" className="text-xl font-bold">
          Clarifi
        </Link>
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Choose your plan</h1>
        <p className="text-white/50 mb-10">
          Clarifi runs through our secure API proxy — you subscribe here, not with your own keys.
        </p>

        {error && (
          <p className="text-sm text-red-400 mb-6 border border-red-400/30 rounded-lg p-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl border ${
                plan.id === 'pro' ? 'border-white bg-white/5' : 'border-white/10'
              }`}
            >
              <div className="text-2xl font-bold mb-1">{plan.price}</div>
              <div className="text-sm text-white/40 mb-6">{plan.period}</div>
              <div className="font-medium mb-4">{plan.name}</div>
              <ul className="space-y-2 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-white/60 flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.checkout ? (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id as 'pro' | 'pro_plus')}
                  disabled={loadingPlan === plan.id}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {loadingPlan === plan.id ? 'Redirecting…' : `Subscribe to ${plan.name}`}
                </button>
              ) : (
                <Link
                  href="/sign-up"
                  className="block text-center py-3 rounded-xl text-sm border border-white/20 hover:bg-white/5"
                >
                  Current plan
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
