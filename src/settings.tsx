import { useCallback, useEffect, useMemo, useState } from 'react'
import './settings.css'

type ModelProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'custom'

type ModelConfig = {
  id: string
  label: string
  provider: ModelProvider
  modelId: string
  builtin?: boolean
}

type ModeConfig = {
  id: string
  label: string
  category?: string
  systemPrompt: string
  isActive: boolean
}

type PublicPreferences = {
  activeModelId: string
  models: ModelConfig[]
  activeModeId: string
  modes: ModeConfig[]
}

type SettingsTab =
  | 'profile'
  | 'models'
  | 'modes'
  | 'integrations'
  | 'keybinds'
  | 'audio'

type ConnectedAccount = {
  provider: string
  label: string
  email?: string
}

type DeviceProfile = {
  paired: boolean
  userId?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  localAvatarUrl?: string
  connectedAccounts?: ConnectedAccount[]
  plan?: string
  planLabel?: string
  sessionsToday?: number
  sessionsLimit?: number | null
}

const AVATAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9', '#f59e0b']

function profileInitials(profile: DeviceProfile): string {
  const first = profile.firstName?.trim()?.[0] ?? ''
  const last = profile.lastName?.trim()?.[0] ?? ''
  if (first || last) return `${first}${last}`.toUpperCase()
  const full = profile.fullName?.trim() || profile.email?.split('@')[0] || 'U'
  return full.slice(0, 1).toUpperCase()
}

function avatarColorSeed(profile: DeviceProfile): string {
  return profile.email ?? profile.fullName ?? profile.userId ?? 'user'
}

function avatarPlaceholderColor(profile: DeviceProfile): string {
  const seed = avatarColorSeed(profile)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash]
}

function hasUploadedAvatar(profile: DeviceProfile): boolean {
  return Boolean(profile.localAvatarUrl?.startsWith('data:image/'))
}

async function resizeImageForAvatar(
  file: File,
  maxSize = 256,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mimeType = file.type.includes('png') ? 'image/png' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.88 : undefined)
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return { base64, mimeType }
}

function ProfileAvatar({
  profile,
  large = false,
  draftFirstName,
  draftLastName,
}: {
  profile: DeviceProfile
  large?: boolean
  draftFirstName?: string
  draftLastName?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const displayProfile: DeviceProfile =
    draftFirstName !== undefined || draftLastName !== undefined
      ? { ...profile, firstName: draftFirstName, lastName: draftLastName }
      : profile
  const showImage = hasUploadedAvatar(profile) && !imageFailed
  const sizeClass = large
    ? 'settings-profile-photo settings-profile-photo-lg'
    : 'settings-profile-photo'

  if (showImage && profile.localAvatarUrl) {
    return (
      <img
        src={profile.localAvatarUrl}
        alt=""
        className={sizeClass}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <span
      className={`${sizeClass} settings-profile-photo-fallback`}
      style={{ backgroundColor: avatarPlaceholderColor(displayProfile) }}
    >
      {profileInitials(displayProfile)}
    </span>
  )
}

type PermissionState = {
  microphone: boolean
  screen: boolean
  accessibility: boolean
}

const SETTINGS_TABS: SettingsTab[] = [
  'profile',
  'models',
  'modes',
  'integrations',
  'keybinds',
  'audio',
]

const NAV_ITEMS: { id: SettingsTab; label: string; profile?: boolean }[] = [
  { id: 'profile', label: 'Profile', profile: true },
  { id: 'models', label: 'Models' },
  { id: 'modes', label: 'Modes' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'keybinds', label: 'Keybinds' },
  { id: 'audio', label: 'Audio' },
]

const KEYBINDS = [
  { action: 'Show / hide overlay', keys: ['⌘', '⇧', 'Space'] },
  { action: 'Ask or submit', keys: ['⌘', '↵'] },
  { action: 'New chat', keys: ['⌘', 'R'] },
  { action: 'Move overlay up', keys: ['⌘', '↑'] },
  { action: 'Move overlay down', keys: ['⌘', '↓'] },
  { action: 'Move overlay left', keys: ['⌘', '←'] },
  { action: 'Move overlay right', keys: ['⌘', '→'] },
]

type AudioPreferences = {
  transcriptionLanguage: string
  outputLanguage: string
  preferredMicrophoneId: string
  preferredMicrophoneLabel: string
}

type MicDevice = {
  deviceId: string
  label: string
}

const TRANSCRIPTION_LANGUAGES = [
  { code: 'en', label: 'English (recommended)' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'auto', label: 'Auto-detect' },
]

const OUTPUT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
]

function normalizeSettingsTab(value: unknown): SettingsTab | null {
  if (value === 'general') return 'models'
  if (typeof value === 'string' && SETTINGS_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab
  }
  return null
}

function groupModesByCategory(modes: ModeConfig[]): Map<string, ModeConfig[]> {
  const map = new Map<string, ModeConfig[]>()
  for (const mode of modes) {
    const cat = mode.category || 'Other'
    const list = map.get(cat) ?? []
    list.push(mode)
    map.set(cat, list)
  }
  return map
}

const PROVIDER_ORDER: ModelProvider[] = ['anthropic', 'openai', 'gemini', 'groq', 'custom']

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  groq: 'Groq',
  custom: 'Custom',
}

function groupModelsByProvider(models: ModelConfig[]): Map<ModelProvider, ModelConfig[]> {
  const map = new Map<ModelProvider, ModelConfig[]>()
  for (const provider of PROVIDER_ORDER) {
    map.set(provider, [])
  }
  for (const model of models) {
    const list = map.get(model.provider) ?? []
    list.push(model)
    map.set(model.provider, list)
  }
  return map
}

function getAnthropicFamily(label: string): string {
  const lower = label.toLowerCase()
  if (lower.includes('haiku')) return 'Haiku'
  if (lower.includes('sonnet')) return 'Sonnet'
  if (lower.includes('opus')) return 'Opus'
  return 'Other'
}

function groupAnthropicByFamily(models: ModelConfig[]): Map<string, ModelConfig[]> {
  const order = ['Haiku', 'Sonnet', 'Opus', 'Other']
  const map = new Map<string, ModelConfig[]>()
  for (const family of order) {
    map.set(family, [])
  }
  for (const model of models) {
    const family = getAnthropicFamily(model.label)
    const list = map.get(family) ?? []
    list.push(model)
    map.set(family, list)
  }
  return map
}

export default function SettingsApp() {
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [prefs, setPrefs] = useState<PublicPreferences | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [profile, setProfile] = useState<DeviceProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [draftFirstName, setDraftFirstName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [permissions, setPermissions] = useState<PermissionState | null>(null)
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null)
  const [draftPrompt, setDraftPrompt] = useState('')
  const [showAddModel, setShowAddModel] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Set<ModelProvider>>(
    () => new Set(['anthropic', 'openai', 'gemini']),
  )
  const [newModel, setNewModel] = useState({
    label: '',
    provider: 'anthropic' as ModelProvider,
    modelId: '',
    apiKey: '',
  })
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences>({
    transcriptionLanguage: 'en',
    outputLanguage: 'en',
    preferredMicrophoneId: '',
    preferredMicrophoneLabel: '',
  })
  const [micDevices, setMicDevices] = useState<MicDevice[]>([])
  const [testMicStatus, setTestMicStatus] = useState<
    'idle' | 'testing' | 'success' | 'no-signal' | 'error'
  >('idle')

  const loadPrefs = useCallback(async () => {
    setPrefsLoading(true)
    try {
      const data = (await window.electronAPI.invoke('prefs:load')) as PublicPreferences
      setPrefs(data)
      if (!selectedModeId && data.modes.length > 0) {
        const active = data.modes.find((m) => m.id === data.activeModeId) ?? data.modes[0]
        setSelectedModeId(active.id)
        setDraftPrompt(active.systemPrompt)
      }
    } finally {
      setPrefsLoading(false)
    }
  }, [selectedModeId])

  const loadProfile = useCallback(async () => {
    const data = (await window.electronAPI.invoke('settings:profile')) as DeviceProfile
    setProfile(data)
    setDraftFirstName(data.firstName ?? '')
    setDraftLastName(data.lastName ?? '')
  }, [])

  const loadPermissions = useCallback(async () => {
    const data = (await window.electronAPI.invoke('permissions:status')) as PermissionState
    setPermissions(data)
  }, [])

  const loadAudioPrefs = useCallback(async () => {
    const data = (await window.electronAPI.invoke('audio:prefs-load')) as AudioPreferences
    setAudioPrefs(data)
  }, [])

  const refreshMicDevices = useCallback(async () => {
    try {
      if (!permissions?.microphone) {
        await window.electronAPI.invoke('permissions:request', { kind: 'microphone' })
        await loadPermissions()
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || 'Microphone',
        }))
      setMicDevices(inputs)
    } catch (err) {
      console.error('Failed to enumerate microphones:', err)
    }
  }, [permissions?.microphone, loadPermissions])

  useEffect(() => {
    void loadPrefs()
    void loadProfile()
    void loadPermissions()
    void loadAudioPrefs()

    const params = new URLSearchParams(window.location.search)
    const initialTab = normalizeSettingsTab(params.get('tab'))
    if (initialTab) {
      setTab(initialTab)
    }

    window.electronAPI.on('settings:tab', (nextTab) => {
      const tab = normalizeSettingsTab(nextTab)
      if (tab) {
        setTab(tab)
      }
    })
    window.electronAPI.on('audio:prefs-changed', (next) => {
      setAudioPrefs(next as AudioPreferences)
    })
    window.electronAPI.on('prefs:changed', (next) => {
      const data = next as PublicPreferences
      setPrefs(data)
      const mode = data.modes.find((m) => m.id === selectedModeId)
      if (mode) setDraftPrompt(mode.systemPrompt)
    })
  }, [loadPrefs, loadProfile, loadPermissions, loadAudioPrefs, selectedModeId])

  useEffect(() => {
    if (tab === 'audio') {
      void refreshMicDevices()
    }
  }, [tab, refreshMicDevices])

  const selectedMode = useMemo(
    () => prefs?.modes.find((m) => m.id === selectedModeId) ?? null,
    [prefs, selectedModeId],
  )

  const modeGroups = useMemo(
    () => (prefs ? groupModesByCategory(prefs.modes) : new Map()),
    [prefs],
  )

  const modelGroups = useMemo(
    () => (prefs ? groupModelsByProvider(prefs.models) : new Map()),
    [prefs],
  )

  useEffect(() => {
    if (!prefs) return
    const active = prefs.models.find((m) => m.id === prefs.activeModelId)
    if (active) {
      setExpandedProviders((prev) => new Set([...prev, active.provider]))
    }
  }, [prefs?.activeModelId, prefs?.models])

  const toggleProvider = (provider: ModelProvider) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(provider)) {
        next.delete(provider)
      } else {
        next.add(provider)
      }
      return next
    })
  }

  const selectMode = (mode: ModeConfig) => {
    setSelectedModeId(mode.id)
    setDraftPrompt(mode.systemPrompt)
  }

  const activateMode = async (modeId: string) => {
    const data = (await window.electronAPI.invoke('prefs:set-active-mode', { modeId })) as PublicPreferences
    setPrefs(data)
    selectMode(data.modes.find((m) => m.id === modeId) ?? data.modes[0])
  }

  const savePrompt = async () => {
    if (!selectedModeId) return
    const data = (await window.electronAPI.invoke('prefs:update-mode-prompt', {
      modeId: selectedModeId,
      systemPrompt: draftPrompt,
    })) as PublicPreferences
    setPrefs(data)
  }

  const setActiveModel = async (modelId: string) => {
    const data = (await window.electronAPI.invoke('prefs:set-active-model', { modelId })) as PublicPreferences
    setPrefs(data)
  }

  const addModel = async () => {
    if (!newModel.modelId.trim() || !newModel.apiKey.trim()) return
    const data = (await window.electronAPI.invoke('prefs:add-model', {
      label: newModel.label.trim() || newModel.modelId.trim(),
      provider: newModel.provider,
      modelId: newModel.modelId.trim(),
      apiKey: newModel.apiKey.trim(),
    })) as PublicPreferences
    setPrefs(data)
    setShowAddModel(false)
    setNewModel({ label: '', provider: 'anthropic', modelId: '', apiKey: '' })
  }

  const removeModel = async (modelId: string) => {
    const data = (await window.electronAPI.invoke('prefs:remove-model', { modelId })) as PublicPreferences
    setPrefs(data)
  }

  const openConnect = () => void window.electronAPI.invoke('auth:open-connect')
  const openBilling = () => void window.electronAPI.invoke('onboarding:open-billing')
  const openDashboard = () => void window.electronAPI.invoke('settings:open-dashboard')

  const startEditProfile = () => {
    if (!profile) return
    setDraftFirstName(profile.firstName ?? '')
    setDraftLastName(profile.lastName ?? '')
    setEditingProfile(true)
  }

  const cancelEditProfile = () => {
    if (profile) {
      setDraftFirstName(profile.firstName ?? '')
      setDraftLastName(profile.lastName ?? '')
    }
    setEditingProfile(false)
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      const data = (await window.electronAPI.invoke('settings:profile-update', {
        firstName: draftFirstName.trim(),
        lastName: draftLastName.trim(),
      })) as DeviceProfile
      setProfile(data)
      setEditingProfile(false)
    } finally {
      setProfileSaving(false)
    }
  }

  const uploadAvatar = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp,image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 10 * 1024 * 1024) return
      void (async () => {
        try {
          const { base64, mimeType } = await resizeImageForAvatar(file)
          const data = (await window.electronAPI.invoke('settings:profile-avatar-upload', {
            base64,
            mimeType,
          })) as DeviceProfile
          setProfile(data)
        } catch (err) {
          console.error('Avatar upload failed:', err)
        }
      })()
    }
    input.click()
  }

  const removeAvatar = () => {
    void window.electronAPI
      .invoke('settings:profile-avatar-remove')
      .then((data) => setProfile(data as DeviceProfile))
  }
  const openMicSettings = () =>
    void window.electronAPI.invoke('permissions:open-settings', { kind: 'microphone' })

  const saveAudioPrefs = async (patch: Partial<AudioPreferences>) => {
    const next = { ...audioPrefs, ...patch }
    setAudioPrefs(next)
    const saved = (await window.electronAPI.invoke('audio:prefs-save', next)) as AudioPreferences
    setAudioPrefs(saved)
  }

  const handleTranscriptionLanguage = (code: string) => {
    void saveAudioPrefs({ transcriptionLanguage: code })
  }

  const handleOutputLanguage = (code: string) => {
    void saveAudioPrefs({ outputLanguage: code })
  }

  const handleMicChange = (deviceId: string) => {
    const device = micDevices.find((d) => d.deviceId === deviceId)
    void saveAudioPrefs({
      preferredMicrophoneId: deviceId,
      preferredMicrophoneLabel: device?.label ?? '',
    })
  }

  const testMicrophone = async () => {
    setTestMicStatus('testing')
    try {
      const deviceId = audioPrefs.preferredMicrophoneId?.trim()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      let maxLevel = 0
      const start = Date.now()
      while (Date.now() - start < 2000) {
        analyser.getByteFrequencyData(data)
        const level = data.reduce((sum, value) => sum + value, 0) / data.length
        maxLevel = Math.max(maxLevel, level)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      stream.getTracks().forEach((track) => track.stop())
      await ctx.close()
      setTestMicStatus(maxLevel > 5 ? 'success' : 'no-signal')
    } catch {
      setTestMicStatus('error')
    }
  }

  const resetOnboarding = () => {
    void window.electronAPI.invoke('app:reset-onboarding')
  }

  const logoutAccount = () => {
    void window.electronAPI.invoke('app:logout')
    void loadProfile()
  }

  const quitApp = () => {
    void window.electronAPI.invoke('app:quit')
  }

  const eraseAccountData = () => {
    const confirmed = window.confirm(
      'Erase all local account data? This removes device pairing, chat history, preferences, and your local avatar. You will need to sign in again.',
    )
    if (confirmed) {
      void window.electronAPI.invoke('app:erase-account-data')
    }
  }

  const selectedMicLabel =
    audioPrefs.preferredMicrophoneLabel ||
    micDevices.find((d) => d.deviceId === audioPrefs.preferredMicrophoneId)?.label ||
    micDevices[0]?.label ||
    'Default microphone'

  const renderPrefsLoading = () => <p className="settings-empty">Loading…</p>

  return (
    <div className="settings-root">
      <div className="settings-drag-region" aria-hidden />
      <aside className="settings-sidebar">
        <div className="settings-brand">
          <span className="settings-brand-dot" />
          Clarifi
        </div>

        <nav className="settings-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-nav-btn ${tab === item.id ? 'active' : ''} ${item.profile ? 'settings-nav-profile' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.profile && (
                <span className="settings-profile-avatar" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </span>
              )}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="settings-shell">
      <main className="settings-main">
        {tab === 'profile' && (
          <>
            <h1 className="settings-section-title">Profile details</h1>

            {!profile ? (
              <p className="settings-empty">Loading profile…</p>
            ) : !profile.paired ? (
              <div className="settings-card">
                <div className="settings-card-title">Not connected</div>
                <p className="settings-card-desc">
                  Sign in on the website and open Clarifi to link this desktop app to your account.
                </p>
                <button type="button" className="settings-btn primary" onClick={openConnect}>
                  Connect account
                </button>
              </div>
            ) : (
              <div className="settings-profile-details">
                <div className="settings-profile-section">
                  <div className="settings-profile-section-label">Profile</div>

                  {!editingProfile ? (
                    <div className="settings-profile-summary-row">
                      <div className="settings-profile-summary-left">
                        <ProfileAvatar profile={profile} />
                        <span className="settings-profile-display-name">
                          {profile.fullName ||
                            `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() ||
                            profile.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="settings-link-btn"
                        onClick={startEditProfile}
                      >
                        Update profile
                      </button>
                    </div>
                  ) : (
                    <div className="settings-profile-edit">
                      <div className="settings-profile-upload-row">
                        <ProfileAvatar
                          profile={profile}
                          large
                          draftFirstName={draftFirstName}
                          draftLastName={draftLastName}
                        />
                        <div className="settings-profile-upload-actions">
                          <button type="button" className="settings-btn" onClick={uploadAvatar}>
                            Upload
                          </button>
                          <button
                            type="button"
                            className="settings-link-btn settings-link-btn-danger"
                            onClick={removeAvatar}
                          >
                            Remove
                          </button>
                          <p className="settings-profile-upload-hint">
                            Recommended size 1:1, up to 10MB.
                          </p>
                        </div>
                      </div>

                      <div className="settings-form-grid">
                        <div className="settings-field">
                          <label>First name</label>
                          <input
                            className="settings-input"
                            value={draftFirstName}
                            onChange={(e) => setDraftFirstName(e.target.value)}
                          />
                        </div>
                        <div className="settings-field">
                          <label>Last name</label>
                          <input
                            className="settings-input"
                            value={draftLastName}
                            onChange={(e) => setDraftLastName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="settings-form-actions settings-form-actions-end">
                        <button
                          type="button"
                          className="settings-link-btn"
                          onClick={cancelEditProfile}
                          disabled={profileSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="settings-btn primary"
                          onClick={() => void saveProfile()}
                          disabled={profileSaving}
                        >
                          {profileSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="settings-profile-divider" />

                <div className="settings-profile-section">
                  <div className="settings-profile-section-label">Email addresses</div>
                  {profile.email && (
                    <div className="settings-profile-list-row">
                      <div className="settings-profile-list-main">
                        <span>{profile.email}</span>
                        <span className="settings-pill">Primary</span>
                      </div>
                    </div>
                  )}
                  <button type="button" className="settings-link-btn" onClick={openDashboard}>
                    + Add email address
                  </button>
                </div>

                <div className="settings-profile-divider" />

                <div className="settings-profile-section">
                  <div className="settings-profile-section-label">Connected accounts</div>
                  {(profile.connectedAccounts ?? []).map((account) => (
                    <div key={account.provider} className="settings-profile-list-row">
                      <div className="settings-profile-list-main">
                        {account.provider === 'google' && (
                          <span className="settings-provider-icon" aria-hidden>
                            G
                          </span>
                        )}
                        <span>
                          {account.label}
                          {account.email ? ` · ${account.email}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="settings-link-btn" onClick={openConnect}>
                    + Connect account
                  </button>
                </div>

                <div className="settings-profile-divider" />

                <div className="settings-profile-section settings-profile-plan-row">
                  <div>
                    <div className="settings-profile-section-label">Plan</div>
                    <div className="settings-profile-plan-value">
                      {profile.planLabel ?? profile.plan ?? '—'}
                      {typeof profile.sessionsToday === 'number' && (
                        <span className="settings-profile-plan-meta">
                          {' '}
                          · {profile.sessionsToday}
                          {typeof profile.sessionsLimit === 'number'
                            ? ` / ${profile.sessionsLimit}`
                            : profile.sessionsLimit === null
                              ? ' / Unlimited'
                              : ''}{' '}
                          sessions today
                        </span>
                      )}
                    </div>
                  </div>
                  <button type="button" className="settings-btn small" onClick={openBilling}>
                    Manage plan
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'models' && (
          <>
            <h1 className="settings-section-title">Models</h1>
            <p className="settings-section-desc">
              Choose which AI model powers chat and live suggestions. Built-in models use your
              connected Clarifi account keys.
            </p>

            {prefsLoading || !prefs ? (
              renderPrefsLoading()
            ) : (
              <>
                <div className="settings-provider-list">
                  {PROVIDER_ORDER.map((provider) => {
                    const models = modelGroups.get(provider) ?? []
                    if (models.length === 0) return null

                    const isExpanded = expandedProviders.has(provider)
                    const activeInProvider = models.some(
                      (m: ModelConfig) => m.id === prefs.activeModelId,
                    )
                    const anthropicFamilies =
                      provider === 'anthropic' ? groupAnthropicByFamily(models) : null

                    const renderModelRow = (model: ModelConfig) => (
                      <div key={model.id} className="settings-model-row">
                        <div className="settings-model-info">
                          <span className="settings-model-name">{model.label}</span>
                          <span className="settings-model-id">
                            {model.modelId}
                            {model.builtin ? ' · Built-in' : ''}
                          </span>
                        </div>
                        <div className="settings-model-actions">
                          {prefs.activeModelId === model.id ? (
                            <span className="settings-btn small active-pill">Active</span>
                          ) : (
                            <button
                              type="button"
                              className="settings-btn small primary"
                              onClick={() => void setActiveModel(model.id)}
                            >
                              Use
                            </button>
                          )}
                          {!model.builtin && (
                            <button
                              type="button"
                              className="settings-btn small danger"
                              onClick={() => void removeModel(model.id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )

                    return (
                      <div
                        key={provider}
                        className={`settings-provider-folder ${isExpanded ? 'expanded' : ''}`}
                      >
                        <button
                          type="button"
                          className="settings-provider-header"
                          onClick={() => toggleProvider(provider)}
                          aria-expanded={isExpanded}
                        >
                          <span className="settings-provider-chevron">{isExpanded ? '▼' : '▶'}</span>
                          <span className="settings-provider-name">{PROVIDER_LABELS[provider]}</span>
                          <span className="settings-provider-count">{models.length} models</span>
                          {activeInProvider && (
                            <span className="settings-provider-active-dot" title="Active model" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="settings-provider-body">
                            {anthropicFamilies ? (
                              Array.from(anthropicFamilies.entries()).map(([family, familyModels]) => {
                                if (familyModels.length === 0) return null
                                return (
                                  <div key={family} className="settings-model-family">
                                    <div className="settings-model-family-label">{family}</div>
                                    {familyModels.map(renderModelRow)}
                                  </div>
                                )
                              })
                            ) : (
                              models.map(renderModelRow)
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {!showAddModel ? (
                  <button
                    type="button"
                    className="settings-btn"
                    style={{ marginTop: 12 }}
                    onClick={() => setShowAddModel(true)}
                  >
                    Add a model
                  </button>
                ) : (
                  <div className="settings-add-form settings-card">
                    <h3>Add custom model</h3>
                    <div className="settings-form-grid">
                      <div className="settings-field">
                        <label>Display name</label>
                        <input
                          className="settings-input"
                          value={newModel.label}
                          onChange={(e) => setNewModel((p) => ({ ...p, label: e.target.value }))}
                          placeholder="My GPT-4"
                        />
                      </div>
                      <div className="settings-field">
                        <label>Provider</label>
                        <select
                          className="settings-input"
                          value={newModel.provider}
                          onChange={(e) =>
                            setNewModel((p) => ({
                              ...p,
                              provider: e.target.value as ModelProvider,
                            }))
                          }
                        >
                          <option value="anthropic">Anthropic</option>
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Google Gemini</option>
                        </select>
                      </div>
                      <div className="settings-field">
                        <label>Model ID</label>
                        <input
                          className="settings-input"
                          value={newModel.modelId}
                          onChange={(e) => setNewModel((p) => ({ ...p, modelId: e.target.value }))}
                          placeholder="gpt-4o-mini"
                        />
                      </div>
                      <div className="settings-field">
                        <label>API key</label>
                        <input
                          className="settings-input"
                          type="password"
                          value={newModel.apiKey}
                          onChange={(e) => setNewModel((p) => ({ ...p, apiKey: e.target.value }))}
                          placeholder="sk-…"
                        />
                      </div>
                    </div>
                    <div className="settings-form-actions">
                      <button type="button" className="settings-btn primary" onClick={() => void addModel()}>
                        Save model
                      </button>
                      <button
                        type="button"
                        className="settings-btn"
                        onClick={() => setShowAddModel(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'modes' && (
          <>
            <h1 className="settings-section-title">Modes</h1>
            <p className="settings-section-desc">
              Modes tailor Clarifi to your use case. The active mode shapes live suggestions and chat
              responses.
            </p>

            {prefsLoading || !prefs ? (
              renderPrefsLoading()
            ) : (
              <>
                {Array.from(modeGroups.entries()).map(([category, modes]) => (
                  <div key={category}>
                    <div className="settings-mode-category">{category}</div>
                    {modes.map((mode: ModeConfig) => (
                      <div key={mode.id} className="settings-card">
                        <div className="settings-card-header">
                          <div>
                            <div className="settings-card-title">{mode.label}</div>
                            <div className="settings-card-meta">
                              {prefs.activeModeId === mode.id ? 'Active mode' : 'Inactive'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="settings-btn small"
                              onClick={() => selectMode(mode)}
                            >
                              Edit prompt
                            </button>
                            {prefs.activeModeId !== mode.id && (
                              <button
                                type="button"
                                className="settings-btn small primary"
                                onClick={() => void activateMode(mode.id)}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {selectedMode && (
                  <div className="settings-card" style={{ marginTop: 20 }}>
                    <div className="settings-card-title" style={{ marginBottom: 10 }}>
                      System prompt — {selectedMode.label}
                    </div>
                    <textarea
                      className="settings-textarea"
                      value={draftPrompt}
                      onChange={(e) => setDraftPrompt(e.target.value)}
                    />
                    <div className="settings-form-actions">
                      <button type="button" className="settings-btn primary" onClick={() => void savePrompt()}>
                        Save prompt
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'integrations' && (
          <>
            <h1 className="settings-section-title">Integrations</h1>
            <p className="settings-section-desc">
              Services connected to Clarifi for AI, transcription, and account billing.
            </p>

            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <div className="settings-card-title">Clarifi account</div>
                  <div className="settings-card-meta">
                    {profile?.paired ? 'Connected' : 'Not connected'}
                  </div>
                </div>
                {!profile?.paired && (
                  <button type="button" className="settings-btn small primary" onClick={openConnect}>
                    Connect
                  </button>
                )}
              </div>
              <p className="settings-card-desc">
                Links this desktop app to your plan, usage limits, and web dashboard.
              </p>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Anthropic</div>
              <p className="settings-card-desc">
                Powers chat and live suggestions via your Clarifi account or a custom API key.
              </p>
              <span className="settings-btn small active-pill">Built-in</span>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">OpenAI</div>
              <p className="settings-card-desc">
                GPT-4o, GPT-4.1, o3-mini, and o4-mini models via OPENAI_API_KEY in your local env.
              </p>
              <span className="settings-btn small active-pill">Built-in</span>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Google Gemini</div>
              <p className="settings-card-desc">
                Gemini 2.5 Flash/Pro and 2.0 models via GEMINI_API_KEY in your local env.
              </p>
              <span className="settings-btn small active-pill">Built-in</span>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Groq (Whisper)</div>
              <p className="settings-card-desc">
                Transcribes microphone and meeting audio in real time through your Clarifi account.
              </p>
              <span className="settings-btn small active-pill">Built-in</span>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Custom models</div>
              <p className="settings-card-desc">
                Add your own Anthropic, OpenAI, or Gemini models under Models → Add a model.
              </p>
              <button
                type="button"
                className="settings-btn small"
                onClick={() => setTab('models')}
              >
                Manage models
              </button>
            </div>
          </>
        )}

        {tab === 'keybinds' && (
          <>
            <h1 className="settings-section-title">Keybinds</h1>
            <p className="settings-section-desc">
              Global shortcuts for the overlay. Custom keybinds are coming soon on paid plans.
            </p>

            <div className="settings-keybind-list">
              {KEYBINDS.map((bind) => (
                <div key={bind.action} className="settings-keybind-row">
                  <span className="settings-keybind-action">{bind.action}</span>
                  <div className="settings-keybind-keys">
                    {bind.keys.map((key, i) => (
                      <span key={`${bind.action}-${key}-${i}`} className="settings-kbd">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'audio' && (
          <>
            <section className="settings-audio-section">
              <h2 className="settings-audio-section-title">Language</h2>
              <p className="settings-audio-section-desc">
                Choose how Clarifi listens and responds during meetings.
              </p>

              <div className="settings-audio-row">
                <div className="settings-audio-row-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 10v4M8 6v12M12 4v16M16 8v8M20 10v4" />
                  </svg>
                </div>
                <div className="settings-audio-row-text">
                  <div className="settings-audio-row-title">Transcription language</div>
                  <div className="settings-audio-row-desc">Select the language you speak in meetings.</div>
                </div>
                <select
                  className="settings-audio-select"
                  value={audioPrefs.transcriptionLanguage}
                  onChange={(e) => handleTranscriptionLanguage(e.target.value)}
                >
                  {TRANSCRIPTION_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-audio-row">
                <div className="settings-audio-row-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 8h6M5 12h10M5 16h6" />
                    <path d="M15 8l4 4-4 4" />
                  </svg>
                </div>
                <div className="settings-audio-row-text">
                  <div className="settings-audio-row-title">Output language</div>
                  <div className="settings-audio-row-desc">Your preferred language for AI and meeting notes.</div>
                </div>
                <select
                  className="settings-audio-select"
                  value={audioPrefs.outputLanguage}
                  onChange={(e) => handleOutputLanguage(e.target.value)}
                >
                  {OUTPUT_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="settings-audio-section">
              <h2 className="settings-audio-section-title">Audio Settings</h2>
              <p className="settings-audio-section-desc">
                Test your audio input before you hop into a call.
              </p>

              <div className="settings-audio-row">
                <div className="settings-audio-row-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
                  </svg>
                </div>
                <div className="settings-audio-row-text">
                  <div className="settings-audio-row-title">Microphone Source</div>
                  <div className="settings-audio-row-desc">
                    {permissions?.microphone
                      ? `Current: ${selectedMicLabel}`
                      : 'Microphone permission required'}
                  </div>
                </div>
                <div className="settings-audio-row-actions">
                  {micDevices.length > 0 && (
                    <select
                      className="settings-audio-select"
                      value={audioPrefs.preferredMicrophoneId || micDevices[0]?.deviceId || ''}
                      onChange={(e) => handleMicChange(e.target.value)}
                    >
                      {micDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="settings-audio-test-btn"
                    onClick={() => void testMicrophone()}
                    disabled={testMicStatus === 'testing' || !permissions?.microphone}
                  >
                    {testMicStatus === 'testing' ? 'Testing…' : 'Test Microphone'}
                  </button>
                </div>
              </div>

              {!permissions?.microphone && (
                <button type="button" className="settings-btn small primary" onClick={openMicSettings}>
                  Open microphone settings
                </button>
              )}

              {testMicStatus === 'success' && (
                <p className="settings-audio-test-result success">Microphone is working.</p>
              )}
              {testMicStatus === 'no-signal' && (
                <p className="settings-audio-test-result warn">
                  No audio detected — try speaking or check your input level.
                </p>
              )}
              {testMicStatus === 'error' && (
                <p className="settings-audio-test-result error">
                  Could not access the microphone. Check permissions and try again.
                </p>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="settings-footer">
        <span className="settings-footer-label">Account and app</span>
        <div className="settings-footer-actions">
          <button type="button" className="settings-footer-action" onClick={resetOnboarding}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            Reset onboarding
          </button>
          <button type="button" className="settings-footer-action" onClick={logoutAccount}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
          <button type="button" className="settings-footer-action danger" onClick={eraseAccountData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Erase local data
          </button>
          <button type="button" className="settings-footer-action" onClick={quitApp}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v10" />
              <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
            </svg>
            Quit
          </button>
        </div>
      </footer>
      </div>
    </div>
  )
}
