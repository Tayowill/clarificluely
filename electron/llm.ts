import fetch from 'node-fetch'
import { isProxyConfigured, proxyChat, proxySuggest } from './proxyClient'
import {
  CLARIFI_AUDIO_SESSION_CHAT_PROMPT,
  CLARIFI_ENTERPRISE_SYSTEM_PROMPT,
  CLARIFI_SESSION_ANALYSIS_PROMPT,
  CLARIFI_SESSION_RECAP_PROMPT,
  CLARIFI_SPEAKER_INFERENCE_PROMPT,
  CLARIFI_SUGGESTIONS_SYSTEM_PROMPT,
} from './prompts'
import {
  collectDiarizedSpeakers,
  entriesToLines,
  type SpeakerLabels,
  type TranscriptEntry,
} from './transcriptUtils'
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
let lastAnalysisTranscript = ''
let isAnalyzing = false

export function resetSuggestionState(): void {
  lastTranscript = ''
  isProcessing = false
  lastAnalysisTranscript = ''
  isAnalyzing = false
}

export interface SessionEntity {
  name: string
  type: 'person' | 'company' | 'other'
}

export interface LiveSessionInsights {
  meetingIntro: string
  runningSummary: string
  topics: string[]
  entities: SessionEntity[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  keyMoments: string[]
  decisions: string[]
  openQuestions: string[]
}

export interface SessionRecap {
  summary: string
  /** @deprecated use discussionPoints — kept for older saved sessions */
  highlights: string[]
  discussionPoints: string[]
  actionItems: string[]
  decisions: string[]
  openQuestions: string[]
  recapEmailDraft: string
}

function parseJsonPayload<T>(text: string): T | null {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as T
  } catch {
    return null
  }
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

export async function analyzeLiveSession(
  transcriptLines: string[],
): Promise<LiveSessionInsights | null> {
  if (isAnalyzing) return null
  if (transcriptLines.length === 0) return null

  const transcript = transcriptLines.join('\n')
  if (transcript === lastAnalysisTranscript) return null
  lastAnalysisTranscript = transcript

  isAnalyzing = true

  try {
    const activeMode = getActiveMode()
    const outputLanguageHint = getOutputLanguageInstruction()
    const systemPrompt = `${CLARIFI_SESSION_ANALYSIS_PROMPT}\n\nActive mode:\n${activeMode.systemPrompt}${outputLanguageHint}`

    const text = await completeWithActiveModel(
      systemPrompt,
      `Live meeting transcript:\n${transcript}`,
      800,
    )
    if (!text) return null

    const parsed = parseJsonPayload<LiveSessionInsights>(text)
    if (!parsed) return null

    return {
      meetingIntro: parsed.meetingIntro ?? '',
      runningSummary: parsed.runningSummary ?? parsed.meetingIntro ?? '',
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      sentiment: parsed.sentiment ?? 'neutral',
      keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
    }
  } catch (err) {
    console.error('Session analysis error:', err)
    return null
  } finally {
    isAnalyzing = false
  }
}

export async function generateSessionRecap(
  transcriptLines: string[],
): Promise<SessionRecap | null> {
  if (transcriptLines.length === 0) return null

  const transcript = transcriptLines.join('\n')
  const outputLanguageHint = getOutputLanguageInstruction()
  const systemPrompt = `${CLARIFI_SESSION_RECAP_PROMPT}${outputLanguageHint}`

  try {
    const text = await completeWithActiveModel(
      systemPrompt,
      `Full meeting transcript:\n${transcript}`,
      1200,
    )
    if (!text) return null

    const parsed = parseJsonPayload<SessionRecap>(text)
    if (!parsed) return null

    const discussionPoints = Array.isArray(parsed.discussionPoints)
      ? parsed.discussionPoints
      : Array.isArray(parsed.highlights)
        ? parsed.highlights
        : []

    return {
      summary: parsed.summary ?? '',
      highlights: discussionPoints,
      discussionPoints,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
      recapEmailDraft: parsed.recapEmailDraft ?? '',
    }
  } catch (err) {
    console.error('Session recap error:', err)
    return null
  }
}

export async function inferSpeakerLabels(
  entries: TranscriptEntry[],
): Promise<SpeakerLabels> {
  const diarized = collectDiarizedSpeakers(entries)
  if (diarized.length === 0) return {}

  const transcript = entriesToLines(entries).join('\n')
  const outputLanguageHint = getOutputLanguageInstruction()
  const systemPrompt = `${CLARIFI_SPEAKER_INFERENCE_PROMPT}${outputLanguageHint}`

  try {
    const text = await completeWithActiveModel(
      systemPrompt,
      `Group call transcript:\n${transcript}`,
      400,
    )
    if (!text) return {}

    const parsed = parseJsonPayload<{ labels?: SpeakerLabels }>(text)
    const labels = parsed?.labels
    if (!labels || typeof labels !== 'object') return {}

    const result: SpeakerLabels = {}
    for (const speaker of diarized) {
      const value = labels[speaker]
      if (typeof value === 'string' && value.trim()) {
        result[speaker] = value.trim().slice(0, 48)
      }
    }
    return result
  } catch (err) {
    console.error('Speaker inference error:', err)
    return {}
  }
}

export async function chatWithStoredAudioSession(
  message: string,
  transcriptLines: string[],
  recap: SessionRecap | null,
  speakerLabels?: SpeakerLabels,
): Promise<ChatResult> {
  const transcript =
    transcriptLines.length > 0 ? transcriptLines.join('\n') : '(empty transcript)'

  const discussionPoints =
    recap?.discussionPoints?.length > 0 ? recap.discussionPoints : recap?.highlights ?? []

  const recapBlock = recap
    ? [
        `Summary: ${recap.summary}`,
        discussionPoints.length > 0
          ? `Discussion points: ${discussionPoints.join('; ')}`
          : '',
        recap.actionItems.length > 0 ? `Action items: ${recap.actionItems.join('; ')}` : '',
        (recap.decisions?.length ?? 0) > 0
          ? `Decisions: ${recap.decisions!.join('; ')}`
          : '',
        recap.openQuestions.length > 0 ? `Open questions: ${recap.openQuestions.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '(no recap generated)'

  const outputLanguageHint = getOutputLanguageInstruction()
  const systemPrompt = `${CLARIFI_AUDIO_SESSION_CHAT_PROMPT}${outputLanguageHint}`
  const userText = `Meeting recap:\n${recapBlock}\n\nFull transcript:\n${transcript}\n\nUser question:\n${message}`

  try {
    const reply = await completeWithActiveModel(systemPrompt, userText, 1024)
    if (!reply) {
      return { error: 'empty_reply' }
    }
    return { reply }
  } catch (err) {
    console.error('Audio session chat error:', err)
    return { error: 'chat_failed' }
  }
}
