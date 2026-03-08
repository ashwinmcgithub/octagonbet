'use client'

import { useState } from 'react'
import { Clock, Zap, Trophy, Users } from 'lucide-react'
import { formatOdds, timeUntilFight } from '@/lib/utils'
import { cn } from '@/lib/utils'
import BettingModal from './BettingModal'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Fight {
  id: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  homeOdds: number | null
  awayOdds: number | null
  status: string
  winner: string | null
  _count?: { bets: number }
}

export default function FightCard({ fight, onBetPlaced }: { fight: Fight; onBetPlaced?: () => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFighter, setSelectedFighter] = useState<'home' | 'away' | null>(null)

  const isLive = fight.status === 'live'
  const isCompleted = fight.status === 'completed'
  const homeWon = isCompleted && fight.winner === 'home'
  const awayWon = isCompleted && fight.winner === 'away'

  function handlePickFighter(side: 'home' | 'away') {
    if (!session) {
      router.push('/login')
      return
    }
    if (isCompleted) return
    setSelectedFighter(side)
    setModalOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'group relative rounded-2xl border bg-card-gradient transition-all duration-300',
          isLive
            ? 'border-live/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : isCompleted
            ? 'border-border opacity-75'
            : 'border-border hover:border-primary/40 hover:shadow-red-sm cursor-pointer'
        )}
      >
        {/* Status badge */}
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

        {/* Fighters */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-5 pb-5">
          {/* Home fighter */}
          <button
            onClick={() => handlePickFighter('home')}
            disabled={isCompleted}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl p-4 transition-all',
              isCompleted
                ? homeWon
                  ? 'bg-win/10 border border-win/30'
                  : 'bg-surface-2 border border-border'
                : 'bg-surface-2 border border-border hover:border-primary hover:bg-primary/5 active:scale-95'
            )}
          >
            <div
              className={cn(
                'h-16 w-16 rounded-full flex items-center justify-center text-2xl font-black border-2',
                homeWon
                  ? 'bg-win/20 border-win/40 text-win'
                  : 'bg-surface border-border-bright text-text-primary'
              )}
            >
              {fight.homeTeam.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary leading-tight">{fight.homeTeam}</p>
              {homeWon && (
                <p className="text-xs font-bold text-win mt-1">WINNER</p>
              )}
            </div>
            <div
              className={cn(
                'w-full rounded-lg py-2 text-center font-black text-lg',
                homeWon
                  ? 'bg-win/20 text-win'
                  : isCompleted
                  ? 'bg-surface text-muted'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              {fight.homeOdds ? formatOdds(fight.homeOdds) : '—'}
            </div>
          </button>

          {/* VS */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border">
              <span className="text-xs font-black text-muted">VS</span>
            </div>
            {isLive && (
              <Zap className="h-4 w-4 text-live mt-2 animate-pulse-red" />
            )}
          </div>

          {/* Away fighter */}
          <button
            onClick={() => handlePickFighter('away')}
            disabled={isCompleted}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl p-4 transition-all',
              isCompleted
                ? awayWon
                  ? 'bg-win/10 border border-win/30'
                  : 'bg-surface-2 border border-border'
                : 'bg-surface-2 border border-border hover:border-primary hover:bg-primary/5 active:scale-95'
            )}
          >
            <div
              className={cn(
                'h-16 w-16 rounded-full flex items-center justify-center text-2xl font-black border-2',
                awayWon
                  ? 'bg-win/20 border-win/40 text-win'
                  : 'bg-surface border-border-bright text-text-primary'
              )}
            >
              {fight.awayTeam.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary leading-tight">{fight.awayTeam}</p>
              {awayWon && (
                <p className="text-xs font-bold text-win mt-1">WINNER</p>
              )}
            </div>
            <div
              className={cn(
                'w-full rounded-lg py-2 text-center font-black text-lg',
                awayWon
                  ? 'bg-win/20 text-win'
                  : isCompleted
                  ? 'bg-surface text-muted'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              {fight.awayOdds ? formatOdds(fight.awayOdds) : '—'}
            </div>
          </button>
        </div>

        {/* Hover overlay for non-completed */}
        {!isCompleted && !isLive && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {selectedFighter && (
        <BettingModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedFighter(null) }}
          fight={fight}
          selectedFighter={selectedFighter}
          onSuccess={() => {
            setModalOpen(false)
            setSelectedFighter(null)
            onBetPlaced?.()
          }}
        />
      )}
    </>
  )
}
