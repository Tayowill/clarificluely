import { contextBridge, ipcRenderer } from 'electron'

const ALLOWED_CHANNELS = [
  'ping',
  'check-keys',
  'audio:start',
  'audio:stop',
  'screen:capture',
  'llm:query',
  'auth:validate',
] as const

type AllowedChannel = (typeof ALLOWED_CHANNELS)[number]

function assertAllowedChannel(channel: string): asserts channel is AllowedChannel {
  if (!(ALLOWED_CHANNELS as readonly string[]).includes(channel)) {
    throw new Error(`Channel "${channel}" is not allowed`)
  }
}

const electronAPI = {
  send(channel: string, data: unknown): void {
    assertAllowedChannel(channel)
    ipcRenderer.send(channel, data)
  },

  on(channel: string, callback: (...args: unknown[]) => void): void {
    assertAllowedChannel(channel)
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },

  invoke(channel: string, data?: unknown): Promise<unknown> {
    assertAllowedChannel(channel)
    return ipcRenderer.invoke(channel, data)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: {
      send(channel: string, data: unknown): void
      on(channel: string, callback: (...args: unknown[]) => void): void
      invoke(channel: string, data?: unknown): Promise<unknown>
    }
  }
}

export {}
