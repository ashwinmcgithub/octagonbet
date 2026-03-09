'use client'

import { useEffect, useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatOdds, formatDateOrdinalIST, formatTimeIST } from '@/lib/utils'
import { getFighterImageUrl, getFighterFallbackDataUri } from '@/lib/fighter-images'
import { getFighterStats, FighterStats, FightResult } from '@/lib/fighter-stats'

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
}

interface Props {
  isOpen: boolean
  onClose: () => void
  fight: Fight
  onBetHome: () => void
  onBetAway: () => void
}

// ── Win breakdown badge pills ──────────────────────────────────────────────
function WinBadges({ stats }: { stats: FighterStats }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
      {stats.winsKO > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary">
          {stats.winsKO} KO
        </span>
      )}
      {stats.winsSUB > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
          {stats.winsSUB} SUB
        </span>
      )}
      {stats.winsDEC > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/25 px-2.5 py-0.5 text-[10px] font-bold text-sky-400">
          {stats.winsDEC} DEC
        </span>
      )}
    </div>
  )
}

// ── Single past-fight card ─────────────────────────────────────────────────
function PastFightRow({ fight }: { fight: FightResult }) {
  const isWin = fight.result === 'W'
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black',
          isWin ? 'bg-win/20 text-win' : 'bg-primary/20 text-primary'
        )}
      >
        {fight.result}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-text-primary">vs {fight.opp}</p>
        <p className="text-[10px] text-muted">
          {fight.method} · Rd {fight.round}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-muted">{fight.date}</span>
    </div>
  )
}

// ── Fighter column (photo + name + record + badges + odds button) ──────────
function FighterColumn({
  name,
  odds,
  align,
}: {
  name: string
  odds: number | null
  align: 'left' | 'right'
}) {
  const stats = getFighterStats(name)
  const isLeft = align === 'left'

  return (
    <div className={cn('flex flex-col gap-2', isLeft ? 'items-start' : 'items-end')}>
      {/* Photo */}
      <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border-bright shrink-0">
        <img
          src={getFighterImageUrl(name)}
          alt={name}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = getFighterFallbackDataUri(name)
          }}
        />
      </div>

      {/* Name */}
      <p className={cn('text-sm font-black text-text-primary leading-tight', isLeft ? 'text-left' : 'text-right')}>
        {name}
      </p>

      {/* Record */}
      {stats && (
        <p className="text-xs font-semibold text-muted">{stats.record}</p>
      )}

      {/* Win breakdown badges */}
      {stats && (
        <div className={cn('flex flex-wrap gap-1.5', isLeft ? 'justify-start' : 'justify-end')}>
          {stats.winsKO > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
              {stats.winsKO} KO
            </span>
          )}
          {stats.winsSUB > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              {stats.winsSUB} SUB
            </span>
          )}
          {stats.winsDEC > 0 && (
            <span className="inline-flex items-center rounded-full bg-sky-500/15 border border-sky-500/25 px-2 py-0.5 text-[10px] font-bold text-sky-400">
              {stats.winsDEC} DEC
            </span>
          )}
        </div>
      )}

      {/* Odds pill */}
      {odds !== null && (
        <div className={cn(
          'inline-flex items-center rounded-full border px-3 py-1',
          odds > 0 ? 'bg-win/10 border-win/30' : 'bg-primary/10 border-primary/30'
        )}>
          <span className={cn('text-sm font-black', odds > 0 ? 'text-win' : 'text-primary')}>
            {formatOdds(odds)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Last 2 fights side panel for one fighter ──────────────────────────────
function LastFightsPanel({ name, align }: { name: string; align: 'left' | 'right' }) {
  const stats = getFighterStats(name)
  if (!stats || stats.lastFights.length === 0) return null

  return (
    <div className="space-y-2">
      <p className={cn('text-[10px] font-bold uppercase tracking-widest text-muted', align === 'right' ? 'text-right' : 'text-left')}>
        {name.split(' ')[0]}&apos;s Last Fights
      </p>
      {stats.lastFights.map((f, i) => (
        <PastFightRow key={i} fight={f} />
      ))}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function FightDetailModal({ isOpen, onClose, fight, onBetHome, onBetAway }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while open; reset on close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      scrollRef.current?.scrollTo(0, 0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isCompleted = fight.status === 'completed'

  // Derive a short weight class / bout type hint from the event name
  const eventLabel = fight.eventName ?? 'UFC Event'

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — slides up from bottom on mobile, centered on desktop */}
      <div
        ref={scrollRef}
        className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-surface shadow-[0_-8px_64px_rgba(0,0,0,0.7)] animate-slide-up"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* ── Header ── */}
        <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 pt-5 pb-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 border border-border text-muted hover:text-text-primary hover:border-primary/40 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="pr-10 text-[10px] font-bold uppercase tracking-widest text-muted">
            {eventLabel}
          </p>
          <h2 className="mt-0.5 text-base font-black text-text-primary leading-tight">
            {fight.homeTeam}
            <span className="mx-2 font-normal text-muted">vs</span>
            {fight.awayTeam}
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            {formatDateOrdinalIST(fight.commenceTime)}
            <span className="mx-1.5 text-border">·</span>
            {formatTimeIST(fight.commenceTime)}
          </p>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* ── Fighter Comparison ── */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
            <FighterColumn name={fight.homeTeam} odds={fight.homeOdds} align="left" />

            {/* Center VS divider */}
            <div className="flex flex-col items-center justify-start pt-10 gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
                <span className="text-[10px] font-black text-muted">VS</span>
              </div>
            </div>

            <FighterColumn name={fight.awayTeam} odds={fight.awayOdds} align="right" />
          </div>

          {/* ── Last 2 Fights — stacked, full width ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Recent Form</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LastFightsPanel name={fight.homeTeam} align="left" />
              <LastFightsPanel name={fight.awayTeam} align="right" />
            </div>
          </div>

          {/* ── Bet CTAs ── */}
          {!isCompleted && (
            <div className="grid grid-cols-2 gap-3 pb-safe">
              <button
                onClick={onBetHome}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover py-3.5 text-sm font-black text-white shadow-red-glow hover:shadow-none transition-all active:scale-95"
              >
                Bet {fight.homeTeam.split(' ').slice(-1)[0]}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={onBetAway}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 py-3.5 text-sm font-black text-primary transition-all active:scale-95"
              >
                Bet {fight.awayTeam.split(' ').slice(-1)[0]}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="rounded-xl border border-border bg-surface-2 py-3 text-center text-xs text-muted">
              This fight has concluded — no bets accepted.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
