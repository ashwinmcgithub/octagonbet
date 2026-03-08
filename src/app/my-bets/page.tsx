'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Trophy, Clock, XCircle, TrendingUp, Flame } from 'lucide-react'
import { formatDate, formatCurrency, formatOdds } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Bet {
  id: string
  fighter: string
  amount: number
  odds: number
  status: string
  payout: number | null
  createdAt: string
  fight: {
    homeTeam: string
    awayTeam: string
    commenceTime: string
    status: string
    winner: string | null
  }
}

const statusConfig = {
  pending: { label: 'Pending', color: 'text-live', bg: 'bg-live/10 border-live/20', icon: Clock },
  won: { label: 'Won', color: 'text-win', bg: 'bg-win/10 border-win/20', icon: Trophy },
  lost: { label: 'Lost', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-muted', bg: 'bg-surface border-border', icon: XCircle },
}

export default function MyBetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/bets')
      .then((r) => r.json())
      .then((data) => {
        setBets(data)
        setLoading(false)
      })
  }, [status])

  const filtered = filter === 'all' ? bets : bets.filter((b) => b.status === filter)

  const totalWon = bets.filter((b) => b.status === 'won').reduce((s, b) => s + (b.payout ?? 0), 0)
  const totalBet = bets.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0)
  const pendingCount = bets.filter((b) => b.status === 'pending').length

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary">My Bets</h1>
        <p className="text-muted mt-1">Track all your fight predictions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Bets</p>
          <p className="text-2xl font-black text-text-primary">{bets.length}</p>
        </div>
        <div className="rounded-2xl border border-win/20 bg-win/5 p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Won</p>
          <p className="text-2xl font-black text-win">FC {formatCurrency(totalWon)}</p>
        </div>
        <div className="rounded-2xl border border-live/20 bg-live/5 p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-black text-live">{pendingCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-surface border border-border rounded-xl p-1 mb-6 w-fit">
        {(['all', 'pending', 'won', 'lost'] as const).map((f) => (
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
            {f}
          </button>
        ))}
      </div>

      {/* Bets list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border">
          <Flame className="h-14 w-14 text-primary/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary mb-2">No bets yet</h3>
          <p className="text-muted mb-6">Head to the fights page and place your first bet!</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors"
          >
            View Fights
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet) => {
            const config = statusConfig[bet.status as keyof typeof statusConfig] || statusConfig.cancelled
            const Icon = config.icon
            const pickedFighter = bet.fighter === 'home' ? bet.fight.homeTeam : bet.fight.awayTeam
            const opposingFighter = bet.fighter === 'home' ? bet.fight.awayTeam : bet.fight.homeTeam

            return (
              <div
                key={bet.id}
                className="rounded-2xl border border-border bg-surface p-5 hover:border-border-bright transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Fight */}
                    <p className="text-xs text-muted mb-1">{formatDate(bet.fight.commenceTime)}</p>
                    <p className="font-bold text-text-primary">
                      <span className="text-primary">{pickedFighter}</span>
                      <span className="text-muted mx-2">vs</span>
                      {opposingFighter}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-sm text-muted">
                        Stake: <span className="text-text-primary font-medium">FC {formatCurrency(bet.amount)}</span>
                      </span>
                      <span className="text-sm text-muted">
                        Odds: <span className="text-text-primary font-medium">{formatOdds(bet.odds)}</span>
                      </span>
                      {bet.status === 'won' && bet.payout && (
                        <span className="text-sm font-bold text-win flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +FC {formatCurrency(bet.payout - bet.amount)} profit
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5', config.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      <span className={cn('text-xs font-bold', config.color)}>{config.label}</span>
                    </div>
                    {bet.status === 'won' && bet.payout && (
                      <p className="text-right text-sm font-black text-win mt-1">
                        FC {formatCurrency(bet.payout)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
