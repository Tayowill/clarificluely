export function getCreatorUserIds(): Set<string> {
  const raw = process.env.CREATOR_CLERK_USER_IDS?.trim()
  if (!raw) return new Set()
  return new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))
}

export function isCreatorUser(userId: string): boolean {
  return getCreatorUserIds().has(userId)
}
