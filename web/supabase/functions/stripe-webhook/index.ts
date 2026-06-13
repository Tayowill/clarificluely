import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function planFromPriceId(priceId: string | undefined | null): 'free' | 'pro' | 'pro_plus' {
  if (!priceId) return 'free'
  const proMonthly = Deno.env.get('STRIPE_PRICE_PRO')
  const proAnnual = Deno.env.get('STRIPE_PRICE_PRO_ANNUAL')
  const proPlusMonthly = Deno.env.get('STRIPE_PRICE_PRO_PLUS')
  const proPlusAnnual = Deno.env.get('STRIPE_PRICE_PRO_PLUS_ANNUAL')

  if (priceId === proMonthly || priceId === proAnnual) return 'pro'
  if (priceId === proPlusMonthly || priceId === proPlusAnnual) return 'pro_plus'
  return 'free'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  // SUPABASE_URL is injected automatically by Supabase — do not add it as a secret
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server not configured' }, 503)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' })
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const signature = req.headers.get('stripe-signature')
  if (!signature) return json({ error: 'Missing signature' }, 400)

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe signature error:', err)
    return json({ error: 'Invalid signature' }, 400)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId =
      session.metadata?.userId ||
      session.metadata?.clerkUserId ||
      session.client_reference_id
    const plan = session.metadata?.plan === 'pro_plus' ? 'pro_plus' : 'pro'

    if (userId) {
      await supabase.from('profiles').upsert({
        user_id: userId,
        plan,
        stripe_customer_id:
          typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id:
          typeof session.subscription === 'string' ? session.subscription : null,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.userId || subscription.metadata?.clerkUserId
    if (userId) {
      const active =
        subscription.status === 'active' || subscription.status === 'trialing'
      const priceId = subscription.items.data[0]?.price?.id
      const plan = active ? planFromPriceId(priceId) : 'free'

      await supabase.from('profiles').upsert({
        user_id: userId,
        plan,
        stripe_customer_id:
          typeof subscription.customer === 'string' ? subscription.customer : null,
        stripe_subscription_id: active ? subscription.id : null,
        updated_at: new Date().toISOString(),
      })
    }
  }

  return json({ received: true })
})
