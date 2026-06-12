export async function fireWaitlistConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#007aff', '#5ac8fa', '#34c759', '#af52de', '#ff9500']

  confetti({
    particleCount: 48,
    spread: 56,
    startVelocity: 26,
    gravity: 0.95,
    ticks: 180,
    origin: { x: 0.5, y: 0.55 },
    colors,
    disableForReducedMotion: true,
  })

  window.setTimeout(() => {
    confetti({
      particleCount: 28,
      spread: 70,
      startVelocity: 18,
      gravity: 0.85,
      ticks: 140,
      origin: { x: 0.42, y: 0.48 },
      colors,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 28,
      spread: 70,
      startVelocity: 18,
      gravity: 0.85,
      ticks: 140,
      origin: { x: 0.58, y: 0.48 },
      colors,
      disableForReducedMotion: true,
    })
  }, 180)
}
