'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Send, Users, Hash, Copy, Check, Paperclip, X, Loader2, Pencil } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface UserInfo { id: string; name: string | null; image: string | null }

interface Message {
  id: string
  content: string
  mediaUrl: string | null
  mediaType: string | null
  createdAt: string
  userId: string
  user: UserInfo
}

interface GroupInfo {
  id: string
  name: string
  description: string | null
  inviteCode: string
  owner: UserInfo
  members: { joinedAt: string; user: UserInfo }[]
}

export default function GroupRoomPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialScrollDone = useRef(false)

  // Group rename state
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Media state
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video'; cloudUrl?: string } | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const { data: group, mutate: mutateGroup } = useSWR<GroupInfo>(`/api/groups/${groupId}`, fetcher)

  // Poll messages every 3s
  useEffect(() => {
    if (!session?.user?.id) return
    let isMounted = true

    async function poll() {
      const url = `/api/groups/${groupId}/messages${lastTimestamp ? `?after=${encodeURIComponent(lastTimestamp)}` : ''}`
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const data: Message[] = await res.json()
        if (!isMounted) return
        if (data.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id))
            const fresh = data.filter((m) => !ids.has(m.id))
            return [...prev, ...fresh]
          })
          setLastTimestamp(data[data.length - 1].createdAt)
        }
      } catch {}
    }

    // Initial load (no cursor) — scroll to bottom once
    fetch(`/api/groups/${groupId}/messages`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        if (!isMounted) return
        setMessages(data)
        if (data.length > 0) setLastTimestamp(data[data.length - 1].createdAt)
        // Scroll to bottom on entry, then let user scroll freely
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'instant' })
          initialScrollDone.current = true
        }, 50)
      })
      .catch(() => {})

    const interval = setInterval(poll, 3000)
    return () => { isMounted = false; clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, session?.user?.id])

  // No auto-scroll on new messages — user scrolls freely after initial load

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isImage && !isVideo) { setUploadError('Only images and videos are supported.'); return }
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxBytes) {
      setUploadError(isVideo ? 'Video must be under 100 MB.' : 'Image must be under 10 MB.')
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setMediaPreview({ url: localUrl, type: isVideo ? 'video' : 'image' })
    setUploadError('')
    setUploadingMedia(true)

    try {
      // Fetch config from server-side API (avoids NEXT_PUBLIC_ build-time baking issues)
      const configRes = await fetch('/api/upload/config')
      if (!configRes.ok) throw new Error('Upload not configured')
      const { cloudName, uploadPreset } = await configRes.json()

      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', uploadPreset)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`,
        { method: 'POST', body: fd }
      )
      const data = await res.json()
      if (!res.ok || !data.secure_url) {
        const msg = data?.error?.message ?? `Upload failed (${res.status})`
        throw new Error(msg)
      }

      setMediaPreview({ url: localUrl, type: isVideo ? 'video' : 'image', cloudUrl: data.secure_url })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setMediaPreview(null)
    } finally {
      setUploadingMedia(false)
    }
  }

  function clearMedia() {
    setMediaPreview(null)
    setUploadError('')
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !mediaPreview?.cloudUrl) || sending || uploadingMedia) return
    setSending(true)
    const content = input.trim()
    const mediaUrl = mediaPreview?.cloudUrl ?? null
    const mediaType = mediaPreview?.type ?? null
    setInput('')
    setMediaPreview(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mediaUrl, mediaType }),
      })
      if (res.ok) {
        const msg: Message = await res.json()
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setLastTimestamp(msg.createdAt)
        // Scroll to bottom when user sends their own message
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } finally {
      setSending(false)
    }
  }

  async function saveGroupName() {
    if (!nameInput.trim() || savingName) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), description: group?.description }),
      })
      if (res.ok) {
        await mutateGroup()
        setEditingName(false)
      }
    } finally {
      setSavingName(false)
    }
  }

  function copyCode() {
    if (!group) return
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Link href="/groups" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 rounded-lg border border-primary bg-surface px-2 py-1 text-sm font-bold text-text-primary focus:outline-none"
                />
                <button onClick={saveGroupName} disabled={savingName} className="text-xs font-bold text-win hover:underline disabled:opacity-50">
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs text-muted hover:text-text-primary">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-bold text-text-primary truncate">{group?.name ?? '…'}</h1>
                {group && session && group.owner.id === session.user.id && (
                  <button
                    onClick={() => { setNameInput(group.name); setEditingName(true) }}
                    className="shrink-0 text-muted hover:text-text-primary transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {!editingName && group?.description && (
              <p className="text-xs text-muted truncate">{group.description}</p>
            )}
          </div>
          {/* Invite code */}
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-bold text-muted hover:text-text-primary hover:border-border-bright transition-colors"
          >
            <Hash className="h-3 w-3" />
            {group?.inviteCode ?? '------'}
            {copied ? <Check className="h-3 w-3 text-win" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted hover:text-text-primary transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            {group?.members.length ?? 0}
          </button>
        </div>

        {/* Members dropdown */}
        {showMembers && group && (
          <div className="mx-auto max-w-4xl mt-2 rounded-xl border border-border bg-surface p-3 space-y-2 animate-fade-in">
            {group.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {m.user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="text-xs text-text-primary">{m.user.name}</span>
                {m.user.id === group.owner.id && (
                  <span className="text-[10px] text-primary font-bold">owner</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col px-4 py-3">
        {/* Chat column */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Messages */}
          <div className="overflow-y-auto scrollbar-hide space-y-3 pb-4 h-[65vh]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <p className="text-sm text-muted">No messages yet. Say hello!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.userId === session.user.id
              return (
                <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {msg.user.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className={cn('max-w-[75%] space-y-1', isMe ? 'items-end flex flex-col' : 'items-start flex flex-col')}>
                    {!isMe && (
                      <p className="text-[10px] text-muted px-1">{msg.user.name}</p>
                    )}
                    <div className={cn(
                      'rounded-2xl overflow-hidden',
                      isMe ? 'rounded-br-sm' : 'rounded-bl-sm',
                      msg.mediaUrl && !msg.content ? '' : cn(
                        'px-3.5 py-2',
                        isMe ? 'bg-primary text-white' : 'bg-surface-2 border border-border text-text-primary'
                      )
                    )}>
                      {/* Media */}
                      {msg.mediaUrl && msg.mediaType === 'image' && (
                        <img
                          src={msg.mediaUrl}
                          alt="shared image"
                          className="max-w-[260px] max-h-60 w-full object-cover rounded-2xl cursor-pointer"
                          onClick={() => window.open(msg.mediaUrl!, '_blank')}
                        />
                      )}
                      {msg.mediaUrl && msg.mediaType === 'video' && (
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="max-w-[260px] max-h-60 rounded-2xl"
                        />
                      )}
                      {/* Text (only if present) */}
                      {msg.content && (
                        <span className={cn('text-sm leading-snug', msg.mediaUrl ? 'block px-3.5 pt-2 pb-2' : '')}>
                          {msg.content}
                        </span>
                      )}
                    </div>
                    <p className={cn('text-[10px] text-muted px-1', isMe ? 'text-right' : 'text-left')}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="pt-3 border-t border-border space-y-2">
            {/* Media preview */}
            {mediaPreview && (
              <div className="relative inline-block">
                {mediaPreview.type === 'image' ? (
                  <img src={mediaPreview.url} alt="preview" className="h-24 w-auto rounded-xl object-cover border border-border" />
                ) : (
                  <video src={mediaPreview.url} className="h-24 w-auto rounded-xl border border-border" />
                )}
                {uploadingMedia && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {uploadError && <p className="text-xs text-primary">{uploadError}</p>}

            <form onSubmit={sendMessage} className="flex gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted hover:text-text-primary hover:border-border-bright transition-colors disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || uploadingMedia || (!input.trim() && !mediaPreview?.cloudUrl)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
