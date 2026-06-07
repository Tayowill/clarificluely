import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { getGroqApiKey } from './keys'
import { isProxyConfigured, proxyTranscribe } from './proxyClient'

let isRecording = false
let transcriptCallback: ((text: string) => void) | null = null

export function startRecording(onTranscript: (text: string) => void): void {
  isRecording = true
  transcriptCallback = onTranscript
  console.log('Recording started - waiting for audio chunks from renderer')
}

export function stopRecording(): void {
  isRecording = false
  transcriptCallback = null
  console.log('Recording stopped')
}

export function getIsRecording(): boolean {
  return isRecording
}

function detectAudioFormat(buffer: Buffer): 'wav' | 'webm' {
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    return 'wav'
  }
  return 'webm'
}

export async function processAudioChunk(audioBase64: string): Promise<string | null> {
  if (!isRecording) return null

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const format = detectAudioFormat(audioBuffer)
    const extension = format === 'wav' ? 'wav' : 'webm'
    const contentType = format === 'wav' ? 'audio/wav' : 'audio/webm'
    const tmpFile = path.join(os.tmpdir(), `clarifi-${Date.now()}.${extension}`)
    fs.writeFileSync(tmpFile, audioBuffer)

    const formData = new FormData()
    formData.append('file', fs.createReadStream(tmpFile), {
      filename: `audio.${extension}`,
      contentType,
    })
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('language', 'en')

    if (await isProxyConfigured()) {
      const transcript = await proxyTranscribe(audioBase64, format)
      fs.unlinkSync(tmpFile)
      if (transcript) console.log('Transcript:', transcript)
      return transcript
    }

    const groqKey = await getGroqApiKey()
    if (!groqKey) {
      console.error('Groq API key is not configured')
      fs.unlinkSync(tmpFile)
      return null
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    })

    fs.unlinkSync(tmpFile)

    if (!response.ok) {
      const err = await response.text()
      console.error('Whisper error:', err)
      return null
    }

    const data = (await response.json()) as { text: string }
    const transcript = data.text?.trim()
    console.log('Transcript:', transcript)
    return transcript || null
  } catch (err) {
    console.error('Audio processing error:', err)
    return null
  }
}
