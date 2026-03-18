'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { Search, RefreshCw, Shield, User, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRecord {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
}

type SortKey = 'createdAt' | 'name'
type SortDir = 'asc' | 'desc'

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [copied, setCopied] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function toggleRole(userId: string, currentRole: string) {
    if (!confirm(`${currentRole === 'admin' ? 'Remove' : 'Grant'} admin access?`)) return
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: currentRole === 'admin' ? 'user' : 'admin' }),
    })
    await loadUsers()
  }

  function copyAllEmails() {
    const emails = filtered.map((u) => u.email).join('\n')
    navigator.clipboard.writeText(emails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = users.filter(
      (u) =>
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt }
      if (sortKey === 'name') { av = a.name ?? ''; bv = b.name ?? '' }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [users, search, sortKey, sortDir])

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={cn(
          'flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors',
          active ? 'text-primary' : 'text-muted hover:text-text-secondary'
        )}
      >
        {label}
        {active ? (
          sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Users</h1>
          <p className="text-muted text-sm mt-1">
            <span className="font-bold text-text-primary">{users.length}</span> registered accounts
            {users.length > 0 && (
              <span className="ml-2 text-win font-semibold">
                +{users.filter(u => Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000).length} this week
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-muted hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2.5 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={copyAllEmails}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-win" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : `Copy ${filtered.length} emails`}
        </button>
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-[11px] text-muted uppercase tracking-wider">Sort by:</span>
        <SortBtn col="createdAt" label="Joined" />
        <SortBtn col="name" label="Name" />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center">
          <User className="h-10 w-10 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">No users found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {filtered.map((user, i) => {
            const isExpanded = expandedId === user.id
            return (
              <div key={user.id} className={cn(i < filtered.length - 1 && 'border-b border-border')}>
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {user.image ? (
                      <Image src={user.image} alt={user.name ?? 'User'} width={38} height={38} className="rounded-full" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-sm font-bold text-primary">
                        {user.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary">{user.name ?? 'No name'}</p>
                      {user.role === 'admin' && (
                        <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                          <Shield className="h-2.5 w-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-0.5 font-mono">{user.email}</p>
                  </div>

                  {/* Joined time */}
                  <div className="hidden sm:block text-right shrink-0 w-20">
                    <p className="text-[11px] text-muted">{timeAgo(user.createdAt)}</p>
                    <p className="text-[10px] text-muted opacity-60">joined</p>
                  </div>

                  <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                </button>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-border bg-surface-2 space-y-3 animate-fade-in">
                    {/* Mobile joined time */}
                    <div className="sm:hidden pt-3 text-sm">
                      <p className="text-[11px] text-muted">{timeAgo(user.createdAt)} · joined</p>
                    </div>

                    {/* Full email (selectable) */}
                    <div className="rounded-lg border border-border bg-surface px-3 py-2">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm text-text-primary font-mono select-all">{user.email}</p>
                    </div>

                    {/* Joined date */}
                    <div className="rounded-lg border border-border bg-surface px-3 py-2">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Registered</p>
                      <p className="text-sm text-text-primary">
                        {new Date(user.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                        })} IST
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => toggleRole(user.id, user.role)}
                        className="px-3 py-2 rounded-lg border border-border bg-surface hover:border-primary text-sm text-muted hover:text-primary transition-all"
                      >
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted">
          Showing {filtered.length} of {users.length} users
        </p>
      )}
    </div>
  )
}
