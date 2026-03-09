'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Trophy, Shield, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Entry {
  id: string
  name: string | null
  image: string | null
  reputation: number
  balance: number
  totalWon: number
  totalLost: number
  netProfit: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState<'all' | 'week'>('all')

  const { data } = useSWR<Entry[]>(`/api/leaderboard?period=${period}`, fetcher, { refreshInterval: 30000 })

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  const myRank = data?.findIndex((e) => e.id === session.user.id) ?? -1

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              Leaderboard
            </h1>
            <p className="text-sm text-muted mt-0.5">Ranked by net profit across all sports</p>
          </div>
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {(['all', 'week'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize',
                  period === p ? 'bg-primary text-white' : 'text-muted hover:text-text-primary'
                )}
              >
                {p === 'week' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* My rank card */}
        {myRank >= 0 && data && (
          <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xl font-black text-amber-400">
              {myRank < 3 ? MEDALS[myRank] : `#${myRank + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text-primary">Your rank: #{myRank + 1}</p>
              <p className="text-xs text-muted">Net profit: <span className={cn('font-bold', data[myRank].netProfit >= 0 ? 'text-win' : 'text-primary')}>
                {data[myRank].netProfit >= 0 ? '+' : ''}FC {formatCurrency(data[myRank].netProfit)}
              </span></p>
            </div>
          </div>
        )}

        {!data ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}</div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <Trophy className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No data yet</p>
            <p className="text-xs text-muted mt-1">Place some bets to appear on the leaderboard</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry, i) => {
              const isMe = entry.id === session.user.id
              const isPositive = entry.netProfit >= 0
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 transition-all',
                    isMe ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-surface',
                    i < 3 ? '' : ''
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
                    i === 0 ? 'bg-amber-400/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-400' :
                    i === 2 ? 'bg-orange-700/20 text-orange-700' :
                    'bg-surface-2 text-muted'
                  )}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </div>

                  {/* Avatar */}
                  {entry.image ? (
                    <img src={entry.image} alt="" className="h-9 w-9 rounded-full shrink-0" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {entry.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}

                  {/* Name + rep */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-text-primary text-sm truncate">
                        {entry.name ?? 'Anonymous'}
                        {isMe && <span className="text-amber-400 ml-1 text-xs">(you)</span>}
                      </p>
                      <span className={cn('flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                        entry.reputation >= 80 ? 'bg-win/10 text-win' :
                        entry.reputation >= 50 ? 'bg-amber-400/10 text-amber-400' :
                        'bg-primary/10 text-primary'
                      )}>
                        <Shield className="h-2 w-2" />{entry.reputation}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Won: FC {formatCurrency(entry.totalWon)} · Lost: FC {formatCurrency(entry.totalLost)}
                    </p>
                  </div>

                  {/* Net profit */}
                  <div className="text-right shrink-0">
                    <div className={cn('flex items-center gap-1 font-black text-sm', isPositive ? 'text-win' : 'text-primary')}>
                      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isPositive ? '+' : ''}FC {formatCurrency(Math.abs(entry.netProfit))}
                    </div>
                    <p className="text-[10px] text-muted">net profit</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
