'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Coins, Gift, Eye, ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type VerificationSource = 'none' | 'chess.com' | 'lichess' | 'link'

const GAME_OPTIONS: { value: VerificationSource; label: string; icon: string; hint: string }[] = [
  { value: 'chess.com',  label: 'Chess.com',  icon: '♟️', hint: 'Auto-detects winner from game link' },
  { value: 'lichess',    label: 'Lichess',    icon: '♞', hint: 'Auto-detects winner from game link' },
  { value: 'link',       label: 'Other game', icon: '🎮', hint: 'Paste any game/match link — both sides can see it' },
]

export default function CreateChallengePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prizeType, setPrizeType] = useState<'money' | 'item'>('money')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [prizeItem, setPrizeItem] = useState('')
  const [addWitness, setAddWitness] = useState(false)
  const [verificationSource, setVerificationSource] = useState<VerificationSource>('none')
  const [verificationGameUrl, setVerificationGameUrl] = useState('')
  const [teamAUsername, setTeamAUsername] = useState('')
  const [teamBUsername, setTeamBUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  const needsUsernames = verificationSource === 'chess.com' || verificationSource === 'lichess'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          prizeType,
          prizeAmount: prizeType === 'money' ? parseFloat(prizeAmount) : undefined,
          prizeItem: prizeType === 'item' ? prizeItem : undefined,
          addWitness,
          verificationSource: verificationSource === 'none' ? undefined : verificationSource,
          verificationGameUrl: verificationSource !== 'none' ? verificationGameUrl : undefined,
          teamAUsername: needsUsernames ? teamAUsername : undefined,
          teamBUsername: needsUsernames ? teamBUsername : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/challenges/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/challenges" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-text-primary">New Challenge</h1>
            <p className="text-xs text-muted">Bet on anything — money or a prize</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{error}</div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">What&apos;s the challenge?</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chess match — who wins?"
              required
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any rules, conditions, or context…"
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Prize type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Prize type</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPrizeType('money')}
                className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                  prizeType === 'money' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-border-bright'
                )}
              >
                <Coins className={cn('h-6 w-6', prizeType === 'money' ? 'text-primary' : 'text-muted')} />
                <div className="text-center">
                  <p className={cn('text-sm font-bold', prizeType === 'money' ? 'text-primary' : 'text-text-secondary')}>FightCoins</p>
                  <p className="text-[10px] text-muted">Platform holds the money</p>
                </div>
              </button>
              <button type="button" onClick={() => setPrizeType('item')}
                className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                  prizeType === 'item' ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-surface hover:border-border-bright'
                )}
              >
                <Gift className={cn('h-6 w-6', prizeType === 'item' ? 'text-amber-400' : 'text-muted')} />
                <div className="text-center">
                  <p className={cn('text-sm font-bold', prizeType === 'item' ? 'text-amber-400' : 'text-text-secondary')}>Item / Favour</p>
                  <p className="text-[10px] text-muted">Biryani, pizza, anything</p>
                </div>
              </button>
            </div>
          </div>

          {/* Prize details */}
          {prizeType === 'money' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Stake per person (FC)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">FC</span>
                <input type="number" min="1" step="1" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)}
                  placeholder="100" required
                  className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-muted">Each person on both teams puts in this amount. Winner&apos;s team splits the full pot.</p>
              {prizeAmount && (
                <p className="text-[11px] text-win font-semibold">Balance after locking: FC {((session.user.balance ?? 0) - parseFloat(prizeAmount || '0')).toLocaleString()}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">What&apos;s the prize?</label>
              <input value={prizeItem} onChange={(e) => setPrizeItem(e.target.value)}
                placeholder="e.g. 1kg Biryani, Pizza, Dinner" required
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-amber-500/50 focus:outline-none"
              />
              <p className="text-[11px] text-muted">No money involved — loser owes the winner this item.</p>
            </div>
          )}

          {/* ── Game Verification ── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <button type="button" onClick={() => setVerificationSource(v => v === 'none' ? 'chess.com' : 'none')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold text-text-secondary">Link a game for auto-verification (optional)</span>
              </div>
              <div className="flex items-center gap-2">
                {verificationSource !== 'none' && <span className="text-[10px] font-bold text-win bg-win/10 rounded-full px-2 py-0.5">ON</span>}
                {verificationSource !== 'none' ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </div>
            </button>

            {verificationSource !== 'none' && (
              <div className="border-t border-border bg-surface-2 px-4 py-4 space-y-4">
                {/* Platform picker */}
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Game platform</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GAME_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setVerificationSource(opt.value)}
                        className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-semibold transition-all',
                          verificationSource === opt.value ? 'border-win/40 bg-win/10 text-win' : 'border-border bg-surface text-text-secondary hover:border-border-bright'
                        )}
                      >
                        <span className="text-base">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted mt-2">
                    {GAME_OPTIONS.find(o => o.value === verificationSource)?.hint}
                  </p>
                </div>

                {/* Game URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {verificationSource === 'chess.com' ? 'Chess.com game URL' :
                     verificationSource === 'lichess' ? 'Lichess game URL' : 'Game/match link'}
                  </label>
                  <input value={verificationGameUrl} onChange={(e) => setVerificationGameUrl(e.target.value)}
                    placeholder={
                      verificationSource === 'chess.com' ? 'https://www.chess.com/game/live/12345678' :
                      verificationSource === 'lichess' ? 'https://lichess.org/AbCdEfGh' :
                      'https://…'
                    }
                    required
                    type="url"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-win focus:outline-none"
                  />
                  {(verificationSource === 'chess.com' || verificationSource === 'lichess') && (
                    <p className="text-[10px] text-muted">You can add the game link now or after the game is played. Either way works.</p>
                  )}
                </div>

                {/* Usernames for auto-detect */}
                {needsUsernames && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Player usernames on {verificationSource}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-blue-400 font-semibold">Team A username</label>
                        <input value={teamAUsername} onChange={(e) => setTeamAUsername(e.target.value)}
                          placeholder="e.g. magnus2023"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-muted focus:border-blue-500/50 focus:outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-primary font-semibold">Team B username</label>
                        <input value={teamBUsername} onChange={(e) => setTeamBUsername(e.target.value)}
                          placeholder="e.g. hikaru99"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-muted focus:border-primary/50 focus:outline-none mt-1"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted">These must exactly match the usernames in the game. Used to auto-detect who won.</p>
                  </div>
                )}

                {verificationSource === 'link' && (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-muted">
                    The game link will be shown to both sides so everyone can see the result. You&apos;ll still need to manually claim victory after the game.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Witness toggle */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <button type="button" onClick={() => setAddWitness(!addWitness)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Eye className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold text-text-secondary">Add a witness (optional)</span>
              </div>
              <div className="flex items-center gap-2">
                {addWitness && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">ON</span>}
                {addWitness ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </div>
            </button>
            {addWitness && (
              <div className="border-t border-border bg-surface-2 px-4 py-3 text-xs text-muted space-y-1">
                <p className="font-semibold text-text-secondary">How witnesses work:</p>
                <p>A witness can confirm the result if there&apos;s a dispute. Share the witness code with them after creating.</p>
                <p>If both sides dispute, the witness decides — their call is final.</p>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-muted space-y-1.5">
            <p className="font-semibold text-text-secondary">How it works:</p>
            <p>1. You create the challenge — you&apos;re automatically on <strong className="text-blue-400">Team A</strong></p>
            <p>2. Share the invite code with your opponent(s)</p>
            <p>3. After the game, hit <strong className="text-win">Verify Result</strong> — winner is auto-detected</p>
            <p>4. No game link? Submit proof manually and the loser accepts</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover py-4 text-sm font-black text-white shadow-red-glow hover:shadow-none transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Creating…' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  )
}
