'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Swords } from 'lucide-react'
import { formatDate, formatCurrency, formatOdds } from '@/lib/utils'
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
  _count: { bets: number }
  bets: { amount: number; status: string }[]
}

export default function AdminFightsPage() {
  const [fights, setFights] = useState<Fight[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)

  async function loadFights() {
    const res = await fetch('/api/admin/fights')
    setFights(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadFights() }, [])

  async function settleFight(fightId: string, winner: 'home' | 'away') {
    setSettling(fightId)
    try {
      const res = await fetch('/api/admin/fights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'settle', fightId, winner }),
      })
      const data = await res.json()
      alert(`Settled ${data.settled} bets successfully!`)
      await loadFights()
    } finally {
      setSettling(null)
    }
  }

  async function cancelFight(fightId: string) {
    if (!confirm('Cancel this fight and refund all bets?')) return
    setSettling(fightId)
    try {
      await fetch('/api/admin/fights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', fightId }),
      })
      await loadFights()
    } finally {
      setSettling(null)
    }
  }

  const statusColor: Record<string, string> = {
    upcoming: 'text-text-secondary border-border',
    live: 'text-live border-live/30 bg-live/10',
    completed: 'text-win border-win/30 bg-win/10',
    cancelled: 'text-muted border-border',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Fights</h1>
          <p className="text-muted text-sm mt-1">Manage fight outcomes and settle bets</p>
        </div>
        <button
          onClick={loadFights}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-muted hover:text-text-primary hover:border-border-bright transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : fights.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border">
          <Swords className="h-12 w-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No fights yet. Sync odds from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fights.map((fight) => {
            const pendingAmount = fight.bets
              .filter((b) => b.status === 'pending')
              .reduce((s, b) => s + b.amount, 0)
            const isSettling = settling === fight.id

            return (
              <div
                key={fight.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border capitalize', statusColor[fight.status])}>
                        {fight.status}
                      </span>
                      <span className="text-xs text-muted">{formatDate(fight.commenceTime)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="font-bold text-text-primary">{fight.homeTeam}</p>
                        <p className="text-xs text-primary font-bold">{fight.homeOdds ? formatOdds(fight.homeOdds) : '—'}</p>
                        {fight.winner === 'home' && (
                          <p className="text-xs text-win font-bold">WINNER</p>
                        )}
                      </div>
                      <span className="text-muted font-black">VS</span>
                      <div className="text-center">
                        <p className="font-bold text-text-primary">{fight.awayTeam}</p>
                        <p className="text-xs text-primary font-bold">{fight.awayOdds ? formatOdds(fight.awayOdds) : '—'}</p>
                        {fight.winner === 'away' && (
                          <p className="text-xs text-win font-bold">WINNER</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 mt-2 text-xs text-muted">
                      <span>{fight._count.bets} total bets</span>
                      {pendingAmount > 0 && (
                        <span className="text-live">FC {formatCurrency(pendingAmount)} pending</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {(fight.status === 'upcoming' || fight.status === 'live') && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <p className="text-xs text-muted text-center mb-1">Declare winner:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => settleFight(fight.id, 'home')}
                          disabled={isSettling}
                          className="flex items-center gap-1.5 px-3 py-2 bg-win/10 border border-win/20 hover:bg-win/20 text-win text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {fight.homeTeam.split(' ')[0]} Wins
                        </button>
                        <button
                          onClick={() => settleFight(fight.id, 'away')}
                          disabled={isSettling}
                          className="flex items-center gap-1.5 px-3 py-2 bg-win/10 border border-win/20 hover:bg-win/20 text-win text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {fight.awayTeam.split(' ')[0]} Wins
                        </button>
                      </div>
                      <button
                        onClick={() => cancelFight(fight.id)}
                        disabled={isSettling}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-2 border border-border hover:border-red-500/30 text-muted hover:text-primary text-xs rounded-xl transition-all disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel & Refund
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
