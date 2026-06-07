import { auth, currentUser } from '@clerk/nextjs/server'
import { getStripe, priceIdForPlan } from '@/lib/stripe'

export async function POST(req: Request) {
  const session = await auth()
  if (!session.userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return Response.json({ error: 'stripe_not_configured' }, { status: 503 })
  }

  let body: { plan?: 'pro' | 'pro_plus' }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const plan = body.plan === 'pro_plus' ? 'pro_plus' : 'pro'
  const priceId = priceIdForPlan(plan)
  if (!priceId) {
    return Response.json({ error: 'price_not_configured' }, { status: 503 })
  }

  const user = await currentUser()
  const origin = new URL(req.url).origin

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    client_reference_id: session.userId,
    customer_email: user?.emailAddresses[0]?.emailAddress,
    metadata: {
      clerkUserId: session.userId,
      plan,
    },
    subscription_data: {
      metadata: {
        clerkUserId: session.userId,
        plan,
      },
    },
  })

  return Response.json({ url: checkout.url })
}
