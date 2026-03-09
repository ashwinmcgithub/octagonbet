'use client'

import { useState } from 'react'
import { Calendar, Clock, Zap, Trophy, Users, ChevronRight } from 'lucide-react'
import { formatDateOrdinalIST, formatOdds, formatTimeIST, timeUntilFight } from '@/lib/utils'
import { cn } from '@/lib/utils'
import BettingModal from './BettingModal'
import FightDetailModal from './FightDetailModal'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getFighterFallbackDataUri, getFighterImageUrl } from '@/lib/fighter-images'

interface Fight {
  id: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  homeOdds: number | null
  awayOdds: number | null
  status: string
  winner: string | null
  eventName: string | null
  _count?: { bets: number }
}

export default function FightCard({ fight, onBetPlaced }: { fight: Fight; onBetPlaced?: () => void }) {
  const { data: session } = useSession()
  const router = useRouter()

  // Betting modal state
  const [bettingOpen, setBettingOpen] = useState(false)
  const [selectedFighter, setSelectedFighter] = useState<'home' | 'away' | null>(null)

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false)

  const isLive = fight.status === 'live'
  const isCompleted = fight.status === 'completed'
  const homeWon = isCompleted && fight.winner === 'home'
  const awayWon = isCompleted && fight.winner === 'away'

  function openBetting(side: 'home' | 'away') {
    if (!session) { router.push('/login'); return }
    if (isCompleted) return
    setDetailOpen(false)
    setSelectedFighter(side)
    setBettingOpen(true)
  }

  function handlePickFighter(e: React.MouseEvent, side: 'home' | 'away') {
    e.stopPropagation()
    openBetting(side)
  }

  function handleCardClick() {
    // Don't open detail modal for completed fights (optional — remove if you want it)
    setDetailOpen(true)
  }

  function handleViewDetails(e: React.MouseEvent) {
    e.stopPropagation()
    setDetailOpen(true)
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          'group relative rounded-2xl border bg-card-gradient transition-all duration-300 overflow-hidden',
          isLive
            ? 'border-live/40 shadow-[0_0_24px_rgba(245,158,11,0.18)] cursor-pointer'
            : isCompleted
            ? 'border-border opacity-75 cursor-pointer'
            : 'border-border hover:border-primary/40 hover:shadow-red-sm cursor-pointer'
        )}
      >
        {/* ── Top bar: status + bet count ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-live">
              <span className="h-2 w-2 rounded-full bg-live animate-pulse-red" />
              LIVE NOW
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Trophy className="h-3.5 w-3.5" />
              COMPLETED
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              {timeUntilFight(fight.commenceTime)}
            </span>
          )}

          {fight._count && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Users className="h-3.5 w-3.5" />
              {fight._count.bets} bets
            </span>
          )}
        </div>

        {/* ── Event name ── */}
        {fight.eventName && (
          <div className="px-5 pb-1">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
              {fight.eventName}
            </span>
          </div>
        )}

        {/* ── Date / Time badge (IST) — prominent pill ── */}
        {!isLive && (
          <div className="px-5 pb-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-text-primary">
                {formatDateOrdinalIST(fight.commenceTime)}
              </span>
              <span className="text-[10px] text-muted border-l border-border pl-2">
                {formatTimeIST(fight.commenceTime)}
              </span>
            </div>
          </div>
        )}

        {/* ── Fighters ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 pb-4">
          {/* Home fighter */}
          <button
            onClick={(e) => handlePickFighter(e, 'home')}
            disabled={isCompleted}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-3 transition-all',
              isCompleted
                ? homeWon
                  ? 'bg-win/10 border border-win/30'
                  : 'bg-surface-2 border border-border'
                : 'bg-surface-2 border border-border hover:border-primary hover:bg-primary/5 active:scale-95'
            )}
          >
            {/* Fighter photo */}
            <div
              className={cn(
                'h-20 w-20 rounded-full overflow-hidden border-2 shrink-0',
                homeWon ? 'border-win/50' : 'border-border-bright'
              )}
            >
              <img
                src={getFighterImageUrl(fight.homeTeam)}
                alt={fight.homeTeam}
                className="h-full w-full object-cover object-top"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = getFighterFallbackDataUri(fight.homeTeam) }}
              />
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-text-primary leading-tight">{fight.homeTeam}</p>
              {homeWon && <p className="text-[10px] font-black text-win mt-0.5">WINNER</p>}
            </div>

            <div
              className={cn(
                'w-full rounded-lg py-1.5 text-center font-black text-base',
                homeWon
                  ? 'bg-win/20 text-win'
                  : isCompleted
                  ? 'bg-surface text-muted'
                  : fight.homeOdds && fight.homeOdds > 0
                  ? 'bg-win/10 text-win group-hover:bg-win/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              {fight.homeOdds ? formatOdds(fight.homeOdds) : '—'}
            </div>
          </button>

          {/* VS */}
          <div className="flex flex-col items-center justify-center gap-2 pt-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border">
              <span className="text-[10px] font-black text-muted">VS</span>
            </div>
            {isLive && <Zap className="h-4 w-4 text-live animate-pulse-red" />}
          </div>

          {/* Away fighter */}
          <button
            onClick={(e) => handlePickFighter(e, 'away')}
            disabled={isCompleted}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-3 transition-all',
              isCompleted
                ? awayWon
                  ? 'bg-win/10 border border-win/30'
                  : 'bg-surface-2 border border-border'
                : 'bg-surface-2 border border-border hover:border-primary hover:bg-primary/5 active:scale-95'
            )}
          >
            {/* Fighter photo */}
            <div
              className={cn(
                'h-20 w-20 rounded-full overflow-hidden border-2 shrink-0',
                awayWon ? 'border-win/50' : 'border-border-bright'
              )}
            >
              <img
                src={getFighterImageUrl(fight.awayTeam)}
                alt={fight.awayTeam}
                className="h-full w-full object-cover object-top"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = getFighterFallbackDataUri(fight.awayTeam) }}
              />
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-text-primary leading-tight">{fight.awayTeam}</p>
              {awayWon && <p className="text-[10px] font-black text-win mt-0.5">WINNER</p>}
            </div>

            <div
              className={cn(
                'w-full rounded-lg py-1.5 text-center font-black text-base',
                awayWon
                  ? 'bg-win/20 text-win'
                  : isCompleted
                  ? 'bg-surface text-muted'
                  : fight.awayOdds && fight.awayOdds > 0
                  ? 'bg-win/10 text-win group-hover:bg-win/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              {fight.awayOdds ? formatOdds(fight.awayOdds) : '—'}
            </div>
          </button>
        </div>

        {/* ── View Details link ── */}
        <div className="px-5 pb-4 flex justify-center">
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-primary transition-colors"
          >
            View Details
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Hover accent */}
        {!isCompleted && !isLive && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Detail Modal */}
      <FightDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        fight={fight}
        onBetHome={() => openBetting('home')}
        onBetAway={() => openBetting('away')}
      />

      {/* Betting Modal */}
      {selectedFighter && (
        <BettingModal
          isOpen={bettingOpen}
          onClose={() => { setBettingOpen(false); setSelectedFighter(null) }}
          fight={fight}
          selectedFighter={selectedFighter}
          onSuccess={() => {
            setBettingOpen(false)
            setSelectedFighter(null)
            onBetPlaced?.()
          }}
        />
      )}
    </>
  )
}
