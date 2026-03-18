'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Gamepad, Zap, CalendarDays, Shield, Search, Copy, Check } from 'lucide-react'
import Link from 'next/link'

interface RecentUser {
  id: string
  name: string | null
  email: string
  createdAt: string
  role: string
}

interface Stats {
  totalUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  totalGameRooms: number
  activeGameRooms: number
  gamePlayersToday: number
  recentUsers: RecentUser[]
  allUsers: RecentUser[]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'recent' | 'all'>('recent')

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  const displayUsers = tab === 'recent' ? (stats?.recentUsers ?? []) : (stats?.allUsers ?? [])
  const filtered = displayUsers.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  function copyEmails() {
    navigator.clipboard.writeText(filtered.map(u => u.email).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statCards = [
    {
      label: 'Total Accounts',
      value: stats?.totalUsers ?? '—',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      sub: null,
    },
    {
      label: 'Joined Today',
      value: stats?.newUsersToday ?? '—',
      icon: UserPlus,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      sub: stats ? `+${stats.newUsersThisWeek} this week` : null,
    },
    {
      label: 'Playing Games Today',
      value: stats?.gamePlayersToday ?? '—',
      icon: Gamepad,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: null,
    },
    {
      label: 'Active Game Rooms',
      value: stats?.activeGameRooms ?? '—',
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      sub: stats ? `${stats.totalGameRooms} total sessions` : null,
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Dashboard</h1>
        <p className="text-muted text-sm mt-0.5">Platform overview</p>
      </div>

      {/* Stat cards — 2 col on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-text-primary">{value}</p>
            <p className="text-xs text-muted mt-1 leading-tight">{label}</p>
            {sub && <p className="text-[11px] text-green-400 mt-1 font-semibold">{sub}</p>}
          </div>
        ))}
      </div>

      {/* This week summary bar */}
      {stats && (
        <div className="rounded-2xl border border-border bg-surface px-4 sm:px-5 py-4 flex flex-wrap gap-4 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-muted shrink-0" />
            <div>
              <p className="text-xs text-muted">Registered this week</p>
              <p className="text-lg font-black text-text-primary">{stats.newUsersThisWeek}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Gamepad className="h-4 w-4 text-muted shrink-0" />
            <div>
              <p className="text-xs text-muted">Total game sessions ever</p>
              <p className="text-lg font-black text-text-primary">{stats.totalGameRooms}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted shrink-0" />
            <div>
              <p className="text-xs text-muted">Total accounts</p>
              <p className="text-lg font-black text-text-primary">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users section */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {/* Section header */}
        <div className="px-4 sm:px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-text-primary">Registered Accounts</h2>
            <Link href="/admin/users" className="text-xs text-primary hover:underline font-semibold">
              Full view →
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'recent' ? 'bg-primary text-white' : 'bg-surface-2 text-muted hover:text-text-primary'}`}
            >
              Recent 10
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'bg-surface-2 text-muted hover:text-text-primary'}`}
            >
              All ({stats?.totalUsers ?? '…'})
            </button>
          </div>

          {/* Search + copy row */}
          {tab === 'all' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 py-2 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={copyEmails}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all disabled:opacity-40 shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy emails'}</span>
              </button>
            </div>
          )}
        </div>

        {/* User list */}
        {!stats ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted px-5 py-8 text-center">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                {/* Avatar */}
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>

                {/* Name + email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary truncate">{user.name ?? 'No name'}</p>
                    {user.role === 'admin' && (
                      <span className="flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5 shrink-0">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>

                {/* Joined time */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">{timeAgo(user.createdAt)}</p>
                  <p className="text-[10px] text-muted opacity-50">joined</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
