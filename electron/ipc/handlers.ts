// ALL API calls must happen here in the main process only.
// NEVER send API keys to the renderer via IPC.
// Renderer sends prompts → main process calls API → main returns result.

import { BrowserWindow, ipcMain } from 'electron'
import { getKey, saveKey } from '../store'

const MAX_STRING_LENGTH = 50_000
const HTML_TAG_REGEX = /<[^>]*>/g

const LLM_RATE_LIMIT = { max: 10, windowMs: 60_000 }
const AUDIO_RATE_LIMIT = { max: 60, windowMs: 60_000 }

type RateLimitBucket = {
  count: number
  resetAt: number
}

class RateLimiter {
  private buckets = new Map<string, RateLimitBucket>()

  check(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (bucket.count >= max) {
      return false
    }

    bucket.count += 1
    return true
  }
}

const rateLimiter = new RateLimiter()

function sanitizeString(value: string): string {
  const stripped = value.replace(HTML_TAG_REGEX, '')
  if (stripped.length > MAX_STRING_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_STRING_LENGTH} characters`)
  }
  return stripped
}

function sanitizeInput(data: unknown): unknown {
  if (data === null || data === undefined) {
    throw new Error('Input is required')
  }

  if (typeof data === 'string') {
    return sanitizeString(data)
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item))
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeInput(value)
    }
    return result
  }

  return data
}

type IpcHandlerOptions = {
  requiresInput?: boolean
  rateLimitKey?: string
  rateLimit?: { max: number; windowMs: number }
}

function registerValidatedHandler(
  channel: string,
  options: IpcHandlerOptions,
  handler: (data: unknown) => Promise<unknown> | unknown,
): void {
  ipcMain.handle(channel, async (_event, data) => {
    if (options.rateLimitKey && options.rateLimit) {
      const allowed = rateLimiter.check(
        options.rateLimitKey,
        options.rateLimit.max,
        options.rateLimit.windowMs,
      )
      if (!allowed) {
        return { error: 'rate_limit_exceeded' }
      }
    }

    if (options.requiresInput && (data === null || data === undefined)) {
      throw new Error('Input is required')
    }

    const sanitized =
      data !== null && data !== undefined ? sanitizeInput(data) : data

    return handler(sanitized)
  })
}

async function queryOpenAI(prompt: string, apiKey: string): Promise<unknown> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    return { error: 'llm_request_failed', status: response.status }
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  return {
    content: body.choices?.[0]?.message?.content ?? '',
    provider: 'openai',
  }
}

async function queryAnthropic(prompt: string, apiKey: string): Promise<unknown> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    return { error: 'llm_request_failed', status: response.status }
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>
  }

  const textBlock = body.content?.find((block) => block.type === 'text')

  return {
    content: textBlock?.text ?? '',
    provider: 'anthropic',
  }
}

export function registerHandlers(mainWindow: BrowserWindow): void {
  void mainWindow

  ipcMain.handle('check-keys', () => {
    return {
      openai: process.env.OPENAI_API_KEY ? 'loaded' : 'missing',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'loaded' : 'missing',
    }
  })

  registerValidatedHandler('ping', {}, () => 'pong')

  registerValidatedHandler(
    'audio:start',
    {
      requiresInput: true,
      rateLimitKey: 'audio',
      rateLimit: AUDIO_RATE_LIMIT,
    },
    () => ({ status: 'audio_started' }),
  )

  registerValidatedHandler(
    'audio:stop',
    { requiresInput: true },
    () => ({ status: 'audio_stopped' }),
  )

  registerValidatedHandler(
    'screen:capture',
    { requiresInput: true },
    () => ({ status: 'screen_capture_requested' }),
  )

  registerValidatedHandler(
    'auth:validate',
    { requiresInput: true },
    async (data) => {
      const payload = data as { service?: string; key?: string }
      const service = payload.service

      if (!service || typeof service !== 'string') {
        throw new Error('service is required')
      }

      if (payload.key && typeof payload.key === 'string') {
        await saveKey(service, payload.key)
      }

      const storedKey = await getKey(service)
      return { valid: Boolean(storedKey) }
    },
  )

  registerValidatedHandler(
    'llm:query',
    {
      requiresInput: true,
      rateLimitKey: 'llm',
      rateLimit: LLM_RATE_LIMIT,
    },
    async (data) => {
      const payload = data as { provider?: string; prompt?: string }
      const provider = payload.provider
      const prompt = payload.prompt

      if (!provider || typeof provider !== 'string') {
        throw new Error('provider is required')
      }

      if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required')
      }

      const apiKey = await getKey(provider)
      if (!apiKey) {
        return { error: 'api_key_not_found' }
      }

      if (provider === 'openai') {
        return queryOpenAI(prompt, apiKey)
      }

      if (provider === 'anthropic') {
        return queryAnthropic(prompt, apiKey)
      }

      return { error: 'unsupported_provider' }
    },
  )
}
