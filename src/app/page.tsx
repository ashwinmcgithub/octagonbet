'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, TrendingUp, RefreshCw } from 'lucide-react'
import FightCard from '@/components/FightCard'
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

type Filter = 'all' | 'live' | 'upcoming' | 'completed'

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, completed: 2 }
const WEIGHT_CATEGORY_ORDER = [
  'Heavyweight',
  'Light Heavyweight',
  'Middleweight',
  'Welterweight',
  'Lightweight',
  'Featherweight',
  'Bantamweight',
  'Flyweight',
  "Women's Bantamweight",
  "Women's Flyweight",
  "Women's Strawweight",
  "Women's Atomweight",
] as const

function getWeightCategory(eventName: string | null): string {
  if (!eventName) return 'Other Fights'
  for (const category of WEIGHT_CATEGORY_ORDER) {
    if (eventName.toLowerCase().includes(category.toLowerCase())) {
      return category
    }
  }
  return 'Other Fights'
}

export default function HomePage() {
  const [fights, setFights] = useState<Fight[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadFights = useCallback(async () => {
    try {
      const res = await fetch(`/api/fights?status=${filter}`)
      const data = await res.json()
      // Sort: live first, then upcoming, then completed
      const sorted = [...data].sort(
        (a: Fight, b: Fight) =>
          (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
      )
      setFights(sorted)
    } catch (err) {
      console.error('Failed to load fights', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const syncOdds = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch('/api/odds/sync', { method: 'POST' })
      setLastSync(new Date())
      await loadFights()
    } catch (err) {
      console.error('Sync failed', err)
    } finally {
      setSyncing(false)
    }
  }, [loadFights])

  useEffect(() => {
    loadFights()
  }, [loadFights])

  useEffect(() => {
    syncOdds()
    const interval = setInterval(syncOdds, 120_000)
    return () => clearInterval(interval)
  }, [syncOdds])

  const liveCount = fights.filter((f) => f.status === 'live').length
  const upcomingCount = fights.filter((f) => f.status === 'upcoming').length

  const filtered =
    filter === 'all'
      ? fights
      : fights.filter((f) => f.status === filter)

  const groupedFights = filtered.reduce<Record<string, Fight[]>>((acc, fight) => {
    const category = getWeightCategory(fight.eventName)
    if (!acc[category]) acc[category] = []
    acc[category].push(fight)
    return acc
  }, {})

  const orderedCategories = Object.keys(groupedFights).sort((a, b) => {
    const ai = WEIGHT_CATEGORY_ORDER.indexOf(a as (typeof WEIGHT_CATEGORY_ORDER)[number])
    const bi = WEIGHT_CATEGORY_ORDER.indexOf(b as (typeof WEIGHT_CATEGORY_ORDER)[number])
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
    return aRank - bRank || a.localeCompare(b)
  })

  return (
    <div className="min-h-screen">
      {/* Live Matches Hero Banner */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="absolute inset-0 bg-red-glow pointer-events-none opacity-60" />
        <div className="mx-auto max-w-7xl px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-live/10 border border-live/30 rounded-full px-4 py-1.5 mb-5">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse" />
            <span className="text-sm font-bold text-live uppercase tracking-wide">
              {liveCount > 0 ? `${liveCount} Live Now` : 'Live Matches'}
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-text-primary leading-tight mb-3">
            Bet Live.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">
              Win Big.
            </span>
          </h1>
          <p className="text-lg text-muted max-w-lg mx-auto mb-6">
            Real-time odds on UFC & combat sports. Place your bets and watch your ApexCoins grow.
          </p>

          <div className="flex items-center justify-center gap-6 flex-wrap">
            {liveCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-live animate-pulse" />
                <span className="text-sm font-bold text-live">{liveCount} LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{upcomingCount} upcoming</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Zap className="h-4 w-4" />
              <span className="text-sm">UFC · MMA · More coming</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Sport tabs + filter + sync */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sport category pill */}
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
              <span className="text-sm font-bold text-primary">🥊 UFC Betting</span>
            </div>

            {/* Status filters */}
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
              {(['live', 'upcoming', 'all', 'completed'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                    filter === f
                      ? 'bg-primary text-white shadow-red-sm'
                      : 'text-muted hover:text-text-primary'
                  )}
                >
                  {f === 'live' ? (
                    <span className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', liveCount > 0 ? 'bg-live animate-pulse' : 'bg-muted')} />
                      Live{liveCount > 0 ? ` (${liveCount})` : ''}
                    </span>
                  ) : (
                    <span className="capitalize">{f}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={syncOdds}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm text-muted hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync Odds'}
            {lastSync && !syncing && (
              <span className="text-xs opacity-60">
                {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
        </div>

        {/* Fights Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🥊</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {filter === 'live' ? 'No live matches right now' : 'No fights found'}
            </h3>
            <p className="text-muted max-w-sm mx-auto mb-6">
              {filter === 'live'
                ? 'Check upcoming fights below or sync for the latest events.'
                : "No events listed. Click 'Sync Odds' to fetch the latest."}
            </p>
            {filter === 'live' && (
              <button
                onClick={() => setFilter('upcoming')}
                className="mr-3 px-6 py-3 bg-surface hover:bg-surface-2 border border-border text-text-primary font-bold rounded-xl transition-colors"
              >
                View Upcoming
              </button>
            )}
            <button
              onClick={syncOdds}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors"
            >
              Sync Now
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {orderedCategories.map((category) => (
              <section key={category}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black text-text-primary">{category}</h3>
                  <span className="text-xs text-muted">
                    {groupedFights[category].length} fight{groupedFights[category].length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupedFights[category].map((fight) => (
                    <FightCard key={fight.id} fight={fight} onBetPlaced={loadFights} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
