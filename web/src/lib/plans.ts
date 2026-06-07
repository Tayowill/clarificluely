export type Plan = 'free' | 'pro' | 'pro_plus'

export const PLAN_LIMITS: Record<Plan, { dailyRequests: number; label: string }> = {
  free: { dailyRequests: 5, label: 'Free' },
  pro: { dailyRequests: Number.POSITIVE_INFINITY, label: 'Pro' },
  pro_plus: { dailyRequests: Number.POSITIVE_INFINITY, label: 'Pro+' },
}

export function getDailyLimit(plan: Plan): number {
  return PLAN_LIMITS[plan].dailyRequests
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === 'pro' || plan === 'pro_plus'
}

export function normalizePlan(value: unknown): Plan {
  if (value === 'pro' || value === 'pro_plus') return value
  return 'free'
}
