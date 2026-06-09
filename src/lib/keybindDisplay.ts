const MODIFIER_LABELS: Record<string, string> = {
  CommandOrControl: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
  Shift: '⇧',
  Alt: '⌥',
  Space: 'Space',
  Enter: '↵',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  ',': ',',
}

export function acceleratorToKeyLabels(accelerator: string): string[] {
  return accelerator.split('+').map((part) => MODIFIER_LABELS[part] ?? part)
}

export function keyboardEventToAccelerator(event: KeyboardEvent): string | null {
  if (['Control', 'Meta', 'Shift', 'Alt', 'OS'].includes(event.key)) {
    return null
  }

  const parts: string[] = []
  if (event.metaKey || event.ctrlKey) parts.push('CommandOrControl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  let key = event.key
  if (key === ' ') key = 'Space'
  else if (key === 'ArrowUp') key = 'Up'
  else if (key === 'ArrowDown') key = 'Down'
  else if (key === 'ArrowLeft') key = 'Left'
  else if (key === 'ArrowRight') key = 'Right'
  else if (key.length === 1) key = key.toUpperCase()

  parts.push(key)
  return parts.join('+')
}
