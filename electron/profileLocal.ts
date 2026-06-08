import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const AVATAR_META_FILE = 'profile-avatar.json'

type AvatarMeta = {
  mimeType: string
  fileName: string
}

function metaPath(): string {
  return path.join(app.getPath('userData'), AVATAR_META_FILE)
}

function avatarPath(fileName: string): string {
  return path.join(app.getPath('userData'), fileName)
}

export function getLocalAvatarDataUrl(): string | null {
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath(), 'utf-8')) as AvatarMeta
    const file = avatarPath(meta.fileName)
    if (!fs.existsSync(file)) return null
    const buffer = fs.readFileSync(file)
    return `data:${meta.mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export function saveLocalAvatar(base64: string, mimeType: string): void {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
  const fileName = `profile-avatar.${ext}`
  const file = avatarPath(fileName)

  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(file, Buffer.from(base64, 'base64'))
  fs.writeFileSync(metaPath(), JSON.stringify({ mimeType, fileName }, null, 2))
}

export function removeLocalAvatar(): void {
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath(), 'utf-8')) as AvatarMeta
    const file = avatarPath(meta.fileName)
    if (fs.existsSync(file)) fs.unlinkSync(file)
    fs.unlinkSync(metaPath())
  } catch {
    // no local avatar
  }
}
