'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { TrendingUp, RefreshCw, Trophy, Loader2 } from 'lucide-react'
import FightCard from '@/components/FightCard'
import SportEventCard, { SPORT_META, type SportEvent } from '@/components/SportEventCard'
import { BannerCard, type Announcement } from '@/components/SeasonBanner'
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

// Sports that can be auto-fetched from The Odds API
const AUTO_FETCH_SPORTS = new Set(['cricket', 'football', 'tennis', 'nba', 'boxing', 'f1'])

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, completed: 2 }
const SPORT_SECTION_ORDER = SPORT_TABS.map((tab) => tab.key).filter((key) => key !== 'all')

const fetcher = (url: string) => fetch(url).then(r => r.json())

function getUfcCardName(eventName: string | null): string {
  if (!eventName) return 'UFC Card'
  const normalized = eventName.replace(/\s+/g, ' ').trim()
  const splitLabels = [' - Main Event', ' - Co-Main', ' - Main Card', ' - Prelims']

  for (const label of splitLabels) {
    const idx = normalized.toLowerCase().indexOf(label.toLowerCase())
    if (idx > 0) return normalized.slice(0, idx).trim()
  }

  return normalized
}

function getBoutPriority(eventName: string | null): number {
  const text = (eventName ?? '').toLowerCase()
  if (text.includes('main event')) return 0
  if (text.includes('co-main')) return 1
  if (text.includes('main card')) return 2
  if (text.includes('prelims')) return 3
  return 4
}

function getBoutLabel(priority: number): string {
  if (priority === 0) return 'Main Event'
  if (priority === 1) return 'Co-Main Event'
  return 'Featured'
}

function InlineBannerRow({ banners }: { banners: Announcement[] }) {
  if (banners.length === 0) return null
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-5 scrollbar-hide">
      {banners.map(ann => <BannerCard key={ann.id} ann={ann} />)}
    </div>
  )
}

export default function HomePage() {
  const [sportTab, setSportTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')

  const [fights, setFights] = useState<Fight[]>([])
  const [events, setEvents] = useState<SportEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchedSports = useRef<Set<string>>(new Set())

  // Fetch announcements once — injected per sport section
  const { data: announcements } = useSWR<Announcement[]>('/api/announcements', fetcher)

  const loadEvents = useCallback(async (sport: string, status: string) => {
    if (sport === 'mma') { setEvents([]); return }
    const s = sport === 'all' ? 'all' : sport
    try {
      const res = await fetch(`/api/events?sport=${s}&status=${status}`)
      const data = await res.json()
      setEvents(data as SportEvent[])
      return (data as SportEvent[]).length
    } catch { setEvents([]); return 0 }
  }, [])

  const loadFights = useCallback(async (status: string) => {
    try {
      const res = await fetch(`/api/fights?status=${status}`)
      const data = await res.json()
      const sorted = [...(data as Fight[])].sort((a, b) =>
        (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
      )
      setFights(sorted)
    } catch { setFights([]) }
  }, [])

  const autoFetch = useCallback(async (sport: string) => {
    const sportsToFetch = sport === 'all'
      ? Array.from(AUTO_FETCH_SPORTS)
      : AUTO_FETCH_SPORTS.has(sport) ? [sport] : []

    const toFetch = sportsToFetch.filter(s => !fetchedSports.current.has(s))
    if (toFetch.length === 0) return

    setFetching(true)
    try {
      await Promise.all(
        toFetch.map(s =>
          fetch(`/api/sports/load?sport=${s}`).then(() => {
            fetchedSports.current.add(s)
          })
        )
      )
    } finally {
      setFetching(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const showMMA = sportTab === 'mma' || sportTab === 'all'
      const showOther = sportTab !== 'mma'

      await Promise.all([
        showMMA ? loadFights(statusFilter) : Promise.resolve(setFights([])),
        showOther ? loadEvents(sportTab, statusFilter) : Promise.resolve(setEvents([])),
      ])
    } finally {
      setLoading(false)
    }
  }, [sportTab, statusFilter, loadFights, loadEvents])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      try {
        const showMMA = sportTab === 'mma' || sportTab === 'all'
        const showOther = sportTab !== 'mma'

        const [, eventCount] = await Promise.all([
          showMMA ? loadFights(statusFilter) : Promise.resolve(setFights([])),
          showOther ? loadEvents(sportTab, statusFilter) : Promise.resolve(undefined),
        ])

        if (cancelled) return

        if ((eventCount === 0 || eventCount === undefined) && showOther) {
          await autoFetch(sportTab)
          if (cancelled) return
          if (showOther) await loadEvents(sportTab, statusFilter)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [sportTab, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function syncOdds() {
    setSyncing(true)
    try {
      await fetch('/api/odds/sync', { method: 'POST' })
      if (sportTab !== 'mma') {
        fetchedSports.current.delete(sportTab)
        await autoFetch(sportTab)
      }
      await loadData()
    } finally { setSyncing(false) }
  }

  async function manualRefresh() {
    if (sportTab !== 'mma' && AUTO_FETCH_SPORTS.has(sportTab)) {
      fetchedSports.current.delete(sportTab)
    }
    await loadData()
  }

  const liveCount = fights.filter(f => f.status === 'live').length + events.filter(e => e.status === 'live').length
  const totalItems = fights.length + events.length

  const mmaCards = fights.reduce((acc: Record<string, Fight[]>, fight) => {
    const card = getUfcCardName(fight.eventName)
    if (!acc[card]) acc[card] = []
    acc[card].push(fight)
    return acc
  }, {})

  const orderedMmaCards = Object.keys(mmaCards).sort((a, b) => {
    const aTime = Math.min(...mmaCards[a].map((f) => new Date(f.commenceTime).getTime()))
    const bTime = Math.min(...mmaCards[b].map((f) => new Date(f.commenceTime).getTime()))
    return aTime - bTime
  })

  return (
    <div className="min-h-screen">
      {/* Hero tagline */}
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
        {/* Sport tab bar */}
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

        {/* Status filters + actions */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {(['live', 'upcoming', 'all', 'completed'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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
          <div className="flex items-center gap-2">
            {fetching && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fetching matches…
              </span>
            )}
            <button
              onClick={sportTab === 'mma' || sportTab === 'all' ? syncOdds : manualRefresh}
              disabled={syncing || fetching}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-muted hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', (syncing || fetching) && 'animate-spin')} />
              {syncing ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* WWE disclaimer */}
        {(sportTab === 'wwe' || sportTab === 'all') && events.some(e => e.sport === 'wwe') && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-400">
            <strong>Entertainment Prediction:</strong> WWE outcomes are scripted storylines. These are prediction games, not sports betting.
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {/* Skeleton: hero card */}
            <div className="max-w-sm mx-auto h-72 rounded-2xl bg-surface animate-pulse" />
            {/* Skeleton: secondary grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-56 rounded-2xl bg-surface animate-pulse" />)}
            </div>
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{SPORT_TABS.find(t => t.key === sportTab)?.emoji ?? '🏆'}</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              No {sportTab === 'all' ? '' : sportTab} {statusFilter === 'all' ? '' : statusFilter} events found
            </h3>
            <p className="text-muted text-sm max-w-xs mx-auto mb-4">
              {AUTO_FETCH_SPORTS.has(sportTab)
                ? 'No events available from the odds feed right now. Try a different status filter or check back later.'
                : sportTab === 'kabaddi' || sportTab === 'badminton' || sportTab === 'chess' || sportTab === 'wwe'
                ? 'This sport uses manually added events. Ask admin to add upcoming matches.'
                : 'Try switching the status filter or syncing odds.'}
            </p>
            {statusFilter !== 'upcoming' && (
              <button onClick={() => setStatusFilter('upcoming')}
                className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text-secondary hover:text-text-primary mr-2">
                Show Upcoming
              </button>
            )}
            {sportTab !== 'mma' && AUTO_FETCH_SPORTS.has(sportTab) && (
              <button
                onClick={async () => { fetchedSports.current.delete(sportTab); await loadData() }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold"
              >
                Retry Fetch
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">

            {/* ── MMA / UFC section ── */}
            {fights.length > 0 && (
              <section>
                <h3 className="text-sm font-black text-text-primary mb-4 flex items-center gap-2">
                  <span>🥋</span> MMA / UFC
                  <span className="text-xs font-normal text-muted">{fights.length} fight{fights.length !== 1 ? 's' : ''}</span>
                </h3>

                {/* Banners for MMA/UFC injected inline */}
                <InlineBannerRow banners={announcements?.filter(a => a.sport === 'mma') ?? []} />

                <div className="space-y-10">
                  {orderedMmaCards.map((cardName) => {
                    const orderedFights = [...mmaCards[cardName]].sort((a, b) => {
                      const byPriority = getBoutPriority(a.eventName) - getBoutPriority(b.eventName)
                      if (byPriority !== 0) return byPriority
                      return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
                    })

                    // Only fights explicitly tagged "Prelims" (priority 3) go to the bottom.
                    // Unlabeled fights (priority 4) stay in main card — never shunt them to prelims.
                    const prelimFights   = orderedFights.filter(f => getBoutPriority(f.eventName) === 3)
                    const mainCardFights = orderedFights.filter(f => getBoutPriority(f.eventName) !== 3)
                    // Fall back to all fights if somehow every fight is labeled prelims
                    const effectiveMain  = mainCardFights.length > 0 ? mainCardFights : orderedFights
                    const [heroFight, ...supportingFights] = effectiveMain
                    const heroPriority = getBoutPriority(heroFight.eventName)

                    return (
                      <section key={cardName}>
                        <div className="mb-5 flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">{cardName}</h4>
                          <span className="text-xs text-muted">
                            {orderedFights.length} fight{orderedFights.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* ── Hero fight: centered, glowing ── */}
                        <div className="max-w-sm mx-auto mb-5">
                          <div className="flex justify-center mb-3">
                            <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              {getBoutLabel(heroPriority)}
                            </span>
                          </div>
                          <div className="ring-2 ring-primary/25 rounded-2xl shadow-[0_0_36px_rgba(220,38,38,0.18)]">
                            <FightCard fight={heroFight} onBetPlaced={loadData} />
                          </div>
                        </div>

                        {/* ── Supporting main card bouts (co-main + main card) ── */}
                        {supportingFights.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {supportingFights.map(fight => (
                              <FightCard key={fight.id} fight={fight} onBetPlaced={loadData} />
                            ))}
                          </div>
                        )}

                        {/* ── Prelims ── */}
                        {prelimFights.length > 0 && (
                          <>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                                Prelims · {prelimFights.length} fight{prelimFights.length !== 1 ? 's' : ''}
                              </span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {prelimFights.map(fight => (
                                <FightCard key={fight.id} fight={fight} onBetPlaced={loadData} />
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Sport events grouped by sport ── */}
            {(() => {
              const grouped: Record<string, SportEvent[]> = {}
              for (const e of events) {
                if (!grouped[e.sport]) grouped[e.sport] = []
                grouped[e.sport].push(e)
              }
              return Object.entries(grouped)
                .sort(([a], [b]) => {
                  const ai = SPORT_SECTION_ORDER.indexOf(a)
                  const bi = SPORT_SECTION_ORDER.indexOf(b)
                  const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
                  const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
                  return aRank - bRank
                })
                .map(([sport, evs]) => {
                  const meta = SPORT_META[sport] ?? SPORT_META.mma
                  const tab = SPORT_TABS.find(t => t.key === sport)
                  const sportBanners = announcements?.filter(a => a.sport === sport) ?? []

                  // Same ordering as MMA: live first → upcoming → completed, then by time
                  const orderedEvs = [...evs].sort((a, b) => {
                    const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
                    if (statusDiff !== 0) return statusDiff
                    return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
                  })
                  const [heroEvent, ...secondaryEvents] = orderedEvs

                  return (
                    <section key={sport}>
                      {sportTab === 'all' && (
                        <h3 className="text-sm font-black text-text-primary mb-4 flex items-center gap-2">
                          <span>{tab?.emoji ?? meta.emoji}</span>
                          {tab?.label ?? sport}
                          <span className="text-xs font-normal text-muted">{evs.length} event{evs.length !== 1 ? 's' : ''}</span>
                        </h3>
                      )}

                      {/* Banners for this sport injected inline */}
                      <InlineBannerRow banners={sportBanners} />

                      {/* ── Hero event: full-width, sport-accented ── */}
                      <div className="mb-6">
                        <div className="flex justify-center mb-3">
                          <span className={cn(
                            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider',
                            meta.bg, meta.border, meta.color
                          )}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                            Featured Match
                          </span>
                        </div>
                        <div className="rounded-2xl shadow-[0_0_24px_rgba(0,0,0,0.25)]">
                          <SportEventCard event={heroEvent} onBetPlaced={loadData} />
                        </div>
                      </div>

                      {/* ── Secondary events grid ── */}
                      {secondaryEvents.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 text-center">
                            More {tab?.label ?? sport} events
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {secondaryEvents.map(ev => (
                              <SportEventCard key={ev.id} event={ev} onBetPlaced={loadData} />
                            ))}
                          </div>
                        </>
                      )}
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
