type AnthropicModelLike = { id: string; label: string; provider: string }

/** Display order for Anthropic models in settings and the overlay picker. */
export const ANTHROPIC_MODEL_ORDER = [
  'claude-fable-5',
  'claude-opus-4-8',
  'claude-haiku-4-5',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-3',
] as const

/** Divider in the picker appears before this model (legacy Opus tier). */
export const ANTHROPIC_LEGACY_DIVIDER_BEFORE = 'claude-opus-4-7'

export const DEFAULT_ANTHROPIC_MODEL_ID = 'claude-haiku-4-5'

const ORDER_INDEX = new Map<string, number>(
  ANTHROPIC_MODEL_ORDER.map((id, index) => [id, index]),
)

export function anthropicShortLabel(label: string): string {
  return label.replace(/^Claude /, '')
}

export function sortAnthropicModels<T extends AnthropicModelLike>(models: T[]): T[] {
  return [...models].sort((a, b) => {
    const ai = ORDER_INDEX.get(a.id) ?? 999
    const bi = ORDER_INDEX.get(b.id) ?? 999
    if (ai !== bi) return ai - bi
    return a.label.localeCompare(b.label)
  })
}

export function isIncludedAnthropicModel(modelId: string): boolean {
  return modelId === DEFAULT_ANTHROPIC_MODEL_ID
}

export function isPaidPlan(plan?: string | null): boolean {
  return plan === 'pro' || plan === 'pro_plus'
}

export function canSelectAnthropicModel(modelId: string, plan?: string | null): boolean {
  return isPaidPlan(plan) || isIncludedAnthropicModel(modelId)
}
