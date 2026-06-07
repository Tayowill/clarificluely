import Stripe from 'stripe'
import { type Plan } from './plans'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (!stripeClient) {
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export function planFromPriceId(priceId: string | undefined | null): Plan {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_PRO_PLUS) return 'pro_plus'
  return 'free'
}

export function priceIdForPlan(plan: 'pro' | 'pro_plus'): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO?.trim() || null
  return process.env.STRIPE_PRICE_PRO_PLUS?.trim() || null
}
