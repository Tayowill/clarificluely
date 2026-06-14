import { getServerUser } from '@/lib/auth-server'
import type { BillingInterval } from '@/lib/pricing'
import { createStripeCheckoutSession } from '@/lib/stripe'

export async function POST(req: Request) {
  const user = await getServerUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { plan?: 'pro' | 'pro_plus'; interval?: BillingInterval }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const plan = body.plan === 'pro_plus' ? 'pro_plus' : 'pro'
  const interval = body.interval === 'annual' ? 'annual' : 'monthly'
  const origin = new URL(req.url).origin

  const { url, error } = await createStripeCheckoutSession({
    userId: user.id,
    email: user.email,
    plan,
    interval,
    origin,
  })

  if (error === 'stripe_not_configured') {
    return Response.json({ error: 'stripe_not_configured' }, { status: 503 })
  }
  if (error === 'price_not_configured') {
    return Response.json({ error: 'price_not_configured' }, { status: 503 })
  }

  return Response.json({ url })
}
