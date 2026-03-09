'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Copy, Check, Swords, Trophy, AlertTriangle, Zap, Clock, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Participant {
  id: string; side: string; userId: string; payout: number | null
  user: { id: string; name: string | null; image: string | null }
}
interface Proof {
  id: string; claimSide: string; description: string; createdAt: string
  submitter: { id: string; name: string | null }
}
interface Challenge {
  id: string; title: string; description: string | null; inviteCode: string
  prizeType: string; prizeAmount: number | null; prizeItem: string | null
  status: string; winningSide: string | null; creatorId: string
  creator: { id: string; name: string | null; image: string | null }
  participants: Participant[]
  proofs: Proof[]
}

// ── Confetti particles ────────────────────────────────────────────────────────
function Confetti() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animDelay: `${Math.random() * 0.8}s`,
    animDur: `${1.5 + Math.random() * 1.5}s`,
    color: ['#dc2626','#f59e0b','#22c55e','#3b82f6','#a855f7','#ec4899','#ffffff'][Math.floor(Math.random() * 7)],
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={{
            left: p.left,
            animationDelay: p.animDelay,
            animationDuration: p.animDur,
          }}
        >
          <div style={{ width: p.size, height: p.size, background: p.color, borderRadius: '2px', transform: `rotate(${p.rotate})` }} />
        </div>
      ))}
    </div>
  )
}

// ── Win celebration overlay ───────────────────────────────────────────────────
function WinCelebration({ prizeType, prizeItem, prizeAmount, loserNames, onClose }: {
  prizeType: string; prizeItem: string | null; prizeAmount: number | null
  loserNames: string[]; onClose: () => void
}) {
  return (
    <>
      <Confetti />
      <div className="fixed inset-0 z-[199] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
        <div
          className="relative w-full max-w-sm rounded-3xl border border-win/30 bg-surface p-8 text-center animate-slide-up shadow-[0_0_120px_rgba(34,197,94,0.3)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Trophy */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-win/20 border-2 border-win/40">
            <span className="text-5xl">🏆</span>
          </div>

          <h2 className="text-3xl font-black text-win mb-2">YOU WON!</h2>

          {prizeType === 'money' ? (
            <div>
              <p className="text-4xl font-black text-text-primary mt-2">
                FC {formatCurrency(prizeAmount ?? 0)}
              </p>
              <p className="text-sm text-muted mt-1">has been added to your wallet</p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold text-amber-400 mt-2">{loserNames.join(' & ')} owe{loserNames.length === 1 ? 's' : ''} you:</p>
              <p className="text-2xl font-black text-text-primary mt-1">{prizeItem}</p>
              <p className="text-xs text-muted mt-2">Make sure you collect! 😄</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-win hover:bg-win/90 py-3 text-sm font-black text-white transition-colors"
          >
            Claim your victory 🎉
          </button>
        </div>
      </div>
    </>
  )
}

// ── Owe notification ──────────────────────────────────────────────────────────
function OweNotification({ prizeType, prizeItem, prizeAmount, winnerNames, onClose }: {
  prizeType: string; prizeItem: string | null; prizeAmount: number | null
  winnerNames: string[]; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[199] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-3xl border border-primary/30 bg-surface p-8 text-center animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <span className="text-4xl">😬</span>
        </div>

        <h2 className="text-2xl font-black text-text-primary mb-2">You Lost</h2>

        {prizeType === 'money' ? (
          <div>
            <p className="text-sm text-muted">Your stake has been paid out to the winners.</p>
            <p className="text-3xl font-black text-primary mt-2">-FC {formatCurrency(prizeAmount ?? 0)}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted">You owe <span className="font-bold text-text-primary">{winnerNames.join(' & ')}</span>:</p>
            <p className="text-2xl font-black text-amber-400 mt-2">{prizeItem}</p>
            <p className="text-xs text-muted mt-2">Don&apos;t forget — a bet is a bet! 🤝</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl border border-border bg-surface-2 hover:bg-surface py-3 text-sm font-semibold text-text-secondary transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChallengePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: challenge, mutate } = useSWR<Challenge>(`/api/challenges/${id}`, fetcher, { refreshInterval: 4000 })

  const [copied, setCopied] = useState(false)
  const [proofText, setProofText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [showOwe, setShowOwe] = useState(false)
  const prevStatus = useRef<string | null>(null)

  // Trigger celebration/owe overlay when status transitions to completed
  useEffect(() => {
    if (!challenge || !session?.user?.id) return
    if (prevStatus.current !== null && prevStatus.current !== 'completed' && challenge.status === 'completed') {
      const me = challenge.participants.find((p) => p.userId === session.user.id)
      if (me?.side === challenge.winningSide) setShowCelebration(true)
      else setShowOwe(true)
    }
    prevStatus.current = challenge.status
  }, [challenge, session])

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  if (!challenge) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  const me = challenge.participants.find((p) => p.userId === session.user.id)
  const mySide = me?.side
  const sideA = challenge.participants.filter((p) => p.side === 'a')
  const sideB = challenge.participants.filter((p) => p.side === 'b')
  const iAmIn = !!me
  const latestProof = challenge.proofs[0]

  const iWon = challenge.status === 'completed' && mySide === challenge.winningSide
  const iLost = challenge.status === 'completed' && mySide && mySide !== challenge.winningSide
  const canClaim = challenge.status === 'active' && iAmIn
  const canResolve = challenge.status === 'awaiting_resolution' && iAmIn && mySide !== challenge.winningSide

  const totalPool = challenge.prizeType === 'money'
    ? (challenge.prizeAmount ?? 0) * challenge.participants.length
    : 0
  const winnerSideParticipants = challenge.winningSide
    ? challenge.participants.filter(p => p.side === challenge.winningSide)
    : []
  const myPayout = challenge.prizeType === 'money' && winnerSideParticipants.length > 0
    ? totalPool / winnerSideParticipants.length
    : 0

  const winnerNames = challenge.participants.filter(p => p.side === challenge.winningSide).map(p => p.user.name?.split(' ')[0] ?? 'Someone')
  const loserNames = challenge.participants.filter(p => p.side !== challenge.winningSide).map(p => p.user.name?.split(' ')[0] ?? 'Someone')

  async function copyCode() {
    await navigator.clipboard.writeText(challenge!.inviteCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch(`/api/challenges/${id}/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: proofText }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setProofText(''); mutate()
    } finally { setLoading(false) }
  }

  async function handleResolve(action: 'accept' | 'dispute') {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/challenges/${id}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      mutate()
    } finally { setLoading(false) }
  }

  async function handleCancel() {
    if (!confirm('Cancel this challenge and refund all stakes?')) return
    setLoading(true)
    try {
      await fetch(`/api/challenges/${id}`, { method: 'DELETE' })
      mutate()
    } finally { setLoading(false) }
  }

  const statusColors: Record<string, string> = {
    open: 'text-muted', active: 'text-live', awaiting_resolution: 'text-amber-400',
    completed: 'text-win', disputed: 'text-primary', cancelled: 'text-muted',
  }
  const statusLabels: Record<string, string> = {
    open: 'Open — waiting for opponents', active: 'Live',
    awaiting_resolution: 'Awaiting Resolution', completed: 'Completed',
    disputed: 'Disputed — admin reviewing', cancelled: 'Cancelled',
  }

  return (
    <>
      {/* Celebrations */}
      {showCelebration && (
        <WinCelebration
          prizeType={challenge.prizeType}
          prizeItem={challenge.prizeItem}
          prizeAmount={myPayout}
          loserNames={loserNames}
          onClose={() => setShowCelebration(false)}
        />
      )}
      {showOwe && (
        <OweNotification
          prizeType={challenge.prizeType}
          prizeItem={challenge.prizeItem}
          prizeAmount={challenge.prizeAmount}
          winnerNames={winnerNames}
          onClose={() => setShowOwe(false)}
        />
      )}

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur-md px-4 py-3">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Link href="/challenges" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-text-primary truncate">{challenge.title}</h1>
              <p className={cn('text-xs font-semibold', statusColors[challenge.status] ?? 'text-muted')}>
                {statusLabels[challenge.status] ?? challenge.status}
              </p>
            </div>
            {/* Invite code */}
            {(challenge.status === 'open' || challenge.status === 'active') && (
              <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-bold text-muted hover:text-text-primary transition-colors">
                <span className="tracking-widest">{challenge.inviteCode}</span>
                {copied ? <Check className="h-3 w-3 text-win" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
          {error && <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{error}</div>}

          {/* Prize banner */}
          <div className={cn(
            'rounded-2xl border p-5 text-center',
            challenge.prizeType === 'money'
              ? 'border-primary/20 bg-primary/5'
              : 'border-amber-500/20 bg-amber-500/5'
          )}>
            {challenge.prizeType === 'money' ? (
              <>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Stake per person</p>
                <p className="text-4xl font-black text-primary">FC {formatCurrency(challenge.prizeAmount ?? 0)}</p>
                {challenge.participants.length > 0 && (
                  <p className="text-sm text-muted mt-1">Total pool: FC {formatCurrency(totalPool)}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Prize</p>
                <p className="text-3xl font-black text-amber-400">🏆 {challenge.prizeItem}</p>
                <p className="text-xs text-muted mt-1">Loser owes this to the winner</p>
              </>
            )}
          </div>

          {/* Description */}
          {challenge.description && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Details</p>
              <p className="text-sm text-text-secondary">{challenge.description}</p>
            </div>
          )}

          {/* Teams */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
            {/* Team A */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 text-center">Team A</p>
              {sideA.length === 0 ? (
                <p className="text-xs text-muted text-center">—</p>
              ) : sideA.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 justify-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-400">
                    {p.user.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-xs text-text-primary">
                    {p.user.name?.split(' ')[0]}
                    {p.userId === session.user.id && <span className="text-blue-400 ml-0.5">(you)</span>}
                  </span>
                </div>
              ))}
              {challenge.status === 'completed' && challenge.winningSide === 'a' && (
                <p className="text-center text-[10px] font-black text-win mt-1.5">WINNER 🏆</p>
              )}
            </div>

            <div className="flex items-center justify-center pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
                <span className="text-[10px] font-black text-muted">VS</span>
              </div>
            </div>

            {/* Team B */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 text-center">Team B</p>
              {sideB.length === 0 ? (
                <p className="text-xs text-muted text-center italic">Waiting…</p>
              ) : sideB.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 justify-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                    {p.user.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-xs text-text-primary">
                    {p.user.name?.split(' ')[0]}
                    {p.userId === session.user.id && <span className="text-primary ml-0.5">(you)</span>}
                  </span>
                </div>
              ))}
              {challenge.status === 'completed' && challenge.winningSide === 'b' && (
                <p className="text-center text-[10px] font-black text-win mt-1.5">WINNER 🏆</p>
              )}
            </div>
          </div>

          {/* Invite code share */}
          {challenge.status === 'open' && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Share invite code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-3">
                  <p className="text-lg font-black text-text-primary tracking-[0.3em]">{challenge.inviteCode}</p>
                </div>
                <button onClick={copyCode} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted">Share this code with your opponent — they join at /challenges and enter this code. Both sides must have members for the challenge to go live.</p>
            </div>
          )}

          {/* Proof submitted */}
          {latestProof && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-bold text-amber-400">
                  Team {latestProof.claimSide.toUpperCase()} claims victory
                </p>
              </div>
              <p className="text-sm text-text-secondary">"{latestProof.description}"</p>
              <p className="text-[10px] text-muted mt-1">— {latestProof.submitter.name}</p>
            </div>
          )}

          {/* Completed state */}
          {challenge.status === 'completed' && (
            <div className={cn(
              'rounded-2xl border p-5 text-center',
              iWon ? 'border-win/30 bg-win/5' : 'border-border bg-surface'
            )}>
              {iWon ? (
                <>
                  <Trophy className="h-10 w-10 text-win mx-auto mb-2" />
                  <p className="font-black text-win text-xl">You Won!</p>
                  {challenge.prizeType === 'money' && (
                    <p className="text-muted text-sm mt-1">FC {formatCurrency(myPayout)} added to your wallet</p>
                  )}
                  {challenge.prizeType === 'item' && (
                    <p className="text-amber-400 font-bold mt-1">{loserNames.join(' & ')} owe{loserNames.length === 1 ? 's' : ''} you: {challenge.prizeItem}</p>
                  )}
                  <button onClick={() => setShowCelebration(true)} className="mt-3 text-xs text-win underline">See celebration again</button>
                </>
              ) : iLost ? (
                <>
                  <p className="font-black text-text-primary text-xl">Challenge Over</p>
                  {challenge.prizeType === 'item' && (
                    <p className="text-amber-400 font-bold mt-1">You owe {winnerNames.join(' & ')}: {challenge.prizeItem}</p>
                  )}
                  {challenge.prizeType === 'money' && (
                    <p className="text-muted text-sm mt-1">Your stake went to the winners</p>
                  )}
                  <button onClick={() => setShowOwe(true)} className="mt-3 text-xs text-muted underline">View details</button>
                </>
              ) : (
                <p className="text-muted text-sm">This challenge has been completed.</p>
              )}
            </div>
          )}

          {/* Disputed state */}
          {challenge.status === 'disputed' && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-primary text-sm">Result Disputed</p>
                <p className="text-xs text-muted mt-0.5">An admin will review this challenge and make the final decision.</p>
              </div>
            </div>
          )}

          {/* ── Action panels ── */}

          {/* Claim victory */}
          {canClaim && (
            <form onSubmit={handleClaim} className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-win" />
                <p className="font-bold text-text-primary">Claim Victory</p>
              </div>
              <p className="text-xs text-muted">Describe how you won — the other side will review your proof.</p>
              <textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="e.g. I scored 3 goals vs 1. Screenshot: [link]. Witnessed by John."
                rows={4}
                required
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-win focus:outline-none resize-none"
              />
              <button
                type="submit"
                disabled={loading || !proofText.trim()}
                className="w-full rounded-xl bg-win hover:bg-win/90 py-3 text-sm font-black text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting…' : '🏆 Submit Proof & Claim Victory'}
              </button>
            </form>
          )}

          {/* Resolve — other side */}
          {canResolve && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                <p className="font-bold text-amber-400">Respond to Victory Claim</p>
              </div>
              <p className="text-xs text-text-secondary">Team {challenge.winningSide?.toUpperCase()} says they won. Do you accept their victory?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleResolve('accept')}
                  disabled={loading}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-win/30 bg-win/10 hover:bg-win/20 py-3.5 text-sm font-bold text-win transition-all disabled:opacity-50"
                >
                  <span className="text-xl">🤝</span>
                  Accept Defeat
                </button>
                <button
                  onClick={() => handleResolve('dispute')}
                  disabled={loading}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 py-3.5 text-sm font-bold text-primary transition-all disabled:opacity-50"
                >
                  <span className="text-xl">⚔️</span>
                  Dispute
                </button>
              </div>
              <p className="text-[10px] text-muted text-center">If you dispute, an admin will review and decide the outcome.</p>
            </div>
          )}

          {/* Cancel challenge */}
          {challenge.status === 'open' && challenge.creatorId === session.user.id && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-surface py-3 text-sm text-muted hover:text-primary hover:border-primary/30 transition-all"
            >
              Cancel Challenge{challenge.prizeType === 'money' ? ' & Refund Stakes' : ''}
            </button>
          )}

          {/* Not a participant */}
          {!iAmIn && challenge.status !== 'cancelled' && challenge.status !== 'completed' && (
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <Swords className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary font-semibold">You&apos;re not in this challenge</p>
              <p className="text-xs text-muted mt-0.5 mb-3">Join using the invite code from the challenge creator</p>
              <Link href="/challenges" className="text-xs text-primary hover:underline font-bold">
                Go to Challenges →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
