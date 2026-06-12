import { BrowserWindow } from 'electron'
import { getKeybindAccelerator } from './keybindPreferences'
import {
  pauseKeybindsForTutorial,
  registerTutorialAccelerators,
  resumeKeybindsAfterTutorial,
} from './keybindManager'
import { nudgeOverlayWindow } from './overlay'
import { sendOverlayTourStep } from './overlayTour'

export type TutorialStep =
  | 'toggle'
  | 'enter'
  | 'chat'
  | 'screen'
  | 'listen'
  | 'stealth'
  | 'move'
  | 'sessions'

let activeStep: TutorialStep | null = null
let onboardingWindow: BrowserWindow | null = null
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
  resumeKeybindsAfterTutorial()
}

function registerTutorialShortcuts(step: TutorialStep): void {
  pauseKeybindsForTutorial()
  moveDetected = false

  if (step === 'toggle') {
    const accelerator = getKeybindAccelerator('toggle_overlay')
    registerTutorialAccelerators([accelerator], () => {
      if (activeStep !== 'toggle') return
      sendTutorialEvent('toggle')
    })
    return
  }

  if (step === 'enter') {
    const accelerator = getKeybindAccelerator('submit')
    registerTutorialAccelerators([accelerator], () => {
      if (activeStep !== 'enter') return
      sendTutorialEvent('enter')
    })
    return
  }

  if (step === 'move') {
    const accelerators = [
      getKeybindAccelerator('move_up'),
      getKeybindAccelerator('move_down'),
      getKeybindAccelerator('move_left'),
      getKeybindAccelerator('move_right'),
    ]
    const handlers = new Map<string, () => void>([
      [getKeybindAccelerator('move_up'), () => onMove(0, -NUDGE_PX)],
      [getKeybindAccelerator('move_down'), () => onMove(0, NUDGE_PX)],
      [getKeybindAccelerator('move_left'), () => onMove(-NUDGE_PX, 0)],
      [getKeybindAccelerator('move_right'), () => onMove(NUDGE_PX, 0)],
    ])

    function onMove(dx: number, dy: number): void {
      sendMockNudge(dx, dy)
      nudgeOverlayWindow(dx, dy)
      if (activeStep !== 'move' || moveDetected) return
      moveDetected = true
      sendTutorialEvent('move')
    }

    registerTutorialAccelerators(accelerators, (accelerator) => {
      handlers.get(accelerator)?.()
    })
  }
}

const TUTORIAL_STEPS: TutorialStep[] = [
  'toggle',
  'enter',
  'chat',
  'screen',
  'listen',
  'stealth',
  'move',
  'sessions',
]

export function isTutorialStep(value: string): value is TutorialStep {
  return (TUTORIAL_STEPS as string[]).includes(value)
}

export function startTutorial(step: TutorialStep): void {
  activeStep = step
  sendOverlayTourStep(step)

  if (step === 'chat' || step === 'screen' || step === 'listen' || step === 'stealth' || step === 'sessions') {
    return
  }

  registerTutorialShortcuts(step)
}

export function stopTutorial(): void {
  activeStep = null
  moveDetected = false
  unregisterTutorialShortcuts()
  sendOverlayTourStep(null)
}

export function signalTutorialAction(type: TutorialStep): void {
  if (activeStep !== type) return
  sendTutorialEvent(type)
}

export function getActiveTutorialStep(): TutorialStep | null {
  return activeStep
}
