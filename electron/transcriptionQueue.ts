import { randomUUID } from 'crypto'
import { isDualCallMode, isGroupCallMode } from './audioPreferences'
import { transcribeSystemWithDiarization } from './diarizeTranscribe'
import { processAudioChunk, getIsPaused, wavHasSpeechEnergy, wavRms } from './audio'
import {
  buildTranscriptionPrompt,
  isDiarizedSpeakerLabel,
  isDuplicateAcrossStreams,
  isDuplicateOfRecent,
  isLikelyHallucination,
  isNearDuplicate,
  normalizeTranscriptText,
  type TranscriptEntry,
  type TranscriptSource,
} from './transcriptUtils'

type QueuedChunk = {
  base64: string
  source: TranscriptSource
  enqueuedAt: number
}

type TranscriptionQueueOptions = {
  onEntry: (entry: TranscriptEntry) => void
  onPruneEntries?: (entryIds: string[]) => void
  getEntries: () => TranscriptEntry[]
}

let queueMic: QueuedChunk[] = []
let queueSystem: QueuedChunk[] = []
let processingMic = false
let processingSystem = false
let draining = false
let options: TranscriptionQueueOptions | null = null

const SYSTEM_FIRST_WAIT_MS = 12_000
const MIC_BLEED_WINDOW_MS = 25_000
const SYSTEM_SPEECH_RMS_MIN = 0.01

type SystemSpeechWindow = {
  at: number
  rms: number
}

let recentSystemSpeech: SystemSpeechWindow[] = []

export function configureTranscriptionQueue(next: TranscriptionQueueOptions): void {
  options = next
}

export function clearTranscriptionQueue(): void {
  queueMic = []
  queueSystem = []
  processingMic = false
  processingSystem = false
  draining = false
  recentSystemSpeech = []
}

export function isTranscriptionDrainMode(): boolean {
  return draining
}

export function enqueueTranscription(base64: string, source: TranscriptSource): void {
  if (!base64 || !options || getIsPaused()) return
  if (source === 'mic' && isGroupCallMode()) return
  const chunk: QueuedChunk = { base64, source, enqueuedAt: Date.now() }
  if (source === 'mic') {
    queueMic.push(chunk)
    void drainSystemQueue().then(() => drainMicQueue())
  } else {
    queueSystem.push(chunk)
    void drainSystemQueue()
  }
}

export async function flushTranscriptionQueue(): Promise<void> {
  draining = true
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const busy =
      processingMic ||
      processingSystem ||
      queueMic.length > 0 ||
      queueSystem.length > 0
    if (!busy) break
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  draining = false
}

async function waitForSystemDrain(maxMs = SYSTEM_FIRST_WAIT_MS): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (!processingSystem && queueSystem.length === 0) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

function recordSystemSpeech(at: number, rms: number): void {
  if (rms < SYSTEM_SPEECH_RMS_MIN) return
  recentSystemSpeech.push({ at, rms })
  if (recentSystemSpeech.length > 24) {
    recentSystemSpeech = recentSystemSpeech.slice(-24)
  }
}

function systemSpeechOverlapsMic(at: number): boolean {
  return recentSystemSpeech.some(
    (window) => Math.abs(window.at - at) <= MIC_BLEED_WINDOW_MS,
  )
}

function shouldSkipMicBleed(
  transcript: string,
  chunk: QueuedChunk,
  entries: TranscriptEntry[],
): boolean {
  if (!isDualCallMode()) return false

  if (systemSpeechOverlapsMic(chunk.enqueuedAt)) {
    for (const entry of entries.slice(-24).reverse()) {
      if (entry.source !== 'system') continue
      if (Math.abs(entry.at - chunk.enqueuedAt) > MIC_BLEED_WINDOW_MS) continue
      if (isNearDuplicate(transcript, entry.text)) return true
    }
  }

  return isDuplicateAcrossStreams(transcript, entries, chunk.enqueuedAt, 'mic')
}

function pruneMicBleedFromSession(systemEntry: TranscriptEntry): void {
  if (!options?.onPruneEntries || systemEntry.source !== 'system') return

  const entries = options.getEntries()
  const toRemove = entries
    .filter((entry) => {
      if (entry.source !== 'mic') return false
      if (Math.abs(entry.at - systemEntry.at) > MIC_BLEED_WINDOW_MS) return false
      return isNearDuplicate(entry.text, systemEntry.text)
    })
    .map((entry) => entry.id)

  if (toRemove.length > 0) {
    options.onPruneEntries(toRemove)
  }
}

async function drainMicQueue(): Promise<void> {
  if (processingMic || !options) return
  processingMic = true
  try {
    while (queueMic.length > 0 && options) {
      await processMicChunk(queueMic.shift()!)
    }
  } finally {
    processingMic = false
    if (queueMic.length > 0) {
      void drainMicQueue()
    }
  }
}

async function drainSystemQueue(): Promise<void> {
  if (processingSystem || !options) return
  processingSystem = true
  try {
    while (queueSystem.length > 0 && options) {
      await processSystemChunk(queueSystem.shift()!)
    }
  } finally {
    processingSystem = false
    if (queueSystem.length > 0) {
      void drainSystemQueue()
    }
  }
}

function emitEntry(
  chunk: QueuedChunk,
  text: string,
  speaker: string,
  source: TranscriptSource,
): void {
  if (!options) return

  const entries = options.getEntries()
  const normalized = normalizeTranscriptText(text)
  if (!normalized || isLikelyHallucination(normalized, source)) return
  if (
    isDuplicateOfRecent(normalized, entries, 12_000, {
      speaker,
      source,
      at: chunk.enqueuedAt,
    })
  ) {
    return
  }
  const skipCrossStream =
    isGroupCallMode() && source === 'system' && isDiarizedSpeakerLabel(speaker)
  if (
    !skipCrossStream &&
    source !== 'mic' &&
    isDuplicateAcrossStreams(normalized, entries, chunk.enqueuedAt, source)
  ) {
    return
  }

  const entry: TranscriptEntry = {
    id: randomUUID(),
    text: normalized,
    source,
    speaker,
    at: chunk.enqueuedAt,
  }

  if (source === 'system' && isDualCallMode()) {
    pruneMicBleedFromSession(entry)
  }

  options.onEntry(entry)
}

async function processMicChunk(chunk: QueuedChunk): Promise<void> {
  if (!options || isGroupCallMode()) return

  if (isDualCallMode()) {
    await waitForSystemDrain()
  }

  const entries = options.getEntries()
  const prompt = buildTranscriptionPrompt(entries, 'mic')
  const transcript = await processAudioChunk(chunk.base64, {
    source: 'mic',
    prompt,
  })

  if (!transcript) return
  if (shouldSkipMicBleed(transcript, chunk, entries)) return

  emitEntry(chunk, transcript, 'Me', 'mic')
}

async function processSystemChunk(chunk: QueuedChunk): Promise<void> {
  if (!options || getIsPaused()) return

  const audioBuffer = Buffer.from(chunk.base64, 'base64')
  const rms = wavRms(audioBuffer)

  if (isGroupCallMode()) {
    if (!wavHasSpeechEnergy(audioBuffer)) return
    recordSystemSpeech(chunk.enqueuedAt, rms)

    const utterances = await transcribeSystemWithDiarization(chunk.base64)
    if (utterances && utterances.length > 0) {
      for (const utterance of utterances) {
        emitEntry(chunk, utterance.text, utterance.speaker, 'system')
      }
    }
    return
  }

  if (!wavHasSpeechEnergy(audioBuffer)) return
  recordSystemSpeech(chunk.enqueuedAt, rms)

  const entries = options.getEntries()
  const prompt = buildTranscriptionPrompt(entries, 'system')
  const transcript = await processAudioChunk(chunk.base64, {
    source: 'system',
    prompt,
  })

  if (!transcript) return

  emitEntry(chunk, transcript, 'Them', 'system')
}
