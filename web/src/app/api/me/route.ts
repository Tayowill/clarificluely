import { auth } from '@clerk/nextjs/server'
import { PLAN_LIMITS } from '@/lib/plans'
import { getUsageStats } from '@/lib/usage'

export async function GET() {
  const session = await auth()
  if (!session.userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const stats = await getUsageStats(session.userId)

  return Response.json({
    userId: session.userId,
    plan: stats.plan,
    planLabel: PLAN_LIMITS[stats.plan].label,
    sessionsToday: stats.used,
    sessionsLimit: Number.isFinite(stats.limit) ? stats.limit : null,
    unlimited: !Number.isFinite(stats.limit),
  })
}
