'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'visible' | 'fadeout' | 'gone'>('visible')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fadeout'), 1800)
    const t2 = setTimeout(() => setPhase('gone'), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{
        transition: 'opacity 0.6s ease',
        opacity: phase === 'fadeout' ? 0 : 1,
        pointerEvents: phase === 'fadeout' ? 'none' : 'all',
      }}
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Logo icon */}
      <div
        className="relative mb-6 animate-bounce-in"
        style={{ animationDelay: '0ms' }}
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary animate-logo-glow"
          style={{ borderRadius: '28px' }}
        >
          <Zap className="h-12 w-12 text-white" fill="white" />
        </div>
        {/* Ripple rings */}
        <div
          className="absolute inset-0 rounded-3xl border border-primary/40"
          style={{
            animation: 'ripple 1.4s ease-out 0.3s infinite',
            borderRadius: '28px',
          }}
        />
        <div
          className="absolute inset-0 rounded-3xl border border-primary/20"
          style={{
            animation: 'ripple 1.4s ease-out 0.6s infinite',
            borderRadius: '28px',
          }}
        />
      </div>

      {/* Brand name */}
      <div
        className="animate-slide-up mb-2"
        style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
      >
        <span className="text-4xl font-black tracking-tight text-text-primary">
          APEX<span className="text-primary">WAGER</span>
        </span>
      </div>

      {/* Tagline */}
      <div
        className="animate-fade-in mb-10 text-muted text-sm tracking-widest uppercase"
        style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
      >
        Bet Live. Win Big.
      </div>

      {/* Loading bar */}
      <div className="w-40 h-1 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary animate-loading-bar"
          style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
        />
      </div>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
