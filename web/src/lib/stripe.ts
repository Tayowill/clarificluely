import Stripe from 'stripe'
import { type BillingInterval } from './pricing'
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
  const proMonthly = process.env.STRIPE_PRICE_PRO?.trim()
  const proAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL?.trim()
  const proPlusMonthly = process.env.STRIPE_PRICE_PRO_PLUS?.trim()
  const proPlusAnnual = process.env.STRIPE_PRICE_PRO_PLUS_ANNUAL?.trim()

  if (priceId === proMonthly || priceId === proAnnual) return 'pro'
  if (priceId === proPlusMonthly || priceId === proPlusAnnual) return 'pro_plus'
  return 'free'
}

export function priceIdForPlan(
  plan: 'pro' | 'pro_plus',
  interval: BillingInterval = 'monthly',
): string | null {
  if (plan === 'pro') {
    return interval === 'annual'
      ? process.env.STRIPE_PRICE_PRO_ANNUAL?.trim() || null
      : process.env.STRIPE_PRICE_PRO?.trim() || null
  }
  return interval === 'annual'
    ? process.env.STRIPE_PRICE_PRO_PLUS_ANNUAL?.trim() || null
    : process.env.STRIPE_PRICE_PRO_PLUS?.trim() || null
}
