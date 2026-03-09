'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#dc2626', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#f5f5f5', '#fb923c']
const SHAPES = ['circle', 'square', 'triangle']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  shape: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
  gravity: number
}

interface Props {
  active: boolean
  onDone?: () => void
}

export default function WinCelebration({ active, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!active) return
    doneRef.current = false

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Spawn burst of particles from center
    const cx = canvas.width / 2
    const cy = canvas.height / 3
    particlesRef.current = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 10
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        gravity: 0.25 + Math.random() * 0.15,
      }
    })

    function draw(p: Particle, ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      } else {
        ctx.beginPath()
        ctx.moveTo(0, -p.size / 2)
        ctx.lineTo(p.size / 2, p.size / 2)
        ctx.lineTo(-p.size / 2, p.size / 2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    function loop() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0.01)

      for (const p of particlesRef.current) {
        p.vy += p.gravity
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.opacity -= 0.012
        draw(p, ctx!)
      }

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(loop)
      } else if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [active, onDone])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
    />
  )
}
