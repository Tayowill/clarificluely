export type BillingInterval = 'monthly' | 'annual'

export type PricingPlanId = 'pro' | 'pro_plus'

export type PricingPlan = {
  id: PricingPlanId
  name: string
  audience: string
  price: string
  period: string
  billedNote?: string
  savingsNote?: string
  badge?: string
  tagline: string
  cta: string
  href: string
  external?: boolean
  features: string[]
}

const PLAN_AMOUNTS: Record<PricingPlanId, { monthly: number; annualTotal: number }> = {
  pro: { monthly: 19, annualTotal: 180 },
  pro_plus: { monthly: 39, annualTotal: 348 },
}

export function annualSavings(planId: PricingPlanId) {
  const { monthly, annualTotal } = PLAN_AMOUNTS[planId]
  const monthlyYearTotal = monthly * 12
  const amountSaved = monthlyYearTotal - annualTotal
  const percentSaved = Math.round((amountSaved / monthlyYearTotal) * 100)
  const unit = planId === 'pro_plus' ? '/seat' : ''
  return {
    amountSaved,
    percentSaved,
    label: `Save $${amountSaved}${unit}/year (${percentSaved}%)`,
  }
}

export function maxAnnualSavingsPercent() {
  return Math.max(annualSavings('pro').percentSaved, annualSavings('pro_plus').percentSaved)
}

export const PRICING_FEATURES = [
  {
    label: 'AI messages per day',
    pro: 'Unlimited',
    proPlus: 'Unlimited',
  },
  {
    label: 'Meeting notetaking',
    pro: 'Unlimited',
    proPlus: 'Unlimited',
  },
  {
    label: 'Custom prompting',
    pro: 'Unlimited files and customization',
    proPlus: 'Unlimited files and customization',
  },
  {
    label: 'Custom keybinds',
    pro: true,
    proPlus: true,
  },
  {
    label: 'Undetectability to screen share',
    pro: false,
    proPlus: true,
  },
  {
    label: 'Built for',
    pro: 'Individuals',
    proPlus: 'Teams',
  },
] as const

const PAYMENT_LINK_ENV: Record<PricingPlanId, Record<BillingInterval, string>> = {
  pro: {
    monthly: 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO',
    annual: 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_ANNUAL',
  },
  pro_plus: {
    monthly: 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_PLUS',
    annual: 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_PLUS_ANNUAL',
  },
}

function planHref(
  planId: PricingPlanId,
  interval: BillingInterval,
): { href: string; external: boolean } {
  const planParam = planId === 'pro_plus' ? 'pro_plus' : 'pro'

  if (interval === 'annual') {
    return {
      href: `/billing?plan=${planParam}&interval=annual`,
      external: false,
    }
  }

  const key = PAYMENT_LINK_ENV[planId].monthly
  const fromEnv = process.env[key]?.trim()
  if (fromEnv) {
    return { href: fromEnv, external: true }
  }

  return {
    href: `/billing?plan=${planParam}&interval=monthly`,
    external: false,
  }
}

export function getPricingPlans(interval: BillingInterval = 'monthly'): PricingPlan[] {
  const isAnnual = interval === 'annual'

  return [
    {
      id: 'pro',
      name: 'Pro',
      audience: 'Individual',
      price: isAnnual ? '$15' : '$19',
      period: isAnnual ? '/ month' : '/ month',
      billedNote: isAnnual ? 'Billed $180 annually' : undefined,
      savingsNote: isAnnual ? annualSavings('pro').label : undefined,
      tagline: 'Unlimited access for solo operators.',
      cta: 'Start 7-day free trial',
      ...planHref('pro', interval),
      features: [
        '7-day free trial',
        'Unlimited AI responses',
        'Unlimited meeting notetaking',
        'Unlimited custom prompting',
        'Custom keybinds',
        'Priority support',
      ],
    },
    {
      id: 'pro_plus',
      name: 'Pro+',
      audience: 'Team',
      badge: 'Undetectable',
      price: isAnnual ? '$29' : '$39',
      period: '/ seat / month',
      billedNote: isAnnual ? 'Billed $348 per seat annually' : undefined,
      savingsNote: isAnnual ? annualSavings('pro_plus').label : undefined,
      tagline: 'Undetectable during screen share for teams.',
      cta: 'Start 7-day free trial',
      ...planHref('pro_plus', interval),
      features: [
        '7-day free trial',
        'Everything in Pro',
        'Undetectability to screen share',
        'Invisible on Zoom, Meet, and Teams',
        'Team-ready seats',
        'Priority support',
      ],
    },
  ]
}
