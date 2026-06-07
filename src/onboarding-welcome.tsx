import { useCallback, useEffect, useRef, useState } from 'react'

const LOGO_SRC = './clarifi-logo.png'

export function ClarifiLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Clarifi"
      className="onboarding-logo-img"
      width={size}
      height={size}
      draggable={false}
    />
  )
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  spin: number
  life: number
}

const GREEN_PALETTE = ['#34d399', '#10b981', '#6ee7b7', '#059669', '#a7f3d0', '#22c55e']

function GreenConfetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const originX = canvas.width * 0.28
    const originY = canvas.height * 0.78

    particlesRef.current = Array.from({ length: 110 }, () => ({
      x: originX + (Math.random() - 0.5) * 120,
      y: originY,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 12 + 4),
      size: Math.random() * 7 + 4,
      color: GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)],
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 18,
      life: 1,
    }))

    const gravity = 0.32
    let running = true

    const tick = () => {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      for (const p of particlesRef.current) {
        if (p.life <= 0) continue
        alive++
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rotation += p.spin
        p.life -= 0.012

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      if (alive > 0) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  if (!active) return null

  return <canvas ref={canvasRef} className="onboarding-confetti" aria-hidden />
}

const THUMB_SIZE = 44
const TRACK_PADDING = 4

export function SlideToContinue({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [maxOffset, setMaxOffset] = useState(0)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const draggingRef = useRef(false)

  const measure = useCallback(() => {
    if (!trackRef.current) return
    const width = trackRef.current.clientWidth
    setMaxOffset(Math.max(0, width - THUMB_SIZE - TRACK_PADDING * 2))
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const complete = useCallback(() => {
    if (done) return
    setDone(true)
    setOffset(maxOffset)
    setShowConfetti(true)
    window.setTimeout(() => onComplete(), 950)
  }, [done, maxOffset, onComplete])

  const setFromClientX = useCallback(
    (clientX: number) => {
      if (done || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const x = clientX - rect.left - THUMB_SIZE / 2 - TRACK_PADDING
      const clamped = Math.max(0, Math.min(x, maxOffset))
      setOffset(clamped)
      if (maxOffset > 0 && clamped >= maxOffset * 0.9) {
        complete()
      }
    },
    [complete, done, maxOffset],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    if (done) return
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || done) return
    setFromClientX(e.clientX)
  }

  const onPointerUp = () => {
    if (done) return
    draggingRef.current = false
    if (maxOffset > 0 && offset < maxOffset * 0.9) {
      setOffset(0)
    }
  }

  const progress = maxOffset > 0 ? offset / maxOffset : 0

  return (
    <>
      <GreenConfetti active={showConfetti} />
      <div
        ref={trackRef}
        className={`slide-to-continue ${done ? 'slide-to-continue-done' : ''}`}
      >
        <div className="slide-to-continue-fill" style={{ width: `${progress * 100}%` }} />
        <span className="slide-to-continue-label">
          {done ? 'Welcome!' : 'Slide to continue'}
        </span>
        <div
          className="slide-to-continue-thumb"
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-label="Slide to continue"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="slide-to-continue-arrow">{done ? '✓' : '›'}</span>
        </div>
      </div>
    </>
  )
}
