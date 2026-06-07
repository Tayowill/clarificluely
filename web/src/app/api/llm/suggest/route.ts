import {
  getUserIdFromRequest,
  planLimitResponse,
  unauthorizedResponse,
} from '@/lib/request-auth'
import { generateSuggestions } from '@/lib/llm-server'
import { enforceLlmRateLimit, getRateLimitMessage } from '@/lib/rate-limit'
import { getUserPlan } from '@/lib/usage'

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return unauthorizedResponse()

  const plan = await getUserPlan(userId)
  const rate = await enforceLlmRateLimit(userId, plan, 'llm_suggest')
  if (!rate.allowed) {
    return planLimitResponse(
      getRateLimitMessage(rate.window),
      rate.window,
      rate.retryAfterSeconds,
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const payload = body as {
    transcriptLines?: string[]
    playbook?: string
  }

  const transcriptLines = Array.isArray(payload.transcriptLines)
    ? payload.transcriptLines.filter((line): line is string => typeof line === 'string')
    : []

  const suggestions = await generateSuggestions(transcriptLines, payload.playbook ?? '')
  return Response.json({ suggestions })
}
