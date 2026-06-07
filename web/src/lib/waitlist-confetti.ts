export async function fireWaitlistConfetti() {
  const confetti = (await import('canvas-confetti')).default

  confetti({
    particleCount: 64,
    spread: 52,
    startVelocity: 28,
    gravity: 0.9,
    ticks: 160,
    origin: { y: 0.62 },
    colors: ['#3b82f6', '#60a5fa', '#22c55e', '#f59e0b', '#a78bfa'],
    disableForReducedMotion: true,
  })
}
