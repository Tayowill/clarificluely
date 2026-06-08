export type PricingPlanId = 'starter' | 'pro' | 'pro_plus'

export type PricingPlan = {
  id: PricingPlanId
  name: string
  price: string
  period: string
  badge?: string
  tagline: string
  cta: string
  href: string
  external?: boolean
  features: string[]
}

export const PRICING_FEATURES = [
  {
    label: 'AI messages per day',
    starter: 'Limited AI responses',
    pro: 'Unlimited',
    proPlus: 'Unlimited',
  },
  {
    label: 'Meeting notetaking',
    starter: 'Limited meeting notetaking',
    pro: 'Unlimited',
    proPlus: 'Unlimited',
  },
  {
    label: 'Custom prompting',
    starter: 'Up to 3 files',
    pro: 'Unlimited files and customization',
    proPlus: 'Unlimited files and customization',
  },
  {
    label: 'Custom keybinds',
    starter: true,
    pro: true,
    proPlus: true,
  },
  {
    label: 'Undetectability to screen share',
    starter: false,
    pro: false,
    proPlus: true,
  },
] as const

export function getPricingPlans(): PricingPlan[] {
  const proLink =
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO?.trim() ||
    'https://buy.stripe.com/8x28wPdJWgf8efY1x8dnW00'
  const proPlusLink =
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_PLUS?.trim() ||
    'https://buy.stripe.com/28E8wP9tG6Ey7RA2BcdnW01'

  return [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      period: '',
      tagline: 'All essential features.',
      cta: 'Join the waitlist',
      href: '/#join',
      external: false,
      features: [
        'Limited AI responses',
        'Limited meeting notetaking',
        'Up to 3 custom prompt files',
        'Custom keybinds',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$7.99',
      period: '/ month',
      tagline: 'Unlimited access.',
      cta: 'Subscribe',
      href: proLink,
      external: true,
      features: [
        'Everything in Starter, plus…',
        'Unlimited AI responses',
        'Unlimited meeting notetaking',
        'Unlimited custom prompting',
        'Priority support',
      ],
    },
    {
      id: 'pro_plus',
      name: 'Pro + Undetectability',
      price: '$15.99',
      period: '/ month',
      tagline: 'Undetectable during screen share.',
      cta: 'Subscribe',
      href: proPlusLink,
      external: true,
      features: [
        'Everything in Pro, plus…',
        'Undetectability to screen share',
        'Invisible on Zoom, Meet, and Teams',
        'Priority support',
      ],
    },
  ]
}
