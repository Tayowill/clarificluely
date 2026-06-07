import { contextBridge, ipcRenderer } from 'electron'

const INVOKE_CHANNELS = [
  'ping',
  'audio:start',
  'audio:stop',
  'audio:chunk',
  'screen:capture',
  'screen:context-enabled',
  'screen:context-status',
  'llm:query',
  'llm:suggest',
  'llm:chat',
  'auth:validate',
  'auth:open-connect',
  'auth:open-sign-in',
  'auth:connection-status',
  'overlay:set-interactive',
  'overlay:set-height',
  'overlay:set-bounds',
  'overlay:get-bounds',
  'overlay:toggle-follow',
  'overlay:follow-status',
  'overlay:toggle-protection',
  'overlay:protection-status',
  'overlay:update-suggestions',
  'audio:status',
  'chat:history-load',
  'chat:history-save-session',
  'chat:history-delete-session',
  'chat:history-clear',
  'onboarding:status',
  'onboarding:complete',
  'onboarding:get-sign-in-url',
  'onboarding:auth-pane-show',
  'onboarding:auth-pane-hide',
  'onboarding:auth-pane-sync',
  'onboarding:get-billing-url',
  'onboarding:open-billing',
  'onboarding:start-tutorial',
  'onboarding:stop-tutorial',
  'onboarding:tutorial-signal',
  'permissions:status',
  'permissions:request',
  'permissions:open-settings',
] as const

const EVENT_CHANNELS = [
  'suggestions:update',
  'transcript:update',
  'onboarding:tutorial-event',
  'onboarding:auth-connected',
  'onboarding:mock-nudge',
] as const

type InvokeChannel = (typeof INVOKE_CHANNELS)[number]
type EventChannel = (typeof EVENT_CHANNELS)[number]
type AllowedChannel = InvokeChannel | EventChannel

const ALL_CHANNELS: readonly string[] = [...INVOKE_CHANNELS, ...EVENT_CHANNELS]

function assertAllowedChannel(channel: string): asserts channel is AllowedChannel {
  if (!ALL_CHANNELS.includes(channel)) {
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
