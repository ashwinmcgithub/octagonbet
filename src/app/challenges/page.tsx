'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Swords, Plus, Hash, ArrowRight, Trophy, Clock, Zap, AlertTriangle, CheckCircle2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Participant {
  id: string; side: string; userId: string; payout: number | null
  user: { id: string; name: string | null; image: string | null; reputation: number }
}

function RepBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-win' : score >= 50 ? 'text-amber-400' : 'text-primary'
  const bg = score >= 80 ? 'bg-win/10' : score >= 50 ? 'bg-amber-400/10' : 'bg-primary/10'
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold', bg, color)}>
      <Shield className="h-2 w-2" />
      {score}
    </span>
  )
}
interface Challenge {
  id: string; title: string; description: string | null
  prizeType: string; prizeAmount: number | null; prizeItem: string | null
  status: string; winningSide: string | null; inviteCode: string
  creator: { id: string; name: string | null }
  participants: Participant[]
  proofs: { id: string; claimSide: string; description: string }[]
}

const STATUS_LABEL: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open:                 { label: 'Open',            icon: Clock,         color: 'text-muted border-border' },
  active:               { label: 'Live',            icon: Zap,           color: 'text-live border-live/30 bg-live/5' },
  awaiting_resolution:  { label: 'Proof Submitted', icon: AlertTriangle, color: 'text-amber-400 border-amber-400/30 bg-amber-400/5' },
  completed:            { label: 'Completed',       icon: CheckCircle2,  color: 'text-win border-win/30 bg-win/5' },
  disputed:             { label: 'Disputed',        icon: AlertTriangle, color: 'text-primary border-primary/30 bg-primary/5' },
  cancelled:            { label: 'Cancelled',       icon: Clock,         color: 'text-muted border-border' },
}

export default function ChallengesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: challenges, mutate } = useSWR<Challenge[]>('/api/challenges', fetcher, { refreshInterval: 5000 })

  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinSide, setJoinSide] = useState<'a' | 'b'>('b')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode, side: joinSide }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
      setShowJoin(false)
      router.push(`/challenges/${data.challengeId}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
              <Swords className="h-6 w-6 text-primary" />
              Challenges
            </h1>
            <p className="text-sm text-muted mt-0.5">Bet on anything with anyone</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(!showJoin); setError('') }}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <Hash className="h-4 w-4" />
              Join
            </button>
            <Link
              href="/challenges/create"
              className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover px-3 py-2 text-sm font-bold text-white shadow-red-glow hover:shadow-none transition-all"
            >
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>
        </div>

        {showJoin && (
          <form onSubmit={handleJoin} className="mb-6 rounded-2xl border border-border bg-surface p-5 space-y-4 animate-fade-in">
            <h2 className="font-bold text-text-primary">Join a Challenge</h2>
            {error && <p className="text-sm text-primary">{error}</p>}
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Invite code (e.g. ABC12345)"
              required maxLength={8}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none tracking-widest font-bold"
            />
            <div>
              <p className="text-xs text-muted mb-2">Which side are you on?</p>
              <div className="grid grid-cols-2 gap-2">
                {(['a', 'b'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setJoinSide(s)}
                    className={cn('rounded-xl border py-2.5 text-sm font-bold transition-colors',
                      joinSide === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-2 text-text-secondary hover:border-border-bright'
                    )}
                  >
                    Team {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowJoin(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {loading ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        )}

        {!challenges ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />)}</div>
        ) : challenges.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-8 py-16 text-center">
            <Swords className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-primary">No challenges yet</p>
            <p className="text-xs text-muted mt-1">Create one or join with an invite code</p>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => {
              const statusInfo = STATUS_LABEL[c.status] ?? STATUS_LABEL.open
              const Icon = statusInfo.icon
              const myPart = c.participants.find((p) => p.userId === session.user.id)
              const mySide = myPart?.side
              const sideA = c.participants.filter((p) => p.side === 'a')
              const sideB = c.participants.filter((p) => p.side === 'b')
              const iWon = c.status === 'completed' && mySide === c.winningSide
              const iLost = c.status === 'completed' && mySide && mySide !== c.winningSide

              return (
                <Link key={c.id} href={`/challenges/${c.id}`}
                  className={cn(
                    'block rounded-2xl border bg-surface p-4 hover:border-primary/40 transition-all group',
                    iWon ? 'border-win/40 bg-win/5' : iLost ? 'border-primary/30' : 'border-border hover:bg-surface-2'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', statusInfo.color)}>
                          <Icon className="h-2.5 w-2.5" />
                          {statusInfo.label}
                        </span>
                        {c.prizeType === 'money' ? (
                          <span className="text-[10px] text-muted font-semibold">FC {formatCurrency(c.prizeAmount ?? 0)} / person</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-semibold">🏆 {c.prizeItem}</span>
                        )}
                      </div>
                      <p className="font-bold text-text-primary truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted flex-wrap">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-blue-400">A:</span>
                          {sideA.length === 0 ? '—' : sideA.map(p => (
                            <span key={p.id} className="flex items-center gap-0.5">
                              {p.user.name?.split(' ')[0]}
                              <RepBadge score={p.user.reputation} />
                            </span>
                          ))}
                        </span>
                        <span className="text-border">vs</span>
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-primary">B:</span>
                          {sideB.length === 0 ? 'waiting…' : sideB.map(p => (
                            <span key={p.id} className="flex items-center gap-0.5">
                              {p.user.name?.split(' ')[0]}
                              <RepBadge score={p.user.reputation} />
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {iWon && <Trophy className="h-4 w-4 text-win" />}
                      <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
