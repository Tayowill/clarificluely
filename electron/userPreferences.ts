import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_MODES } from './modes/defaultModes'
import { deleteKey, getKey, saveKey } from './store'

export type ModelProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'custom'

export type ModelConfig = {
  id: string
  label: string
  provider: ModelProvider
  modelId: string
  builtin?: boolean
}

export type ModeConfig = {
  id: string
  label: string
  category?: string
  systemPrompt: string
  isActive: boolean
}

export type UserPreferences = {
  activeModelId: string
  models: ModelConfig[]
  activeModeId: string
  modes: ModeConfig[]
}

export type PublicModelConfig = Omit<ModelConfig, never>
export type PublicPreferences = {
  activeModelId: string
  models: PublicModelConfig[]
  activeModeId: string
  modes: ModeConfig[]
}

const PREFS_FILE = 'user-preferences.json'

const BUILTIN_MODELS: ModelConfig[] = [
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelId: 'claude-haiku-4-5-20251001',
    builtin: true,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    builtin: true,
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-5-20250929',
    builtin: true,
  },
  {
    id: 'claude-sonnet-4',
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    builtin: true,
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'anthropic',
    modelId: 'claude-opus-4-8',
    builtin: true,
  },
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    modelId: 'claude-opus-4-7',
    builtin: true,
  },
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    modelId: 'claude-opus-4-6',
    builtin: true,
  },
  {
    id: 'claude-opus-4-5',
    label: 'Claude Opus 4.5',
    provider: 'anthropic',
    modelId: 'claude-opus-4-5-20251101',
    builtin: true,
  },
  {
    id: 'claude-opus-4-1',
    label: 'Claude Opus 4.1',
    provider: 'anthropic',
    modelId: 'claude-opus-4-1-20250805',
    builtin: true,
  },
  {
    id: 'claude-opus-4',
    label: 'Claude Opus 4',
    provider: 'anthropic',
    modelId: 'claude-opus-4-20250514',
    builtin: true,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    builtin: true,
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    builtin: true,
  },
  {
    id: 'gpt-4-1',
    label: 'GPT-4.1',
    provider: 'openai',
    modelId: 'gpt-4.1',
    builtin: true,
  },
  {
    id: 'gpt-4-1-mini',
    label: 'GPT-4.1 Mini',
    provider: 'openai',
    modelId: 'gpt-4.1-mini',
    builtin: true,
  },
  {
    id: 'gpt-4-1-nano',
    label: 'GPT-4.1 Nano',
    provider: 'openai',
    modelId: 'gpt-4.1-nano',
    builtin: true,
  },
  {
    id: 'o3-mini',
    label: 'o3-mini',
    provider: 'openai',
    modelId: 'o3-mini',
    builtin: true,
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    provider: 'openai',
    modelId: 'o4-mini',
    builtin: true,
  },
  {
    id: 'gemini-2-5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
    modelId: 'gemini-2.5-flash',
    builtin: true,
  },
  {
    id: 'gemini-2-5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    modelId: 'gemini-2.5-pro',
    builtin: true,
  },
  {
    id: 'gemini-2-0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    builtin: true,
  },
  {
    id: 'gemini-2-0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    modelId: 'gemini-2.0-flash-lite',
    builtin: true,
  },
  {
    id: 'gemini-1-5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'gemini',
    modelId: 'gemini-1.5-flash',
    builtin: true,
  },
  {
    id: 'gemini-1-5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    modelId: 'gemini-1.5-pro',
    builtin: true,
  },
]

function prefsPath(): string {
  return path.join(app.getPath('userData'), PREFS_FILE)
}

function defaultPreferences(): UserPreferences {
  return {
    activeModelId: BUILTIN_MODELS[0].id,
    models: [...BUILTIN_MODELS],
    activeModeId: 'general',
    modes: DEFAULT_MODES.map((m) => ({ ...m })),
  }
}

let cached: UserPreferences | null = null

function mergeModes(stored: ModeConfig[]): ModeConfig[] {
  const byId = new Map(stored.map((m) => [m.id, m]))
  const merged = DEFAULT_MODES.map((defaults) => {
    const existing = byId.get(defaults.id)
    if (!existing) return { ...defaults }
    return {
      ...defaults,
      ...existing,
      label: existing.label || defaults.label,
      category: existing.category || defaults.category,
      systemPrompt: existing.systemPrompt || defaults.systemPrompt,
    }
  })
  for (const mode of stored) {
    if (!merged.some((m) => m.id === mode.id)) {
      merged.push(mode)
    }
  }
  return merged
}

function mergeModels(stored: ModelConfig[]): ModelConfig[] {
  const custom = stored.filter((m) => !m.builtin)
  const builtinIds = new Set(BUILTIN_MODELS.map((m) => m.id))
  const keptCustom = custom.filter((m) => !builtinIds.has(m.id))
  return [...BUILTIN_MODELS, ...keptCustom]
}

export function loadUserPreferences(): UserPreferences {
  if (cached) return cached
  try {
    const raw = fs.readFileSync(prefsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    const defaults = defaultPreferences()
    cached = {
      activeModelId:
        typeof parsed.activeModelId === 'string'
          ? parsed.activeModelId
          : defaults.activeModelId,
      models: Array.isArray(parsed.models)
        ? mergeModels(parsed.models)
        : defaults.models,
      activeModeId:
        typeof parsed.activeModeId === 'string'
          ? parsed.activeModeId
          : defaults.activeModeId,
      modes: Array.isArray(parsed.modes)
        ? mergeModes(parsed.modes)
        : defaults.modes,
    }
    syncActiveModeFlag(cached)
    return cached
  } catch {
    cached = defaultPreferences()
    return cached
  }
}

function syncActiveModeFlag(prefs: UserPreferences): void {
  for (const mode of prefs.modes) {
    mode.isActive = mode.id === prefs.activeModeId
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  syncActiveModeFlag(prefs)
  cached = prefs
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs, null, 2))
  } catch (err) {
    console.error('Failed to save user preferences:', err)
  }
  notifyPrefsChanged()
}

export function toPublicPreferences(prefs: UserPreferences): PublicPreferences {
  return {
    activeModelId: prefs.activeModelId,
    models: prefs.models.map(({ id, label, provider, modelId, builtin }) => ({
      id,
      label,
      provider,
      modelId,
      builtin,
    })),
    activeModeId: prefs.activeModeId,
    modes: prefs.modes.map((m) => ({ ...m })),
  }
}

export function getActiveModel(prefs = loadUserPreferences()): ModelConfig {
  return (
    prefs.models.find((m) => m.id === prefs.activeModelId) ??
    prefs.models[0] ??
    BUILTIN_MODELS[0]
  )
}

export function getActiveMode(prefs = loadUserPreferences()): ModeConfig {
  return (
    prefs.modes.find((m) => m.id === prefs.activeModeId) ??
    prefs.modes.find((m) => m.id === 'general') ??
    DEFAULT_MODES[0]
  )
}

export async function getModelApiKey(model: ModelConfig): Promise<string | null> {
  if (model.builtin) {
    const { getAnthropicApiKey, getGeminiApiKey, getGroqApiKey, getOpenAiApiKey } =
      await import('./keys')
    if (model.provider === 'anthropic') return getAnthropicApiKey()
    if (model.provider === 'openai') return getOpenAiApiKey()
    if (model.provider === 'gemini') return getGeminiApiKey()
    if (model.provider === 'groq') return getGroqApiKey()
    return getAnthropicApiKey()
  }
  if (model.provider === 'openai' || model.provider === 'gemini') {
    const custom = await getKey(`model:${model.id}`)
    if (custom) return custom
    const { getGeminiApiKey, getOpenAiApiKey } = await import('./keys')
    return model.provider === 'gemini' ? getGeminiApiKey() : getOpenAiApiKey()
  }
  return getKey(`model:${model.id}`)
}

export async function addCustomModel(input: {
  label: string
  provider: ModelProvider
  modelId: string
  apiKey: string
}): Promise<ModelConfig> {
  const prefs = loadUserPreferences()
  const id = `custom-${Date.now()}`
  const model: ModelConfig = {
    id,
    label: input.label.trim() || input.modelId,
    provider: input.provider,
    modelId: input.modelId.trim(),
  }
  await saveKey(`model:${id}`, input.apiKey.trim())
  prefs.models.push(model)
  saveUserPreferences(prefs)
  return model
}

export function setActiveModel(modelId: string): PublicPreferences {
  const prefs = loadUserPreferences()
  if (prefs.models.some((m) => m.id === modelId)) {
    prefs.activeModelId = modelId
    saveUserPreferences(prefs)
  }
  return toPublicPreferences(prefs)
}

export function setActiveMode(modeId: string): PublicPreferences {
  const prefs = loadUserPreferences()
  if (prefs.modes.some((m) => m.id === modeId)) {
    prefs.activeModeId = modeId
    saveUserPreferences(prefs)
  }
  return toPublicPreferences(prefs)
}

export function updateModePrompt(modeId: string, systemPrompt: string): PublicPreferences {
  const prefs = loadUserPreferences()
  const mode = prefs.modes.find((m) => m.id === modeId)
  if (mode) {
    mode.systemPrompt = systemPrompt
    saveUserPreferences(prefs)
  }
  return toPublicPreferences(prefs)
}

export function createMode(input: {
  label: string
  category?: string
  systemPrompt?: string
}): PublicPreferences {
  const prefs = loadUserPreferences()
  const id = `mode-${Date.now()}`
  prefs.modes.push({
    id,
    label: input.label.trim() || 'New Mode',
    category: input.category?.trim() || 'Custom',
    systemPrompt:
      input.systemPrompt?.trim() ||
      'You are Clarifi. Help the user in this context with brief, speakable suggestions.',
    isActive: false,
  })
  saveUserPreferences(prefs)
  return toPublicPreferences(prefs)
}

export async function removeCustomModel(modelId: string): Promise<PublicPreferences> {
  const prefs = loadUserPreferences()
  const model = prefs.models.find((m) => m.id === modelId)
  if (!model || model.builtin) return toPublicPreferences(prefs)
  prefs.models = prefs.models.filter((m) => m.id !== modelId)
  if (prefs.activeModelId === modelId) {
    prefs.activeModelId = BUILTIN_MODELS[0].id
  }
  await deleteKey(`model:${model.id}`)
  saveUserPreferences(prefs)
  return toPublicPreferences(prefs)
}

function notifyPrefsChanged(): void {
  const payload = toPublicPreferences(loadUserPreferences())
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('prefs:changed', payload)
    }
  }
}
