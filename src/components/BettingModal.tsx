'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { X, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import { formatOdds, calculatePayout, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Fight {
  id: string
  homeTeam: string
  awayTeam: string
  homeOdds: number | null
  awayOdds: number | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  fight: Fight
  selectedFighter: 'home' | 'away'
  onSuccess: () => void
}

const QUICK_AMOUNTS = [50, 100, 250, 500]

export default function BettingModal({ isOpen, onClose, fight, selectedFighter, onSuccess }: Props) {
  const { data: session, update } = useSession()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const fighterName = selectedFighter === 'home' ? fight.homeTeam : fight.awayTeam
  const opposingName = selectedFighter === 'home' ? fight.awayTeam : fight.homeTeam
  const odds = selectedFighter === 'home' ? fight.homeOdds : fight.awayOdds
  const betAmount = parseFloat(amount) || 0
  const potentialPayout = odds && betAmount > 0 ? calculatePayout(betAmount, odds) : 0
  const profit = potentialPayout - betAmount

  useEffect(() => {
    if (!isOpen) {
      setAmount('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleBet() {
    setError('')
    if (!betAmount || betAmount <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (betAmount > (session?.user.balance ?? 0)) {
      setError('Insufficient FightCoins')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fightId: fight.id, fighter: selectedFighter, amount: betAmount }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(true)
      await update() // Refresh session balance
      setTimeout(() => onSuccess(), 1200)
    } catch (err: any) {
      setError(err.message || 'Failed to place bet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/20 to-transparent px-6 py-5 border-b border-border">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Place Your Bet</p>
            <h2 className="text-xl font-black text-text-primary">{fighterName}</h2>
            <p className="text-sm text-muted">vs {opposingName}</p>
            {odds && (
              <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                <span className="text-xs text-muted">Odds</span>
                <span className="text-sm font-black text-primary">{formatOdds(odds)}</span>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Your balance</span>
              <span className="font-bold text-text-primary">
                FC {formatCurrency(session?.user.balance ?? 0)}
              </span>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Bet Amount (FC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                  FC
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 py-3.5 text-lg font-black text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      'rounded-lg py-2 text-xs font-bold transition-all border',
                      amount === String(q)
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface-2 border-border text-muted hover:border-primary/50 hover:text-text-primary'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* All-in */}
              <button
                onClick={() => setAmount(String(Math.floor(session?.user.balance ?? 0)))}
                className="mt-2 w-full text-xs text-primary hover:text-primary-glow font-medium transition-colors"
              >
                Bet all FC {formatCurrency(session?.user.balance ?? 0)}
              </button>
            </div>

            {/* Payout preview */}
            {betAmount > 0 && odds && (
              <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Stake</span>
                  <span className="text-text-primary font-medium">FC {formatCurrency(betAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Profit
                  </span>
                  <span className="text-win font-medium">+FC {formatCurrency(profit)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-sm font-bold text-text-primary">Total Payout</span>
                  <span className="font-black text-win text-base">FC {formatCurrency(potentialPayout)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-win/10 border border-win/20 px-4 py-3">
                <Zap className="h-4 w-4 text-win" />
                <p className="text-sm text-win font-medium">Bet placed! Good luck!</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleBet}
              disabled={loading || success || !betAmount || betAmount <= 0}
              className={cn(
                'w-full rounded-xl py-4 text-base font-black transition-all',
                success
                  ? 'bg-win text-white'
                  : 'bg-primary hover:bg-primary-hover text-white shadow-red-glow hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              )}
            >
              {loading ? 'Placing Bet...' : success ? 'Bet Placed!' : `Place Bet on ${fighterName}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
