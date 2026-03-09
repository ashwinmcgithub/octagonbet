'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, RefreshCw, Trophy } from 'lucide-react'
import FightCard from '@/components/FightCard'
import SportEventCard, { SPORT_META, type SportEvent } from '@/components/SportEventCard'
import { cn } from '@/lib/utils'

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

type StatusFilter = 'upcoming' | 'live' | 'all' | 'completed'

const SPORT_TABS = [
  { key: 'all',       label: 'All Sports', emoji: '🏆' },
  { key: 'cricket',   label: 'Cricket',    emoji: '🏏' },
  { key: 'football',  label: 'Football',   emoji: '⚽' },
  { key: 'mma',       label: 'MMA / UFC',  emoji: '🥋' },
  { key: 'kabaddi',   label: 'Kabaddi',    emoji: '🤼' },
  { key: 'f1',        label: 'Formula 1',  emoji: '🏎️' },
  { key: 'tennis',    label: 'Tennis',     emoji: '🎾' },
  { key: 'badminton', label: 'Badminton',  emoji: '🏸' },
  { key: 'chess',     label: 'Chess',      emoji: '♟️' },
  { key: 'nba',       label: 'NBA',        emoji: '🏀' },
  { key: 'boxing',    label: 'Boxing',     emoji: '🥊' },
  { key: 'wwe',       label: 'WWE',        emoji: '💪' },
]

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, completed: 2 }

export default function HomePage() {
  const [sportTab, setSportTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')

  const [fights, setFights] = useState<Fight[]>([])
  const [events, setEvents] = useState<SportEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const isMMA = sportTab === 'mma' || sportTab === 'all'
      const isNonMMA = sportTab !== 'mma'

      const promises: Promise<void>[] = []

      if (isMMA) {
        promises.push(
          fetch(`/api/fights?status=${statusFilter}`).then(r => r.json()).then(data => {
            const sorted = [...(data as Fight[])].sort((a, b) =>
              (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
            )
            setFights(sorted)
          }).catch(() => setFights([]))
        )
      } else {
        setFights([])
      }

      if (isNonMMA) {
        const sport = sportTab === 'all' ? 'all' : sportTab
        promises.push(
          fetch(`/api/events?sport=${sport}&status=${statusFilter}`).then(r => r.json()).then(data => {
            setEvents(data as SportEvent[])
          }).catch(() => setEvents([]))
        )
      } else {
        setEvents([])
      }

      await Promise.all(promises)
    } finally {
      setLoading(false)
    }
  }, [sportTab, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  async function syncOdds() {
    setSyncing(true)
    try {
      await fetch('/api/odds/sync', { method: 'POST' })
      await loadData()
    } finally { setSyncing(false) }
  }

  const liveCount = fights.filter(f => f.status === 'live').length + events.filter(e => e.status === 'live').length
  const totalItems = fights.length + events.length

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="absolute inset-0 bg-red-glow pointer-events-none opacity-40" />
        <div className="mx-auto max-w-7xl px-4 py-10 text-center">
          {liveCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-live/10 border border-live/30 rounded-full px-4 py-1.5 mb-4">
              <span className="h-2 w-2 rounded-full bg-live animate-pulse" />
              <span className="text-sm font-bold text-live uppercase tracking-wide">{liveCount} Live Now</span>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black text-text-primary leading-tight mb-2">
            Bet on Every Sport.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">
              Win Big.
            </span>
          </h1>
          <p className="text-base text-muted max-w-lg mx-auto">
            Cricket · Football · Kabaddi · F1 · Badminton · Tennis · Chess · MMA & more
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap text-xs text-muted">
            <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{totalItems} events</span>
            <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />FightCoins only · No real money</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Sport tab bar — horizontally scrollable */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {SPORT_TABS.map((tab) => {
            const meta = SPORT_META[tab.key]
            const isActive = sportTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSportTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition-all',
                  isActive
                    ? tab.key === 'all'
                      ? 'border-primary bg-primary/15 text-primary'
                      : `${meta?.border ?? 'border-primary'} ${meta?.bg ?? 'bg-primary/10'} ${meta?.color ?? 'text-primary'}`
                    : 'border-border bg-surface text-text-secondary hover:border-border-bright hover:text-text-primary'
                )}
              >
                <span>{tab.emoji}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Status filters + sync */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {(['live', 'upcoming', 'all', 'completed'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  statusFilter === f ? 'bg-primary text-white' : 'text-muted hover:text-text-primary'
                )}
              >
                {f === 'live' ? (
                  <span className="flex items-center gap-1">
                    <span className={cn('h-1.5 w-1.5 rounded-full', liveCount > 0 ? 'bg-live animate-pulse' : 'bg-muted')} />
                    Live{liveCount > 0 ? ` (${liveCount})` : ''}
                  </span>
                ) : f}
              </button>
            ))}
          </div>
          <button
            onClick={syncOdds}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-muted hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing…' : 'Sync Odds'}
          </button>
        </div>

        {/* WWE disclaimer */}
        {(sportTab === 'wwe' || sportTab === 'all') && events.some(e => e.sport === 'wwe') && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-400">
            <strong>Entertainment Prediction:</strong> WWE outcomes are scripted storylines. These are prediction games, not sports betting.
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 rounded-2xl bg-surface animate-pulse" />)}
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{SPORT_TABS.find(t => t.key === sportTab)?.emoji ?? '🏆'}</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">No {sportTab === 'all' ? '' : sportTab} events yet</h3>
            <p className="text-muted text-sm max-w-xs mx-auto">
              {sportTab === 'mma' ? "Click 'Sync Odds' to fetch the latest UFC fights." :
               sportTab === 'cricket' || sportTab === 'football'
                ? 'Ask admin to sync events from the API, or add them manually in the admin panel.'
                : 'Ask admin to add events for this sport.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* MMA / UFC fights */}
            {fights.length > 0 && (
              <section>
                {(sportTab === 'all') && (
                  <h3 className="text-sm font-black text-text-primary mb-3 flex items-center gap-2">
                    <span>🥋</span> MMA / UFC
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {fights.map(fight => (
                    <FightCard key={fight.id} fight={fight} onBetPlaced={loadData} />
                  ))}
                </div>
              </section>
            )}

            {/* Sport events grouped by sport */}
            {(() => {
              const grouped: Record<string, SportEvent[]> = {}
              for (const e of events) {
                if (!grouped[e.sport]) grouped[e.sport] = []
                grouped[e.sport].push(e)
              }
              return Object.entries(grouped).map(([s, evs]) => {
                const meta = SPORT_META[s] ?? SPORT_META.mma
                const tab = SPORT_TABS.find(t => t.key === s)
                return (
                  <section key={s}>
                    {sportTab === 'all' && (
                      <h3 className="text-sm font-black text-text-primary mb-3 flex items-center gap-2">
                        <span>{tab?.emoji ?? meta.emoji}</span>
                        {tab?.label ?? s}
                        <span className="text-xs font-normal text-muted">{evs.length} event{evs.length !== 1 ? 's' : ''}</span>
                      </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {evs.map(ev => <SportEventCard key={ev.id} event={ev} onBetPlaced={loadData} />)}
                    </div>
                  </section>
                )
              })
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
