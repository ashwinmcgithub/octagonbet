'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, CheckCircle2, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SPORTS = ['cricket', 'football', 'kabaddi', 'f1', 'tennis', 'badminton', 'chess', 'nba', 'boxing', 'wwe', 'mma']
const LEAGUES: Record<string, string[]> = {
  cricket:   ['IPL', 'TEST', 'ODI', 'T20I', 'SA20', 'BBL', 'OTHER'],
  football:  ['PL', 'CL', 'ISL', 'PD', 'FL1', 'SA', 'BL1', 'OTHER'],
  kabaddi:   ['PKL', 'OTHER'],
  f1:        ['F1'],
  tennis:    ['Grand Slam', 'ATP', 'WTA', 'Davis Cup', 'OTHER'],
  badminton: ['BWF', 'Thomas Cup', 'Uber Cup', 'India Open', 'OTHER'],
  chess:     ['FIDE', 'Candidates', 'Olympiad', 'Tata Steel', 'OTHER'],
  nba:       ['NBA'],
  boxing:    ['WBC', 'WBO', 'IBF', 'WBA', 'OTHER'],
  wwe:       ['WWE PPV', 'WWE Raw', 'WWE SmackDown'],
  mma:       ['UFC', 'ONE Championship', 'Bellator', 'OTHER'],
}

interface MarketInput { marketType: string; label: string; options: { key: string; label: string; odds: number }[] }

interface Market {
  id: string; marketType: string; label: string; status: string
  options: { key: string; label: string; odds: number }[]
  resultKey: string | null
  _count: { bets: number }
}
interface SportEvent {
  id: string; sport: string; league: string; eventName: string | null
  homeTeam: string; awayTeam: string; commenceTime: string; status: string; result: string | null
  markets: Market[]
}

function buildDefaultMarkets(sport: string, home: string, away: string): MarketInput[] {
  const moneyline: MarketInput = {
    marketType: 'moneyline', label: 'Match Winner',
    options: [
      { key: 'home', label: home || 'Home', odds: 1.9 },
      { key: 'away', label: away || 'Away', odds: 1.9 },
    ],
  }
  if (['cricket', 'football'].includes(sport)) {
    moneyline.options.push({ key: 'draw', label: 'Draw', odds: 3.5 })
  }
  if (sport === 'cricket') {
    return [moneyline, { marketType: 'toss_winner', label: 'Toss Winner', options: [
      { key: 'home', label: home || 'Home', odds: 1.9 },
      { key: 'away', label: away || 'Away', odds: 1.9 },
    ]}]
  }
  return [moneyline]
}

export default function AdminEventsPage() {
  const { data: events, mutate } = useSWR<SportEvent[]>('/api/admin/events', fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Create form state
  const [sport, setSport] = useState('cricket')
  const [league, setLeague] = useState('IPL')
  const [eventName, setEventName] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [commenceTime, setCommenceTime] = useState('')
  const [creating, setCreating] = useState(false)

  // Settle state
  const [settleMarketId, setSettleMarketId] = useState<string | null>(null)
  const [settleKey, setSettleKey] = useState('')
  const [settling, setSettling] = useState(false)

  async function handleSync(scope: string) {
    setSyncing(true); setSyncMsg('')
    const res = await fetch(`/api/sports/sync?scope=${scope}`, { method: 'POST' })
    const data = await res.json()
    const summary = Object.entries(data.results ?? {}).map(([s, r]: [string, unknown]) => {
      const result = r as { upserted: number; errors: string[] }
      return `${s}: ${result.upserted} upserted${result.errors?.length ? `, ${result.errors.length} err` : ''}`
    }).join(' | ')
    setSyncMsg(summary || 'Done')
    setSyncing(false)
    mutate()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setCreating(true)
    const markets = buildDefaultMarkets(sport, homeTeam, awayTeam)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, league, eventName, homeTeam, awayTeam, commenceTime, markets }),
    })
    if (res.ok) { setShowCreate(false); setHomeTeam(''); setAwayTeam(''); setEventName(''); setCommenceTime(''); mutate() }
    setCreating(false)
  }

  async function handleSettle(eventId: string) {
    if (!settleMarketId || !settleKey) return
    setSettling(true)
    await fetch(`/api/admin/events/${eventId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: settleMarketId, resultKey: settleKey }),
    })
    setSettleMarketId(null); setSettleKey('')
    setSettling(false); mutate()
  }

  async function handleCancel(eventId: string) {
    if (!confirm('Cancel this event and void all bets?')) return
    await fetch(`/api/admin/events/${eventId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    mutate()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Sport Events</h1>
          <p className="text-muted text-sm mt-1">Create, sync, and settle multi-sport events</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleSync('cricket')} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-50">
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />🏏 Sync Cricket
          </button>
          <button onClick={() => handleSync('football')} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-50">
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />⚽ Sync Football
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white">
            <Plus className="h-3.5 w-3.5" />Add Event
          </button>
        </div>
      </div>

      {syncMsg && <p className="text-xs text-win bg-win/10 border border-win/20 rounded-xl px-4 py-2">{syncMsg}</p>}

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-surface p-5 space-y-4 animate-fade-in">
          <h2 className="font-bold text-text-primary">New Event</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Sport</label>
              <select value={sport} onChange={(e) => { setSport(e.target.value); setLeague(LEAGUES[e.target.value]?.[0] ?? '') }}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">League</label>
              <select value={league} onChange={(e) => setLeague(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                {(LEAGUES[sport] ?? ['OTHER']).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Home Team</label>
              <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} required placeholder="India"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Away Team</label>
              <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} required placeholder="Australia"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Event Name (optional)</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="IPL 2026 Final"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Start Date/Time</label>
              <input type="datetime-local" value={commenceTime} onChange={(e) => setCommenceTime(e.target.value)} required
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
          </div>
          <p className="text-[10px] text-muted">Default Match Winner market will be created automatically. You can settle each market individually after the event.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary">Cancel</button>
            <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      <div className="space-y-3">
        {!events && <div className="h-24 rounded-2xl bg-surface animate-pulse" />}
        {events?.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-muted text-sm">No sport events yet. Add one or sync from APIs.</p>
          </div>
        )}
        {events?.map((event) => (
          <div key={event.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border',
                  event.status === 'live' ? 'text-live border-live/30 bg-live/5' :
                  event.status === 'completed' ? 'text-win border-win/30 bg-win/5' :
                  event.status === 'cancelled' ? 'text-muted border-border' :
                  'text-primary border-primary/30 bg-primary/5'
                )}>{event.status}</span>
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">{event.homeTeam} vs {event.awayTeam}</p>
                  <p className="text-[10px] text-muted">{event.sport} · {event.league} · {new Date(event.commenceTime).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted">{event.markets.length} market{event.markets.length !== 1 ? 's' : ''}</span>
                {expandedId === event.id ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </div>
            </button>

            {expandedId === event.id && (
              <div className="border-t border-border bg-surface-2 px-5 py-4 space-y-4">
                {/* Markets */}
                {event.markets.map((market) => (
                  <div key={market.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-text-secondary">{market.label} <span className="font-normal text-muted">({market._count.bets} bets)</span></p>
                      <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5',
                        market.status === 'settled' ? 'text-win bg-win/10' :
                        market.status === 'void' ? 'text-muted bg-surface' :
                        'text-live bg-live/10'
                      )}>{market.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(market.options as { key: string; label: string; odds: number }[]).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => { setSettleMarketId(market.id); setSettleKey(opt.key) }}
                          disabled={market.status !== 'open'}
                          className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                            market.resultKey === opt.key ? 'border-win/40 bg-win/10 text-win' :
                            settleMarketId === market.id && settleKey === opt.key ? 'border-primary bg-primary/10 text-primary' :
                            'border-border bg-surface text-text-secondary hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed'
                          )}
                        >
                          {market.resultKey === opt.key && <CheckCircle2 className="h-3 w-3" />}
                          {opt.label} ({opt.odds.toFixed(2)})
                        </button>
                      ))}
                    </div>
                    {settleMarketId === market.id && market.status === 'open' && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-amber-400">Settle with winner: <strong>{settleKey}</strong>?</p>
                        <button onClick={() => handleSettle(event.id)} disabled={settling}
                          className="flex items-center gap-1 rounded-lg bg-win/20 hover:bg-win/30 px-3 py-1 text-xs font-bold text-win disabled:opacity-50">
                          <CheckCircle2 className="h-3 w-3" />{settling ? 'Settling…' : 'Confirm'}
                        </button>
                        <button onClick={() => { setSettleMarketId(null); setSettleKey('') }}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs text-muted">
                          <XCircle className="h-3 w-3" />Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Cancel event */}
                {event.status !== 'cancelled' && event.status !== 'completed' && (
                  <button onClick={() => handleCancel(event.id)}
                    className="text-xs text-primary hover:underline font-semibold">
                    Cancel event &amp; void all bets
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
