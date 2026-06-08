import { getServerUser } from '@/lib/auth-server'
import { PLAN_LIMITS } from '@/lib/plans'
import { getUsageStats } from '@/lib/usage'

export async function GET() {
  const user = await getServerUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const stats = await getUsageStats(user.id)

  return Response.json({
    userId: user.id,
    email: user.email,
    plan: stats.plan,
    planLabel: PLAN_LIMITS[stats.plan].label,
    sessionsToday: stats.used,
    sessionsLimit: Number.isFinite(stats.limit) ? stats.limit : null,
    unlimited: !Number.isFinite(stats.limit),
  })
}
