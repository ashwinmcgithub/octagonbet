'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flame, RefreshCw, Zap, TrendingUp } from 'lucide-react'
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
  _count?: { bets: number }
}

type Filter = 'all' | 'live' | 'upcoming' | 'completed'

export default function HomePage() {
  const [fights, setFights] = useState<Fight[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadFights = useCallback(async () => {
    try {
      const res = await fetch(`/api/fights?status=${filter}`)
      const data = await res.json()
      setFights(data)
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

  // Auto-sync every 2 minutes
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

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-red-glow pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Live UFC Betting</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-text-primary leading-tight mb-4">
            Bet on the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">
              Octagon
            </span>
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-8">
            Real-time UFC odds. Place your bets on fight winners and watch your FightCoins grow.
          </p>

          {/* Live stats */}
          <div className="flex items-center justify-center gap-8">
            {liveCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-live animate-pulse-red" />
                <span className="text-sm font-bold text-live">{liveCount} LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{upcomingCount} upcoming fights</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Real odds from The Odds API</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Filters + Sync */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 bg-surface border border-border rounded-xl p-1">
            {(['all', 'live', 'upcoming', 'completed'] as Filter[]).map((f) => (
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
                {f === 'live' && liveCount > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-red" />
                    Live ({liveCount})
                  </span>
                ) : (
                  <span className="capitalize">{f}</span>
                )}
              </button>
            ))}
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
            <Flame className="h-16 w-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No fights found</h3>
            <p className="text-muted max-w-sm mx-auto">
              {filter === 'all'
                ? "No UFC fights are currently listed. Click 'Sync Odds' to fetch the latest events from The Odds API."
                : `No ${filter} fights at the moment.`}
            </p>
            <button
              onClick={syncOdds}
              className="mt-6 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors"
            >
              Sync Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map((fight) => (
              <FightCard key={fight.id} fight={fight} onBetPlaced={loadFights} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
