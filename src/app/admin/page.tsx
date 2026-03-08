'use client'

import { useEffect, useState } from 'react'
import { Users, Swords, TrendingUp, Clock, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  userCount: number
  fightCount: number
  betCount: number
  pendingBets: { count: number; totalAmount: number }
  betsByStatus: { status: string; _count: number; _sum: { amount: number } }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/odds/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(`Synced ${data.synced} fights, settled ${data.settled} bets.${data.errors?.length ? ' Errors: ' + data.errors.join(', ') : ''}`)
      // Refresh stats
      const statsRes = await fetch('/api/admin/stats')
      setStats(await statsRes.json())
    } finally {
      setSyncing(false)
    }
  }

  const statCards = [
    { label: 'Total Users', value: stats?.userCount ?? '—', icon: Users, color: 'text-blue-400' },
    { label: 'Active Fights', value: stats?.fightCount ?? '—', icon: Swords, color: 'text-primary' },
    { label: 'Total Bets', value: stats?.betCount ?? '—', icon: TrendingUp, color: 'text-win' },
    { label: 'Pending Bets', value: stats?.pendingBets.count ?? '—', icon: Clock, color: 'text-live' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Platform overview</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Odds & Settle'}
        </button>
      </div>

      {syncResult && (
        <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          {syncResult}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-6">
            <div className={`${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-text-primary">{value}</p>
            <p className="text-xs text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending bets volume */}
      {stats && (
        <div className="rounded-2xl border border-live/20 bg-live/5 p-6">
          <h3 className="font-bold text-text-primary mb-1">Pending Bet Volume</h3>
          <p className="text-3xl font-black text-live">
            FC {formatCurrency(stats.pendingBets.totalAmount)}
          </p>
          <p className="text-sm text-muted mt-1">
            Across {stats.pendingBets.count} unsettled bets
          </p>
        </div>
      )}
    </div>
  )
}
