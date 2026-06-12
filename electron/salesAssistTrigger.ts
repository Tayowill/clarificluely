export type SalesAssistTriggerKind =
  | 'speak_now'
  | 'technical_lookup'
  | 'objection'
  | 'product_info'
  | 'discovery'
  | 'next_step'

export type SalesAssistTrigger = {
  /** Stable fingerprint — assist only refreshes when this changes. */
  key: string
  kind: SalesAssistTriggerKind
  /** Human-readable snippet passed to the LLM. */
  summary: string
}

type ParsedLine = {
  speaker: string
  text: string
}

const OBJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btoo expensive\b/i, label: 'too expensive' },
  { pattern: /\b(out of|over)\s+(our\s+)?budget\b/i, label: 'budget' },
  { pattern: /\bnot (in|within) (the\s+)?budget\b/i, label: 'budget' },
  { pattern: /\bcan(?:not|'t) afford\b/i, label: 'affordability' },
  { pattern: /\bnot (the\s+)?right (fit|time)\b/i, label: 'fit or timing' },
  { pattern: /\balready (have|using|use)\b/i, label: 'incumbent' },
  { pattern: /\bhappy with\b/i, label: 'status quo' },
  { pattern: /\bneed to think\b/i, label: 'stall' },
  { pattern: /\btalk to (my\s+)?(boss|manager|team|legal|procurement)\b/i, label: 'authority' },
  { pattern: /\bcompetitor\b/i, label: 'competitor' },
  { pattern: /\bnot interested\b/i, label: 'not interested' },
]

const QUESTION_STARTER_PATTERN =
  /\b(what|how|why|when|where|who|which|can you|could you|do you|does it|is there|are you|would you|will you|tell me|walk me through|help me understand)\b/gi

const QUESTION_STARTERS =
  /\b(what|how|why|when|where|who|which|can you|could you|do you|does it|is there|are you|would you|will you|tell me|walk me through|help me understand)\b/i

const BUYING_SIGNAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(send|share).{0,20}(proposal|contract|pricing|quote)\b/i, label: 'proposal request' },
  { pattern: /\bnext steps?\b/i, label: 'next steps' },
  { pattern: /\bwhen can we\b/i, label: 'timeline' },
  { pattern: /\bready to (move forward|proceed|start)\b/i, label: 'ready to proceed' },
  { pattern: /\bschedule (a\s+)?(demo|call|meeting|follow[- ]?up)\b/i, label: 'schedule follow-up' },
]

/** Words that look capitalized in transcript but are not define-worthy. */
const DEFINE_BLOCKLIST = new Set([
  'great',
  'once',
  'good',
  'nice',
  'cool',
  'sure',
  'ready',
  'thanks',
  'thank',
  'hello',
  'sorry',
  'yeah',
  'okay',
  'right',
  'well',
  'please',
  'just',
  'also',
  'then',
  'when',
  'what',
  'how',
  'why',
  'where',
  'who',
  'which',
  'the',
  'and',
  'but',
  'for',
  'with',
  'from',
  'that',
  'this',
  'they',
  'them',
  'your',
  'our',
  'have',
  'been',
  'were',
  'will',
  'would',
  'could',
  'should',
  'about',
  'into',
  'over',
  'after',
  'before',
  'designs',
  'design',
  'company',
  'business',
  'team',
  'call',
  'time',
  'today',
  'week',
  'follow',
  'introduce',
  'pitch',
  'questions',
  'question',
  'mid',
  'sized',
  'small',
  'large',
  'really',
  'take',
  'go',
  'for',
  'it',
])

const DEFINE_HYPHEN_BLOCKLIST = new Set([
  'follow-up',
  'mid-sized',
  'real-time',
  'end-to-end',
  'one-on-one',
  'check-in',
])

const MAX_DEFINE_TERMS = 3

function parseTailLine(line: string): ParsedLine | null {
  const match = line.match(/^([^:]+):\s*(.+)$/)
  if (!match) return null
  const text = match[2].trim()
  if (!text) return null
  return { speaker: match[1].trim(), text }
}

function normalizeTriggerKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTail(tailLines: string[]): ParsedLine[] {
  return tailLines
    .map(parseTailLine)
    .filter((line): line is ParsedLine => line !== null)
}

function trailingUtterance(parsed: ParsedLine[], preferThem = true): ParsedLine | null {
  if (parsed.length === 0) return null

  let idx = parsed.length - 1
  if (preferThem) {
    for (let i = parsed.length - 1; i >= 0; i -= 1) {
      if (parsed[i].speaker.toLowerCase() === 'them') {
        idx = i
        break
      }
    }
  }

  const speaker = parsed[idx].speaker
  const parts: string[] = []
  for (let i = idx; i >= 0; i -= 1) {
    if (parsed[i].speaker !== speaker) break
    parts.unshift(parsed[i].text)
  }

  const text = parts.join(' ').trim()
  if (!text) return null
  return { speaker, text }
}

function mergedUtteranceEndingAt(parsed: ParsedLine[], endIdx: number): string {
  const speaker = parsed[endIdx].speaker
  const parts: string[] = []
  for (let i = endIdx; i >= 0; i -= 1) {
    if (parsed[i].speaker !== speaker) break
    parts.unshift(parsed[i].text)
  }
  return parts.join(' ').trim()
}

function extractExplicitQuestion(text: string): string | null {
  const lastQuestionIdx = text.lastIndexOf('?')
  if (lastQuestionIdx < 0) return null

  const before = text.slice(0, lastQuestionIdx + 1)
  const sentenceStart = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf('!'),
    before.lastIndexOf('\n'),
  )
  const question = before.slice(sentenceStart + 1).trim()
  return question.length >= 8 ? question : null
}

function extractStreamingQuestion(text: string): string | null {
  if (text.includes('?')) return null

  const matches = [...text.matchAll(QUESTION_STARTER_PATTERN)]
  if (matches.length === 0) return null

  const last = matches[matches.length - 1]
  const start = last.index ?? 0
  const fragment = text.slice(start).trim()
  const wordCount = fragment.split(/\s+/).length
  if (wordCount < 5) return null

  return fragment.slice(0, 220)
}

function extractActiveQuestion(text: string): string | null {
  return extractExplicitQuestion(text) ?? extractStreamingQuestion(text)
}

function isDefineWorthyTerm(term: string): boolean {
  const key = term.toLowerCase().trim()
  if (!key || key.length < 2) return false
  if (DEFINE_BLOCKLIST.has(key)) return false
  if (DEFINE_HYPHEN_BLOCKLIST.has(key)) return false
  if (/^[a-z]+-[a-z]+$/.test(key)) return false

  // Acronyms / standards (SOC 2, API, GDPR)
  if (/\b[A-Z]{2,}[\dA-Z-]*\b/.test(term)) return true

  // Domain keywords
  if (
    /^(soc\s*2|gdpr|hipaa|api|crm|erp|saas|roi|kpi|ml|ai|sso|rbac|kubernetes|salesforce|hubspot|snowflake|databricks)$/i.test(
      key,
    )
  ) {
    return true
  }

  // Multi-word brands / products (Stelra Designs, OptiFlow Pro)
  const words = term.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const allTitle =
      words.every((w) => /^[A-Z][a-z]+/.test(w) || /^[A-Z]{2,}$/.test(w)) ||
      words.some((w) => /^(Pro|Plus|Max|Lite|Cloud|Flow|Hub|Stack|Ops|AI)$/i.test(w))
    if (allTitle) return true
  }

  // Product-style single token (OptiFlow, HubSpot) — mixed case or acronym length
  if (words.length === 1 && /^[A-Z][a-z]+[A-Z]/.test(term)) return true
  if (words.length === 1 && term.length >= 5 && /^[A-Z][a-z]{3,}$/.test(term)) {
    // Single proper noun only if not a common English word (blocklist handles most)
    return !DEFINE_BLOCKLIST.has(key)
  }

  return false
}

function extractTermsFromText(text: string): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()

  const add = (raw: string) => {
    const term = raw.trim()
    const key = term.toLowerCase()
    if (!term || seen.has(key) || !isDefineWorthyTerm(term)) return
    seen.add(key)
    candidates.push(term)
  }

  const acronyms = text.match(/\b[A-Z][A-Z0-9]{1,}(?:\s*[-–]?\s*\d+)?\b/g) ?? []
  for (const item of acronyms) add(item)

  const titledPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+)+\b/g) ?? []
  for (const item of titledPhrases) add(item)

  const productTokens = text.match(/\b[A-Z][a-z]*[A-Z][A-Za-z0-9]*(?:\s+Pro)?\b/g) ?? []
  for (const item of productTokens) add(item)

  const domainKeywords =
    text.match(
      /\b(?:SOC\s*2|GDPR|HIPAA|API|CRM|ERP|SaaS|ROI|KPI|ML|AI|SSO|RBAC|Kubernetes|Salesforce|HubSpot|Snowflake|Databricks)\b/gi,
    ) ?? []
  for (const item of domainKeywords) add(item)

  // Prefer longer phrases over substrings (drop "Stelra" if "Stelra Designs" present)
  return candidates
    .filter((term, _i, arr) => {
      const key = term.toLowerCase()
      return !arr.some(
        (other) =>
          other !== term &&
          other.toLowerCase().includes(key) &&
          other.split(/\s+/).length > term.split(/\s+/).length,
      )
    })
    .slice(-MAX_DEFINE_TERMS)
}

/** Scan recent transcript for technical / product terms only (newest last, max 3). */
export function extractAllJargonTerms(tailLines: string[]): string[] {
  const parsed = parseTail(tailLines.slice(-12))
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const line of parsed) {
    for (const term of extractTermsFromText(line.text)) {
      const key = term.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      ordered.push(term)
    }
  }

  return ordered.slice(-MAX_DEFINE_TERMS)
}

function detectObjection(text: string): SalesAssistTrigger | null {
  for (const { pattern, label } of OBJECTION_PATTERNS) {
    if (pattern.test(text)) {
      const snippet = normalizeTriggerKey(text.slice(0, 140))
      return {
        key: `objection:${label}:${snippet}`,
        kind: 'objection',
        summary: text.slice(0, 200),
      }
    }
  }
  return null
}

function questionTriggerFromText(text: string): SalesAssistTrigger | null {
  const active = extractActiveQuestion(text)
  if (!active) return null
  return {
    key: `question:${normalizeTriggerKey(active)}`,
    kind: 'product_info',
    summary: active,
  }
}

function detectImpliedQuestion(text: string, utteranceComplete: boolean): SalesAssistTrigger | null {
  if (text.includes('?')) return null
  if (!utteranceComplete) return null
  if (!QUESTION_STARTERS.test(text)) return null
  if (text.split(/\s+/).length < 7) return null

  const normalized = normalizeTriggerKey(text)
  return {
    key: `question:${normalized}`,
    kind: 'product_info',
    summary: text.slice(0, 200),
  }
}

function detectBuyingSignal(text: string): SalesAssistTrigger | null {
  for (const { pattern, label } of BUYING_SIGNAL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        key: `next_step:${label}:${normalizeTriggerKey(text.slice(0, 100))}`,
        kind: 'next_step',
        summary: text.slice(0, 200),
      }
    }
  }
  return null
}

function detectPainPoint(text: string, utteranceComplete: boolean): SalesAssistTrigger | null {
  if (!utteranceComplete) return null
  const painPatterns = [
    /\b(struggle|struggling|pain|problem|issue|challenge|frustrat|difficult|hard to)\b/i,
    /\bwe (can'?t|cannot|don'?t)\b/i,
  ]
  if (!painPatterns.some((p) => p.test(text))) return null
  if (text.split(/\s+/).length < 8) return null

  return {
    key: `discovery:${normalizeTriggerKey(text.slice(0, 120))}`,
    kind: 'discovery',
    summary: text.slice(0, 200),
  }
}

function focusUtterance(tailLines: string[]): {
  text: string
  utteranceComplete: boolean
  speaker: string
} | null {
  const parsed = parseTail(tailLines)
  if (parsed.length === 0) return null

  const lastParsed = parsed[parsed.length - 1]
  const prospect = trailingUtterance(parsed, true)
  const focus = prospect ?? lastParsed
  const utteranceComplete =
    parsed.length >= 2
      ? parsed[parsed.length - 1].speaker !== parsed[parsed.length - 2].speaker
      : focus.text.endsWith('.') || focus.text.endsWith('?') || focus.text.endsWith('!')

  return { text: focus.text, utteranceComplete, speaker: focus.speaker }
}

/**
 * When the prospect just finished speaking (speaker turn changed to Me), return
 * a keep-going trigger for what they said.
 */
function detectProspectUtteranceEnd(tailLines: string[]): SalesAssistTrigger | null {
  const parsed = parseTail(tailLines)
  if (parsed.length < 2) return null

  const last = parsed[parsed.length - 1]
  const prev = parsed[parsed.length - 2]
  if (last.speaker === prev.speaker) return null

  const endedSpeaker = prev.speaker
  const endedText = mergedUtteranceEndingAt(parsed, parsed.length - 2)
  if (endedText.split(/\s+/).length < 4) return null

  // Prefer keep-going when prospect (Them) just finished
  if (endedSpeaker.toLowerCase() !== 'them') return null

  // If they ended on a question, Answer lane handles it — skip duplicate suggest
  if (extractActiveQuestion(endedText)) return null

  const buying = detectBuyingSignal(endedText)
  if (buying) return buying

  const pain = detectPainPoint(endedText, true)
  if (pain) return pain

  return {
    key: `utterance_end:${normalizeTriggerKey(endedText.slice(0, 140))}`,
    kind: 'speak_now',
    summary: endedText.slice(0, 200),
  }
}

/** Answer lane: objection or prospect question (including streaming questions without "?"). */
export function detectAnswerTrigger(tailLines: string[]): SalesAssistTrigger | null {
  const focus = focusUtterance(tailLines)
  if (!focus) return null

  const objection = detectObjection(focus.text)
  if (objection) return objection

  const question = questionTriggerFromText(focus.text)
  if (question) return question

  return detectImpliedQuestion(focus.text, focus.utteranceComplete)
}

/** Suggestion lane: fires when prospect finishes speaking or buying/pain signals appear. */
export function detectSuggestionTrigger(tailLines: string[]): SalesAssistTrigger | null {
  const utteranceEnd = detectProspectUtteranceEnd(tailLines)
  if (utteranceEnd) return utteranceEnd

  const focus = focusUtterance(tailLines)
  if (!focus) return null

  const buyingSignal = detectBuyingSignal(focus.text)
  if (buyingSignal) return buyingSignal

  return detectPainPoint(focus.text, focus.utteranceComplete)
}

export function isCallOpeningWindow(
  transcriptLineCount: number,
  hasAnswer: boolean,
  sessionStartedAt: number | null,
): boolean {
  if (hasAnswer) return false
  if (transcriptLineCount >= 6) return false
  if (sessionStartedAt && Date.now() - sessionStartedAt > 90_000) return false
  return true
}

/** Fast-path debounce when tail likely contains a question. */
export function salesTailNeedsFastAnswer(tailLines: string[]): boolean {
  const tail = tailLines.slice(-8).join('\n').toLowerCase()
  if (tail.includes('?')) return true
  return QUESTION_STARTERS.test(tail)
}

/** True when the prospect just finished a speaking turn (triggers fast Keep going). */
export function prospectUtteranceJustCompleted(tailLines: string[]): boolean {
  const parsed = parseTail(tailLines)
  if (parsed.length < 2) return false
  const last = parsed[parsed.length - 1]
  const prev = parsed[parsed.length - 2]
  return last.speaker !== prev.speaker && prev.speaker.toLowerCase() === 'them'
}

/** @deprecated Use detectAnswerTrigger / detectSuggestionTrigger */
export function detectSalesAssistTrigger(tailLines: string[]): SalesAssistTrigger | null {
  return detectAnswerTrigger(tailLines) ?? detectSuggestionTrigger(tailLines)
}
