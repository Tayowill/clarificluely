import { getKey, saveKey } from './store'

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete'

export async function isOnboardingComplete(): Promise<boolean> {
  if (process.env.FORCE_ONBOARDING === '1') {
    return false
  }
  const value = await getKey(ONBOARDING_COMPLETE_KEY)
  return value === 'true'
}

export async function markOnboardingComplete(): Promise<void> {
  await saveKey(ONBOARDING_COMPLETE_KEY, 'true')
}

export async function resetOnboarding(): Promise<void> {
  const { deleteKey } = await import('./store')
  await deleteKey(ONBOARDING_COMPLETE_KEY)
}
