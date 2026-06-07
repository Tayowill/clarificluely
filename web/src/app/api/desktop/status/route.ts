import { getUserIdFromDeviceRequest } from '@/lib/device-auth'
import { PLAN_LIMITS } from '@/lib/plans'
import { getUsageStats } from '@/lib/usage'

export async function GET(req: Request) {
  const userId = await getUserIdFromDeviceRequest(req)
  if (!userId) {
    return Response.json({ paired: false }, { status: 401 })
  }

  const stats = await getUsageStats(userId)

  return Response.json({
    paired: true,
    plan: stats.plan,
    planLabel: PLAN_LIMITS[stats.plan].label,
    sessionsToday: stats.used,
    sessionsLimit: Number.isFinite(stats.limit) ? stats.limit : null,
  })
}
