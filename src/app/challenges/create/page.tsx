'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Coins, Gift } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function CreateChallengePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prizeType, setPrizeType] = useState<'money' | 'item'>('money')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [prizeItem, setPrizeItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

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
            <label className="text-xs font-bold text-muted uppercase tracking-wider">What's the challenge?</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Who scores first in our game"
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
              <button
                type="button"
                onClick={() => setPrizeType('money')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                  prizeType === 'money' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-border-bright'
                )}
              >
                <Coins className={cn('h-6 w-6', prizeType === 'money' ? 'text-primary' : 'text-muted')} />
                <div className="text-center">
                  <p className={cn('text-sm font-bold', prizeType === 'money' ? 'text-primary' : 'text-text-secondary')}>FightCoins</p>
                  <p className="text-[10px] text-muted">Platform holds the money</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPrizeType('item')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
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
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={prizeAmount}
                  onChange={(e) => setPrizeAmount(e.target.value)}
                  placeholder="100"
                  required
                  className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-muted">Each person on both teams puts in this amount. Winner's team splits the full pot.</p>
              {prizeAmount && (
                <p className="text-[11px] text-win font-semibold">Your balance: FC {(session.user.balance ?? 0).toLocaleString()} → FC {((session.user.balance ?? 0) - parseFloat(prizeAmount || '0')).toLocaleString()} after locking</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">What's the prize?</label>
              <input
                value={prizeItem}
                onChange={(e) => setPrizeItem(e.target.value)}
                placeholder="e.g. 1kg Biryani from Behrouz, Pizza, Dinner"
                required
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-amber-500/50 focus:outline-none"
              />
              <p className="text-[11px] text-muted">No money involved — loser owes the winner this item.</p>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-muted space-y-1.5">
            <p className="font-semibold text-text-secondary">How it works:</p>
            <p>1. You create the challenge — you&apos;re automatically on <strong className="text-blue-400">Team A</strong></p>
            <p>2. Share the invite code with your opponent(s)</p>
            <p>3. When someone wins, they submit proof</p>
            <p>4. The losing side accepts — prize is released / owed</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover py-4 text-sm font-black text-white shadow-red-glow hover:shadow-none transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Creating…' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  )
}
