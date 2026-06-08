export async function transcribeAudio(
  audioBase64: string,
  format: 'wav' | 'webm' = 'webm',
  language = 'en',
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured')
    return null
  }

  const extension = format === 'wav' ? 'wav' : 'webm'
  const contentType = format === 'wav' ? 'audio/wav' : 'audio/webm'
  const buffer = Buffer.from(audioBase64, 'base64')

  const formData = new FormData()
  formData.append(
    'file',
    new Blob([buffer], { type: contentType }),
    `audio.${extension}`,
  )
  formData.append('model', 'whisper-large-v3-turbo')
  if (language && language !== 'auto') {
    formData.append('language', language)
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Whisper error:', err)
      return null
    }

    const data = (await response.json()) as { text?: string }
    return data.text?.trim() || null
  } catch (err) {
    console.error('Transcribe error:', err)
    return null
  }
}
