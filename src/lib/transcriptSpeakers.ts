export type SpeakerLabels = Record<string, string>

export type TranscriptSpeakerEntry = {
  speaker: string
  source: 'mic' | 'system'
  text?: string
}

export function isDiarizedSpeakerLabel(speaker: string): boolean {
  return /^speaker\s+\d+$/i.test(speaker.trim())
}

export function speakerLabel(entry: TranscriptSpeakerEntry): string {
  const value = entry.speaker?.trim() ?? ''
  if (value) return value
  return entry.source === 'mic' ? 'Me' : 'Them'
}

export function resolveSpeakerDisplay(speaker: string, labels?: SpeakerLabels): string {
  const canonical = speaker.trim()
  const custom = labels?.[canonical]?.trim()
  if (custom) return custom
  return canonical
}

export function displaySpeakerForEntry(
  entry: TranscriptSpeakerEntry,
  labels?: SpeakerLabels,
): string {
  return resolveSpeakerDisplay(speakerLabel(entry), labels)
}

const SPEAKER_PALETTE = [
  'speaker-1',
  'speaker-2',
  'speaker-3',
  'speaker-4',
  'speaker-5',
  'speaker-6',
]

export function speakerInitial(name: string): string {
  if (name === 'Me') return 'M'
  if (name === 'Them') return 'T'
  if (isDiarizedSpeakerLabel(name)) {
    return name.match(/\d+/)?.[0] ?? 'S'
  }
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function speakerColorClass(name: string, rawSpeaker?: string): string {
  if (name === 'Me') return 'speaker-me'
  if (name === 'Them') return 'speaker-them'

  const key = rawSpeaker ?? name
  if (isDiarizedSpeakerLabel(key)) {
    const n = Number(key.match(/\d+/)?.[0] ?? 1)
    return SPEAKER_PALETTE[(n - 1) % SPEAKER_PALETTE.length]
  }

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % SPEAKER_PALETTE.length
  }
  return SPEAKER_PALETTE[hash]
}

export function entriesToDisplayLines(
  entries: Array<TranscriptSpeakerEntry & { text: string }>,
  labels?: SpeakerLabels,
): string[] {
  return entries.map((entry) => `${displaySpeakerForEntry(entry, labels)}: ${entry.text}`)
}

export function collectParticipants(
  entries: TranscriptSpeakerEntry[],
  labels?: SpeakerLabels,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of entries) {
    const display = displaySpeakerForEntry(entry, labels)
    if (!seen.has(display)) {
      seen.add(display)
      result.push(display)
    }
  }
  return result.length > 0 ? result : ['Me']
}

export function collectDiarizedSpeakers(entries: TranscriptSpeakerEntry[]): string[] {
  const speakers = new Set<string>()
  for (const entry of entries) {
    const key = speakerLabel(entry)
    if (isDiarizedSpeakerLabel(key)) speakers.add(key)
  }
  return [...speakers].sort((a, b) => {
    const na = Number(a.match(/\d+/)?.[0] ?? 0)
    const nb = Number(b.match(/\d+/)?.[0] ?? 0)
    return na - nb
  })
}
