declare module 'node-record-lpcm16' {
  import { Readable } from 'stream'

  interface RecordOptions {
    sampleRate?: number
    channels?: number
    audioType?: string
    recorder?: string
    device?: string
    silence?: string
    threshold?: number
    thresholdStart?: number | null
    thresholdEnd?: number | null
    keepSilence?: boolean
  }

  interface Recording {
    stream(): Readable
    stop(): void
    pause(): void
    resume(): void
  }

  function record(options?: RecordOptions): Recording

  export = { record }
}
