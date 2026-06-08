import {
  getUserIdFromRequest,
  planLimitResponse,
  unauthorizedResponse,
} from '@/lib/request-auth'
import { transcribeAudio } from '@/lib/groq-server'
import { enforceLlmRateLimit, getRateLimitMessage } from '@/lib/rate-limit'
import { getUserPlan } from '@/lib/usage'

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return unauthorizedResponse()

  const plan = await getUserPlan(userId)
  const rate = await enforceLlmRateLimit(userId, plan, 'llm_transcribe')
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
    audioBase64?: string
    format?: 'wav' | 'webm'
    language?: string
  }

  if (!payload.audioBase64 || typeof payload.audioBase64 !== 'string') {
    return Response.json({ error: 'audio_required' }, { status: 400 })
  }

  const format = payload.format === 'wav' ? 'wav' : 'webm'
  const language =
    typeof payload.language === 'string' && payload.language.trim()
      ? payload.language.trim()
      : 'en'
  const text = await transcribeAudio(payload.audioBase64, format, language)

  if (!text) {
    return Response.json({ error: 'transcribe_failed' }, { status: 500 })
  }

  return Response.json({ text })
}
