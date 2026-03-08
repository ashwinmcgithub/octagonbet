'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Search, RefreshCw, Shield, User } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UserRecord {
  id: string
  name: string | null
  email: string
  image: string | null
  balance: number
  role: string
  createdAt: string
  _count: { bets: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<Record<string, string>>({})

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function adjustBalance(userId: string) {
    const amount = parseFloat(adjustAmount[userId] || '0')
    if (!amount) return
    setAdjusting(userId)
    try {
      const user = users.find((u) => u.id === userId)!
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, balance: user.balance + amount }),
      })
      setAdjustAmount((prev) => ({ ...prev, [userId]: '' }))
      await loadUsers()
    } finally {
      setAdjusting(null)
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: currentRole === 'admin' ? 'user' : 'admin' }),
    })
    await loadUsers()
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Users</h1>
          <p className="text-muted text-sm mt-1">{users.length} registered accounts</p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-muted hover:text-text-primary transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {filtered.map((user, i) => (
            <div
              key={user.id}
              className={cn(
                'flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors',
                i < filtered.length - 1 && 'border-b border-border'
              )}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? 'User'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary truncate">{user.name ?? 'No name'}</p>
                  {user.role === 'admin' && (
                    <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted truncate">{user.email}</p>
                <p className="text-xs text-muted mt-0.5">
                  {user._count.bets} bets · Joined {formatDate(user.createdAt).split(',')[0]}
                </p>
              </div>

              {/* Balance */}
              <div className="text-right shrink-0">
                <p className="font-black text-text-primary">FC {formatCurrency(user.balance)}</p>

                {/* Balance adjustment */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    type="number"
                    placeholder="±amount"
                    value={adjustAmount[user.id] || ''}
                    onChange={(e) =>
                      setAdjustAmount((prev) => ({ ...prev, [user.id]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => adjustBalance(user.id)}
                    disabled={adjusting === user.id}
                    className="px-2 py-1 rounded-lg bg-surface-2 border border-border hover:border-primary text-xs text-muted hover:text-primary transition-all disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Role toggle */}
              <button
                onClick={() => toggleRole(user.id, user.role)}
                className="shrink-0 px-3 py-1.5 rounded-xl border border-border bg-surface-2 hover:border-primary text-xs text-muted hover:text-primary transition-all"
              >
                {user.role === 'admin' ? 'Demote' : 'Make Admin'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
