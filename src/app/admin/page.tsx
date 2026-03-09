'use client'

import { useEffect, useState } from 'react'
import { Users, Swords, TrendingUp, Clock, RefreshCw, UserPlus, Coins, Shield, User } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface RecentUser {
  id: string
  name: string | null
  email: string
  createdAt: string
  role: string
}

interface Stats {
  userCount: number
  fightCount: number
  betCount: number
  pendingBets: { count: number; totalAmount: number }
  betsByStatus: { status: string; _count: number; _sum: { amount: number } }[]
  newUsersThisWeek: number
  platformBalance: number
  recentUsers: RecentUser[]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  async function loadStats() {
    const res = await fetch('/api/admin/stats')
    setStats(await res.json())
  }

  useEffect(() => { loadStats() }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/odds/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(`Synced ${data.synced} fights, settled ${data.settled} bets.${data.errors?.length ? ' Errors: ' + data.errors.join(', ') : ''}`)
      await loadStats()
    } finally {
      setSyncing(false)
    }
  }

  const statCards = [
    { label: 'Total Users', value: stats?.userCount ?? '—', icon: Users, color: 'text-blue-400', sub: stats ? `+${stats.newUsersThisWeek} this week` : '' },
    { label: 'Active Fights', value: stats?.fightCount ?? '—', icon: Swords, color: 'text-primary', sub: '' },
    { label: 'Total Bets', value: stats?.betCount ?? '—', icon: TrendingUp, color: 'text-win', sub: '' },
    { label: 'Pending Bets', value: stats?.pendingBets.count ?? '—', icon: Clock, color: 'text-live', sub: stats ? `FC ${formatCurrency(stats.pendingBets.totalAmount)} at risk` : '' },
  ]

  const wonBets = stats?.betsByStatus.find((b) => b.status === 'won')
  const lostBets = stats?.betsByStatus.find((b) => b.status === 'lost')

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
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
          {syncing ? 'Syncing…' : 'Sync Odds & Settle'}
        </button>
      </div>

      {syncResult && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          {syncResult}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <div className={`${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-text-primary">{value}</p>
            <p className="text-xs text-muted mt-1">{label}</p>
            {sub && <p className="text-[11px] text-win mt-1 font-semibold">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Platform balance */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-amber-400 mb-3">
            <Coins className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black text-text-primary">
            FC {stats ? formatCurrency(stats.platformBalance) : '—'}
          </p>
          <p className="text-xs text-muted mt-1">Total FightCoins in circulation</p>
        </div>

        {/* New users */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-blue-400 mb-3">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black text-text-primary">{stats?.newUsersThisWeek ?? '—'}</p>
          <p className="text-xs text-muted mt-1">New registrations this week</p>
        </div>

        {/* Bet outcomes */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Bet Outcomes</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-win font-semibold">Won</span>
              <span className="text-text-primary font-bold">{wonBets?._count ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary font-semibold">Lost</span>
              <span className="text-text-primary font-bold">{lostBets?._count ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-live font-semibold">Pending</span>
              <span className="text-text-primary font-bold">{stats?.pendingBets.count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-text-primary">Recent Registrations</h2>
          <Link href="/admin/users" className="text-xs text-primary hover:underline font-semibold">
            View all users →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats?.recentUsers.length === 0 && (
            <p className="text-sm text-muted px-5 py-4">No users yet.</p>
          )}
          {stats?.recentUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{user.name ?? 'No name'}</p>
                  {user.role === 'admin' && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <span className="text-[11px] text-muted shrink-0">{timeAgo(user.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
