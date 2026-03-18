'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type Difficulty = 'easy' | 'medium' | 'hard'

const GAME_CONFIGS = {
  imposter: {
    title: 'Find the Imposter',
    subtitle: '5-round word deduction · 3–12 players',
    icon: '🛡️',
    ctaCreate: 'Create Room',
    ctaJoin: 'Join Room',
    tagline: 'Fast rounds, bold reads, and a last-stand twist.',
    steps: [
      'Create a room and share the code with friends.',
      'Everyone gets a word while one player is the Imposter.',
      'Chat for five rounds, watch for lies, then vote in Round 5.',
      'A caught Imposter gets a Last Stand guess to flip the win.',
    ],
  },
  phantom: {
    title: 'Phantom Protocol',
    subtitle: 'Asymmetric deduction · 5-tier gauntlet · 4–8 players required',
    icon: '👁️',
    ctaCreate: 'Initiate Vault',
    ctaJoin: 'Breach Vault',
    steps: [
      'Generate a 6-digit vault code and gather four to eight codebreakers.',
      'Hackers read the true lore while the Phantom sees corrupted hints.',
      'Rounds 1–4 forbid voting to force observation and tension.',
      'Round 5 turns crimson—the Tribunal opens for the final vote.',
    ],
    tagline: 'Paranoia, delayed gratification, and subtle sabotage.',
  },
} as const

type GameMode = keyof typeof GAME_CONFIGS

export default function FindTheImposterLanding() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedGame: GameMode = searchParams.get('game') === 'phantom' ? 'phantom' : 'imposter'
  const gameConfig = GAME_CONFIGS[selectedGame]
  const modeSuffix = selectedGame === 'phantom' ? '?game=phantom' : ''
  const introImage = selectedGame === 'phantom' ? '/games/phantom-protocol.png' : '/games/find-imposter.png'

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  async function handleCreate() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/game/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/games/find-the-imposter/${data.code}${modeSuffix}`)
    } finally { setLoading(false) }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) { setError('Enter a valid 6-character room code'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/join`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/games/find-the-imposter/${code}${modeSuffix}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <Image
              src={introImage}
              alt={gameConfig.title}
              width={800}
              height={450}
              className="h-auto w-full"
              priority
            />
          </div>
          <div className="text-5xl mb-3">{gameConfig.icon}</div>
          <h1 className="text-3xl font-black text-text-primary">{gameConfig.title}</h1>
          <p className="text-sm text-muted mt-1">{gameConfig.subtitle}</p>
          {selectedGame === 'phantom' && (
            <p className="text-[11px] text-amber-400 mt-1">{gameConfig.tagline}</p>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 text-xs text-muted">
          {gameConfig.steps.map((step, index) => (
            <p key={step}><span className="text-text-secondary font-bold">{index + 1}.</span> {step}</p>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-2.5 rounded-lg text-sm font-bold transition-all capitalize',
                tab === t ? 'bg-primary text-white' : 'text-muted hover:text-text-primary'
              )}>
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-primary text-center">{error}</p>}

        {tab === 'create' ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={cn('py-3 rounded-xl border text-sm font-bold capitalize transition-all',
                      difficulty === d ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted hover:text-text-primary'
                    )}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                {difficulty === 'easy' ? 'Common pairs — Pepsi vs Coca-Cola' : difficulty === 'medium' ? 'Tricky pairs — Deadlift vs Squat' : 'Expert pairs — FaceID vs Fingerprint Sensor'}
              </p>
            </div>
            <button onClick={handleCreate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 py-4 text-sm font-black text-white transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {loading ? 'Creating…' : gameConfig.ctaCreate}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Room Code</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl font-black text-text-primary placeholder:text-muted tracking-[0.4em] focus:border-primary focus:outline-none"
              />
            </div>
            <button onClick={handleJoin} disabled={loading || joinCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 py-4 text-sm font-black text-white transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? 'Joining…' : gameConfig.ctaJoin}
            </button>
          </div>
        )}

        <div className="text-center">
          <Link href="/" className="text-xs text-muted hover:text-text-primary transition-colors">← Back to Apex Wager</Link>
        </div>
      </div>
    </div>
  )
}

