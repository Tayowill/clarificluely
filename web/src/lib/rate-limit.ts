import { isCreatorUser } from './creator'
import { getDailyLimit, type Plan } from './plans'
import { getSupabaseAdmin } from './supabase-admin'

export type LlmRoute = 'llm_chat' | 'llm_suggest' | 'llm_transcribe'

const HOURLY_LIMITS: Record<Plan, number> = {
  free: 10,
  pro: 120,
  pro_plus: 200,
}

export function getRateLimitMessage(window: 'hour' | 'day' | undefined): string {
  if (window === 'hour') {
    return 'Hourly usage limit reached. Wait a bit and try again.'
  }
  if (window === 'day') {
    return 'Daily session limit reached. Upgrade to Pro for unlimited access.'
  }
  return 'Too many requests. Please wait and try again.'
}

export async function enforceLlmRateLimit(
  userId: string,
  plan: Plan,
  route: LlmRoute,
): Promise<{ allowed: boolean; window?: 'hour' | 'day'; retryAfterSeconds?: number }> {
  if (isCreatorUser(userId)) return { allowed: true }

  const supabase = getSupabaseAdmin()
  const dailyLimit = getDailyLimit(plan)
  const hourlyLimit = HOURLY_LIMITS[plan]

  if (!supabase) {
    return { allowed: true }
  }

  const effectiveDaily = Number.isFinite(dailyLimit) ? dailyLimit : 100_000

  const { data, error } = await supabase.rpc('consume_clerk_api_quota', {
    p_user_id: userId,
    p_route: route,
    p_hourly_limit: hourlyLimit,
    p_daily_limit: effectiveDaily,
  })

  if (error) {
    console.error('consume_clerk_api_quota failed:', error.message)
    return { allowed: true }
  }

  const result = data as {
    allowed?: boolean
    window?: 'hour' | 'day'
    retry_after_seconds?: number
  } | null

  if (result?.allowed === false) {
    return {
      allowed: false,
      window: result.window,
      retryAfterSeconds: result.retry_after_seconds,
    }
  }

  return { allowed: true }
}
