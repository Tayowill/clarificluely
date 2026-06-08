import fetch from 'node-fetch'
import { isProxyConfigured, proxyChat, proxySuggest } from './proxyClient'
import {
  CLARIFI_ENTERPRISE_SYSTEM_PROMPT,
  CLARIFI_SUGGESTIONS_SYSTEM_PROMPT,
} from './prompts'
import { getOutputLanguageInstruction } from './audioPreferences'
import {
  getActiveMode,
  getActiveModel,
  getModelApiKey,
  type ModelConfig,
} from './userPreferences'

export interface Suggestion {
  text: string
  type: 'response' | 'question' | 'action'
}

let lastTranscript = ''
let isProcessing = false

export function resetSuggestionState(): void {
  lastTranscript = ''
  isProcessing = false
}

type LlmCallConfig = {
  modelId: string
  apiKey: string
  provider: ModelConfig['provider']
}

async function resolveLlmCallConfig(): Promise<LlmCallConfig | null> {
  const model = getActiveModel()
  const apiKey = await getModelApiKey(model)
  if (!apiKey) return null
  return { modelId: model.modelId, apiKey, provider: model.provider }
}

async function callAnthropicMessages(
  config: LlmCallConfig,
  systemPrompt: string,
  userContent: AnthropicContentBlock[] | string,
  maxTokens: number,
): Promise<string | null> {
  const content =
    typeof userContent === 'string' ? [{ type: 'text', text: userContent }] : userContent

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('LLM error:', err)
    return null
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> }
  return data.content?.[0]?.text?.trim() ?? null
}

type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

async function callOpenAiChat(
  config: LlmCallConfig,
  systemPrompt: string,
  userContent: AnthropicContentBlock[] | string,
  maxTokens: number,
): Promise<string | null> {
  let userMessage: string | OpenAiContentPart[]
  if (typeof userContent === 'string') {
    userMessage = userContent
  } else {
    const parts: OpenAiContentPart[] = []
    for (const block of userContent) {
      if (block.type === 'text') {
        parts.push({ type: 'text', text: block.text })
      } else if (block.type === 'image') {
        parts.push({
          type: 'image_url',
          image_url: {
            url: `data:${block.source.media_type};base64,${block.source.data}`,
          },
        })
      }
    }
    userMessage = parts
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('OpenAI LLM error:', err)
    return null
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() ?? null
}

type GeminiPart = {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

async function callGeminiChat(
  config: LlmCallConfig,
  systemPrompt: string,
  userContent: AnthropicContentBlock[] | string,
  maxTokens: number,
): Promise<string | null> {
  const parts: GeminiPart[] = []

  if (typeof userContent === 'string') {
    parts.push({ text: userContent })
  } else {
    for (const block of userContent) {
      if (block.type === 'text') {
        parts.push({ text: block.text })
      } else if (block.type === 'image') {
        parts.push({
          inlineData: {
            mimeType: block.source.media_type,
            data: block.source.data,
          },
        })
      }
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.modelId)}:generateContent?key=${encodeURIComponent(config.apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Gemini LLM error:', err)
    return null
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
}

async function completeWithActiveModel(
  systemPrompt: string,
  userContent: AnthropicContentBlock[] | string,
  maxTokens: number,
): Promise<string | null> {
  const config = await resolveLlmCallConfig()
  if (!config) return null

  if (config.provider === 'openai') {
    return callOpenAiChat(config, systemPrompt, userContent, maxTokens)
  }

  if (config.provider === 'gemini') {
    return callGeminiChat(config, systemPrompt, userContent, maxTokens)
  }

  return callAnthropicMessages(config, systemPrompt, userContent, maxTokens)
}

export interface ScreenContextImage {
  imageBase64: string
  mimeType: 'image/png'
}

export interface ChatRequest {
  message: string
  transcriptLines: string[]
  useScreenContext: boolean
  screenImage?: ScreenContextImage
}

export type ChatResult = { reply: string } | { error: string }

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image'
      source: { type: 'base64'; media_type: 'image/png'; data: string }
    }

export async function chatWithMeetingContext(
  request: ChatRequest,
): Promise<ChatResult> {
  const { message, transcriptLines, useScreenContext, screenImage } = request

  if (useScreenContext && !screenImage) {
    return { error: 'capture_failed' }
  }

  const activeModel = getActiveModel()
  if (await isProxyConfigured() && activeModel.provider === 'anthropic' && activeModel.builtin) {
    return proxyChat(request)
  }

  const llmConfig = await resolveLlmCallConfig()
  if (!llmConfig) {
    console.error('LLM API key is not configured for the active model')
    return { error: 'api_key_missing' }
  }

  const activeMode = getActiveMode()

  const transcript =
    transcriptLines.length > 0
      ? transcriptLines.join('\n')
      : '(no transcript yet)'

  const screenStyleHint = screenImage
    ? '\n\nReply concisely using screen context reply style. No backticks. No em-dashes. Max 6 visible details bullets. Max 6 tab names. One summary sentence with **bold** key names only. Total response under 1200 characters for simple screen questions.'
    : ''

  const userText = screenImage
    ? `Live meeting transcript:\n${transcript}\n\nUser typed question:\n${message}${screenStyleHint}`
    : `Live meeting transcript:\n${transcript}\n\nUser question:\n${message}`

  const outputLanguageHint = getOutputLanguageInstruction()
  const systemPrompt = screenImage
    ? `${activeMode.systemPrompt}\n\n${CLARIFI_ENTERPRISE_SYSTEM_PROMPT}${outputLanguageHint}`
    : `${activeMode.systemPrompt}${outputLanguageHint}`

  const userContent: AnthropicContentBlock[] = screenImage
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: screenImage.mimeType,
            data: screenImage.imageBase64,
          },
        },
        { type: 'text', text: userText },
      ]
    : [{ type: 'text', text: userText }]

  try {
    const reply = await completeWithActiveModel(systemPrompt, userContent, 2048)
    if (!reply) {
      return { error: 'empty_reply' }
    }

    return { reply }
  } catch (err) {
    console.error('Chat error:', err)
    return { error: 'chat_failed' }
  }
}

export async function generateSuggestions(
  transcriptLines: string[],
  playbook: string = '',
): Promise<Suggestion[]> {
  if (isProcessing) return []
  if (transcriptLines.length === 0) return []

  const transcript = transcriptLines.join('\n')
  if (transcript === lastTranscript) return []
  lastTranscript = transcript

  isProcessing = true

  try {
    const activeModel = getActiveModel()
    if (await isProxyConfigured() && activeModel.provider === 'anthropic' && activeModel.builtin) {
      return proxySuggest(transcriptLines, playbook)
    }

    const activeMode = getActiveMode()
    const outputLanguageHint = getOutputLanguageInstruction()
    const systemPrompt = `${CLARIFI_SUGGESTIONS_SYSTEM_PROMPT}\n\nActive mode:\n${activeMode.systemPrompt}${outputLanguageHint}${playbook ? `\n\nUser context/playbook:\n${playbook}` : ''}`

    const text = await completeWithActiveModel(
      systemPrompt,
      `Live transcript:\n${transcript}\n\nSuggest what I should say next.`,
      300,
    )
    if (!text) return []

    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean) as Suggestion[]
    return suggestions
  } catch (err) {
    console.error('Suggestion error:', err)
    return []
  } finally {
    isProcessing = false
  }
}
