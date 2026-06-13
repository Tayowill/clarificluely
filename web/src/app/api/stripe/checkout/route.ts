import { getServerUser } from '@/lib/auth-server'
import type { BillingInterval } from '@/lib/pricing'
import { getStripe, priceIdForPlan } from '@/lib/stripe'

export async function POST(req: Request) {
  const user = await getServerUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return Response.json({ error: 'stripe_not_configured' }, { status: 503 })
  }

  let body: { plan?: 'pro' | 'pro_plus'; interval?: BillingInterval }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const plan = body.plan === 'pro_plus' ? 'pro_plus' : 'pro'
  const interval = body.interval === 'annual' ? 'annual' : 'monthly'
  const priceId = priceIdForPlan(plan, interval)
  if (!priceId) {
    return Response.json({ error: 'price_not_configured' }, { status: 503 })
  }

  const origin = new URL(req.url).origin

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      plan,
      interval,
    },
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    },
  })

  return Response.json({ url: checkout.url })
}
