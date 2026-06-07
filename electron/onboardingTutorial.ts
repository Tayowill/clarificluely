import { BrowserWindow, globalShortcut } from 'electron'

export type TutorialStep = 'enter' | 'move' | 'listen' | 'stealth'

let activeStep: TutorialStep | null = null
let onboardingWindow: BrowserWindow | null = null
let shortcutsRegistered = false
let moveDetected = false

const NUDGE_PX = 20

export function setOnboardingWindow(window: BrowserWindow | null): void {
  onboardingWindow = window
}

function sendTutorialEvent(type: TutorialStep): void {
  if (!onboardingWindow || onboardingWindow.isDestroyed()) return
  onboardingWindow.webContents.send('onboarding:tutorial-event', { type })
}

function sendMockNudge(dx: number, dy: number): void {
  if (!onboardingWindow || onboardingWindow.isDestroyed()) return
  onboardingWindow.webContents.send('onboarding:mock-nudge', { dx, dy })
}

function unregisterTutorialShortcuts(): void {
  if (!shortcutsRegistered) return
  const keys = [
    'CommandOrControl+Enter',
    'CommandOrControl+Up',
    'CommandOrControl+Down',
    'CommandOrControl+Left',
    'CommandOrControl+Right',
  ]
  for (const key of keys) {
    if (globalShortcut.isRegistered(key)) {
      globalShortcut.unregister(key)
    }
  }
  shortcutsRegistered = false
}

function registerTutorialShortcuts(step: TutorialStep): void {
  unregisterTutorialShortcuts()
  moveDetected = false

  if (step === 'enter') {
    globalShortcut.register('CommandOrControl+Enter', () => {
      if (activeStep !== 'enter') return
      sendTutorialEvent('enter')
    })
    shortcutsRegistered = true
    return
  }

  if (step === 'move') {
    const onMove = (dx: number, dy: number) => {
      sendMockNudge(dx, dy)
      if (activeStep !== 'move' || moveDetected) return
      moveDetected = true
      sendTutorialEvent('move')
    }
    globalShortcut.register('CommandOrControl+Up', () => onMove(0, -NUDGE_PX))
    globalShortcut.register('CommandOrControl+Down', () => onMove(0, NUDGE_PX))
    globalShortcut.register('CommandOrControl+Left', () => onMove(-NUDGE_PX, 0))
    globalShortcut.register('CommandOrControl+Right', () => onMove(NUDGE_PX, 0))
    shortcutsRegistered = true
  }
}

export function startTutorial(step: TutorialStep): void {
  activeStep = step

  if (step === 'listen' || step === 'stealth') {
    return
  }

  registerTutorialShortcuts(step)
}

export function stopTutorial(): void {
  activeStep = null
  moveDetected = false
  unregisterTutorialShortcuts()
}

export function signalTutorialAction(type: TutorialStep): void {
  if (activeStep !== type) return
  sendTutorialEvent(type)
}
