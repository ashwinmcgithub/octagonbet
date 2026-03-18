'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { SPORT_META } from '@/lib/sport-meta'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SPORTS = ['cricket', 'football', 'kabaddi', 'f1', 'tennis', 'badminton', 'chess', 'nba', 'boxing', 'wwe', 'mma']

interface Announcement {
  id: string; sport: string; title: string; description: string | null
  startsAt: string; bettingOpensAt: string | null; active: boolean; createdAt: string
}

function formatIST(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function AdminAnnouncementsPage() {
  const { data, mutate } = useSWR<Announcement[]>('/api/admin/announcements', fetcher)

  const [showForm, setShowForm] = useState(false)
  const [sport, setSport] = useState('cricket')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [bettingOpensAt, setBettingOpensAt] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, title, description, startsAt, bettingOpensAt: bettingOpensAt || null }),
    })
    setShowForm(false); setTitle(''); setDescription(''); setStartsAt(''); setBettingOpensAt('')
    setSaving(false); mutate()
  }

  async function toggleActive(ann: Announcement) {
    await fetch(`/api/admin/announcements/${ann.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !ann.active }),
    })
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Season Banners</h1>
          <p className="text-muted text-sm mt-1">Upcoming season announcements shown on the home page</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white">
          <Plus className="h-3.5 w-3.5" /> Add Banner
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-surface p-5 space-y-4 animate-fade-in">
          <h2 className="font-bold text-text-primary">New Season Banner</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Sport</label>
              <select value={sport} onChange={e => setSport(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                {SPORTS.map(s => <option key={s} value={s}>{SPORT_META[s]?.emoji} {s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="IPL 2026"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Season Starts At</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Betting Opens At (optional)</label>
              <input type="datetime-local" value={bettingOpensAt} onChange={e => setBettingOpensAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
              <p className="text-[10px] text-muted mt-1">Leave blank = betting opens when season starts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Banner'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {!data && <div className="h-16 rounded-2xl bg-surface animate-pulse" />}
        {data?.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted text-sm">
            No announcements yet. Add one to display it on the home page.
          </div>
        )}
        {data?.map(ann => {
          const meta = SPORT_META[ann.sport] ?? SPORT_META.mma
          return (
            <div key={ann.id} className={`flex items-center gap-4 rounded-2xl border bg-surface p-4 ${!ann.active ? 'opacity-50' : ''}`}>
              <span className="text-2xl">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-text-primary text-sm">{ann.title}</p>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${meta.bg} ${meta.color} ${meta.border} border`}>
                    {ann.sport}
                  </span>
                  {!ann.active && <span className="text-[10px] text-muted border border-border rounded-full px-2 py-0.5">hidden</span>}
                </div>
                {ann.description && <p className="text-xs text-muted mt-0.5 truncate">{ann.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
                  <span>Starts: {formatIST(ann.startsAt)} IST</span>
                  {ann.bettingOpensAt && <span>Betting opens: {formatIST(ann.bettingOpensAt)} IST</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(ann)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted hover:text-text-primary transition-colors"
                  title={ann.active ? 'Hide from home page' : 'Show on home page'}>
                  {ann.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => handleDelete(ann.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
