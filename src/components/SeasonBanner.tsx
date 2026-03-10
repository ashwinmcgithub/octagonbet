'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import { Bell, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SPORT_META } from './SportEventCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Announcement {
  id: string
  sport: string
  title: string
  description: string | null
  startsAt: string
  bettingOpensAt: string | null
  active: boolean
}

function useCountdown(targetISO: string) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function calc() {
      const diff = new Date(targetISO).getTime() - Date.now()
      if (diff <= 0) { setLabel('Started!'); setUrgent(false); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) { setLabel(`${d}d ${h}h`); setUrgent(d < 3) }
      else if (h > 0) { setLabel(`${h}h ${m}m`); setUrgent(true) }
      else { setLabel(`${m}m`); setUrgent(true) }
    }
    calc()
    const t = setInterval(calc, 60000)
    return () => clearInterval(t)
  }, [targetISO])

  return { label, urgent }
}

export function BannerCard({ ann }: { ann: Announcement }) {
  const meta = SPORT_META[ann.sport] ?? SPORT_META.mma
  const startsAt = new Date(ann.startsAt)
  const bettingOpensAt = ann.bettingOpensAt ? new Date(ann.bettingOpensAt) : null
  const now = new Date()

  const bettingOpen = bettingOpensAt ? bettingOpensAt <= now : startsAt <= now
  const started = startsAt <= now

  const { label: countdown, urgent } = useCountdown(
    bettingOpen ? ann.startsAt : (ann.bettingOpensAt ?? ann.startsAt)
  )

  const istDate = startsAt.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const istTime = startsAt.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className={cn(
      'relative shrink-0 w-72 rounded-2xl border overflow-hidden',
      'bg-gradient-to-br from-surface to-surface-2',
      started ? 'border-live/40' : urgent ? 'border-amber-500/40' : meta.border,
    )}>
      {/* Glow strip at top */}
      <div className={cn(
        'h-1 w-full',
        started ? 'bg-live' : urgent ? 'bg-amber-500' : meta.color.replace('text-', 'bg-').split(' ')[0]
      )} />

      <div className="p-4 space-y-3">
        {/* Sport badge + status */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
            meta.bg, meta.border, meta.color
          )}>
            <span>{meta.emoji}</span>
            {ann.sport}
          </span>

          {started ? (
            <span className="flex items-center gap-1 text-xs font-bold text-live">
              <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" /> Live
            </span>
          ) : bettingOpen ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-win bg-win/10 rounded-full px-2 py-0.5">
              <Zap className="h-2.5 w-2.5" /> Bet Now
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
              <Bell className="h-2.5 w-2.5" /> Coming Soon
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="font-black text-text-primary text-base leading-tight">{ann.title}</h3>
          {ann.description && (
            <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{ann.description}</p>
          )}
        </div>

        {/* Date/time */}
        <div className="rounded-xl border border-border bg-background px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Starts</span>
            <span className="text-xs font-bold text-text-primary">{istDate} · {istTime} IST</span>
          </div>

          {!started && (
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-[10px] text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {bettingOpen ? 'Season starts in' : 'Betting opens in'}
              </span>
              <span className={cn(
                'text-sm font-black tabular-nums',
                urgent ? 'text-amber-400' : 'text-text-primary'
              )}>
                {countdown}
              </span>
            </div>
          )}

          {!bettingOpen && bettingOpensAt && (
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Betting opens</span>
              <span className="text-[11px] font-semibold text-win">
                {bettingOpensAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        {bettingOpen && !started && (
          <p className="text-[10px] text-center text-win font-semibold">
            🟢 Betting is open — place your prediction now!
          </p>
        )}
        {!bettingOpen && (
          <p className="text-[10px] text-center text-muted">
            Come back when betting opens to place your prediction
          </p>
        )}
      </div>
    </div>
  )
}

export default function SeasonBanner() {
  const { data: announcements } = useSWR<Announcement[]>('/api/announcements', fetcher)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  useEffect(() => {
    checkScroll()
  }, [announcements])

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
    setTimeout(checkScroll, 350)
  }

  if (!announcements || announcements.length === 0) return null

  return (
    <div className="border-b border-border bg-surface-2/50">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-black text-text-primary uppercase tracking-wider">Upcoming Seasons</span>
            <span className="text-[10px] text-muted font-semibold">— predict before they start</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-text-primary disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-text-primary disabled:opacity-30 transition-all"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable card row */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
        >
          {announcements.map(ann => (
            <BannerCard key={ann.id} ann={ann} />
          ))}
        </div>
      </div>
    </div>
  )
}
