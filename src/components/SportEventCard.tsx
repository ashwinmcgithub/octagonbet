'use client'

import { useState } from 'react'
import { Clock, Zap, Trophy, Users, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export const SPORT_META: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  cricket:   { emoji: '🏏', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  football:  { emoji: '⚽', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  kabaddi:   { emoji: '🤼', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  f1:        { emoji: '🏎️', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  tennis:    { emoji: '🎾', color: 'text-lime-400',   bg: 'bg-lime-500/10',   border: 'border-lime-500/30' },
  badminton: { emoji: '🏸', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  chess:     { emoji: '♟️', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  nba:       { emoji: '🏀', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  boxing:    { emoji: '🥊', color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30' },
  wwe:       { emoji: '💪', color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30' },
  mma:       { emoji: '🥋', color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30' },
}

interface MarketOption { key: string; label: string; odds: number }
interface Market {
  id: string
  marketType: string
  label: string
  status: string
  options: MarketOption[]
  resultKey: string | null
  _count?: { bets: number }
}
export interface SportEvent {
  id: string
  sport: string
  league: string
  eventName: string | null
  homeTeam: string
  awayTeam: string
  commenceTime: string
  status: string
  result: string | null
  markets: Market[]
}

function formatIST(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  })
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Starting soon'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 48) return `${Math.floor(h / 24)}d away`
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

export default function SportEventCard({ event, onBetPlaced }: { event: SportEvent; onBetPlaced?: () => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeBet, setActiveBet] = useState<{ marketId: string; optionKey: string; label: string; odds: number } | null>(null)
  const [stake, setStake] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const meta = SPORT_META[event.sport] ?? SPORT_META.mma
  const isLive = event.status === 'live'
  const isCompleted = event.status === 'completed'

  function selectOption(marketId: string, opt: MarketOption) {
    if (!session) { router.push('/login'); return }
    if (isCompleted) return
    setError(''); setSuccess('')
    setActiveBet({ marketId, optionKey: opt.key, label: opt.label, odds: opt.odds })
  }

  async function placeBet() {
    if (!activeBet) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/events/${event.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: activeBet.marketId, optionKey: activeBet.optionKey, amount: parseFloat(stake) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(`Bet placed! Potential payout: FC ${formatCurrency(data.potentialPayout)}`)
      setActiveBet(null)
      onBetPlaced?.()
    } finally { setLoading(false) }
  }

  return (
    <div className={cn(
      'rounded-2xl border bg-surface overflow-hidden transition-all',
      isLive ? 'border-live/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]' : 'border-border hover:border-primary/30',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide', meta.bg, meta.border, meta.color)}>
            <span>{meta.emoji}</span>
            {event.sport}
          </span>
          <span className="text-[10px] font-semibold text-muted">{event.league}</span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 text-xs font-bold text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="flex items-center gap-1 text-xs text-muted"><Trophy className="h-3 w-3" />FT</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" />{timeUntil(event.commenceTime)}</span>
        )}
      </div>

      {/* Teams */}
      <div className="px-4 pb-3">
        {event.eventName && <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{event.eventName}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-text-primary text-sm flex-1 truncate">{event.homeTeam}</span>
          <span className="text-xs font-black text-muted px-2">vs</span>
          <span className="font-bold text-text-primary text-sm flex-1 text-right truncate">{event.awayTeam}</span>
        </div>
        {!isLive && !isCompleted && (
          <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />{formatIST(event.commenceTime)} IST
          </p>
        )}
      </div>

      {/* Markets */}
      <div className="border-t border-border px-4 py-3 space-y-3">
        {event.markets.length === 0 && (
          <p className="text-xs text-muted text-center py-2">No markets available</p>
        )}
        {event.markets.map((market) => {
          const opts = market.options as MarketOption[]
          const isSettled = market.status === 'settled'
          return (
            <div key={market.id}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{market.label}</p>
                {market._count && (
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    <Users className="h-2.5 w-2.5" />{market._count.bets}
                  </span>
                )}
              </div>
              <div className={cn('grid gap-1.5', opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                {opts.map((opt) => {
                  const isWinner = isSettled && market.resultKey === opt.key
                  const isLoser = isSettled && market.resultKey !== opt.key
                  const isSelected = activeBet?.marketId === market.id && activeBet.optionKey === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => selectOption(market.id, opt)}
                      disabled={isCompleted || isSettled}
                      className={cn(
                        'flex flex-col items-center rounded-xl border py-2 px-1 text-center transition-all',
                        isWinner ? 'border-win/40 bg-win/15 text-win' :
                        isLoser ? 'border-border bg-surface-2 text-muted opacity-50' :
                        isSelected ? 'border-primary bg-primary/15 text-primary' :
                        'border-border bg-surface-2 text-text-secondary hover:border-primary/50 hover:bg-primary/5 active:scale-95'
                      )}
                    >
                      <span className="text-[10px] leading-tight truncate w-full">{opt.label}</span>
                      <span className={cn('text-sm font-black mt-0.5', isWinner ? 'text-win' : isSelected ? 'text-primary' : 'text-text-primary')}>
                        {opt.odds.toFixed(2)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Inline bet form */}
        {activeBet && (
          <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-primary">Bet on {activeBet.label} @ {activeBet.odds.toFixed(2)}</p>
              <button onClick={() => setActiveBet(null)} className="text-muted hover:text-text-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">FC</span>
                <input
                  type="number" min="1" step="1"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>
              <button
                onClick={placeBet}
                disabled={loading || !stake || parseFloat(stake) < 1}
                className="rounded-lg bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-black text-white transition-colors disabled:opacity-50"
              >
                {loading ? '…' : 'Bet'}
              </button>
            </div>
            {parseFloat(stake) > 0 && (
              <p className="text-[10px] text-muted">
                Potential payout: <span className="font-bold text-win">FC {formatCurrency(parseFloat(stake) * activeBet.odds)}</span>
              </p>
            )}
            {error && <p className="text-xs text-primary">{error}</p>}
          </div>
        )}
        {success && <p className="text-xs text-win font-semibold text-center">{success}</p>}
      </div>
    </div>
  )
}
