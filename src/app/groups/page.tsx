'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Hash, ArrowRight, MessageCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Group {
  id: string
  name: string
  description: string | null
  inviteCode: string
  owner: { id: string; name: string | null; image: string | null }
  _count: { members: number; messages: number }
}

export default function GroupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: groups, mutate } = useSWR<Group[]>('/api/groups', fetcher, { refreshInterval: 5000 })

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return null
  if (!session) {
    router.push('/login')
    return null
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, description: createDesc }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      router.push(`/groups/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
      setShowJoin(false)
      setJoinCode('')
      router.push(`/groups/${data.groupId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Groups
            </h1>
            <p className="text-sm text-muted mt-0.5">Chat with friends and bet together</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); setError('') }}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-border-bright transition-colors"
            >
              <Hash className="h-4 w-4" />
              Join
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setError('') }}
              className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover px-3 py-2 text-sm font-bold text-white shadow-red-glow hover:shadow-none transition-all"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-border bg-surface p-5 space-y-4 animate-fade-in">
            <h2 className="font-bold text-text-primary">Create a Group</h2>
            {error && <p className="text-sm text-primary">{error}</p>}
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Group name"
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </form>
        )}

        {/* Join form */}
        {showJoin && (
          <form onSubmit={handleJoin} className="mb-6 rounded-2xl border border-border bg-surface p-5 space-y-4 animate-fade-in">
            <h2 className="font-bold text-text-primary">Join a Group</h2>
            {error && <p className="text-sm text-primary">{error}</p>}
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code (e.g. AB12XY)"
              required
              maxLength={6}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none tracking-widest font-bold"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join Group'}
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {!groups ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-8 py-16 text-center">
            <Users className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-primary">No groups yet</p>
            <p className="text-xs text-muted mt-1">Create one or join with an invite code</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-primary/40 hover:bg-surface-2 transition-all group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-text-primary truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-muted truncate mt-0.5">{group.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group._count.members} members
                    </span>
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {group._count.messages} messages
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
