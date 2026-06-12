import { BrowserWindow } from 'electron'
import type { TutorialStep } from './onboardingTutorial'
import { getOverlayWindow } from './overlay'

export function sendOverlayTourStep(step: TutorialStep | null): void {
  const overlay = getOverlayWindow()
  if (!overlay || overlay.isDestroyed()) return
  overlay.webContents.send('overlay:tour', { step })
}

export function sendOverlayTourHint(step: TutorialStep | null, hint?: string): void {
  const overlay = getOverlayWindow()
  if (!overlay || overlay.isDestroyed()) return
  overlay.webContents.send('overlay:tour', { step, hint })
}
