'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Copy, Check, Crown, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 7) % 100}%`,
            animationDelay: `${(i % 6) * 0.12}s`,
            backgroundColor: i % 3 === 0 ? '#F59E0B' : i % 3 === 1 ? '#A855F7' : '#10B981',
          }}
        />
      ))}
    </div>
  )
}

interface RoomPlayer {
  id: string
  userId: string
  name: string | null
  hasVoted: boolean
  votedFor: string | null
  isEliminated: boolean
  role: string | null
  word: string | null
  joinedAt: string
}

interface GameMsg {
  id: string
  userId: string
  content: string
  type: string // 'chat' | 'clue' | 'system'
  round: number | null
  createdAt: string
  user: { id: string; name: string | null }
}

interface Room {
  id: string
  code: string
  hostId: string
  status: string
  difficulty: string
  civilianWord: string | null
  imposterWord: string | null
  sharedAttr: string | null
  currentRound: number
  winningSide: string | null
  lastStandOutcome: string | null
  players: RoomPlayer[]
  messages: GameMsg[]
  myRole: string | null
  myWord: string | null
  isMember: boolean
  isHost: boolean
  error?: string
}

export default function GameRoomPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const code = (params.roomCode as string).toUpperCase()
  const selectedGameMode = searchParams.get('game') === 'phantom' ? 'phantom' : 'imposter'
  const isPhantomMode = selectedGameMode === 'phantom'
  const introImage = isPhantomMode ? '/games/phantom-protocol.png' : '/games/find-imposter.png'

  const { data: room, mutate } = useSWR<Room>(
    session ? `/api/game/rooms/${code}` : null,
    fetcher,
    { refreshInterval: 2000 }
  )

  const [chatInput, setChatInput] = useState('')
  const [clueInput, setClueInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [lastStandGuess, setLastStandGuess] = useState('')
  const [submittingLastStand, setSubmittingLastStand] = useState(false)
  const [starting, setStarting] = useState(false)
  const [joining, setJoining] = useState(false)
  const [rematching, setRematching] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(90)
  const [showIntro, setShowIntro] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const NO_VOTE = 'no_vote'

  // Auto-scroll on first load
  useEffect(() => {
    if (room && !initialScrollDone.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        initialScrollDone.current = true
      }, 100)
    }
  }, [room])

  useEffect(() => {
    if (!room) return
    const duration = room.status === 'voting' ? 60 : 90
    setCountdown(duration)
    if (!['active', 'voting'].includes(room.status)) return
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [room?.currentRound, room?.status])

  useEffect(() => {
    setSelectedVote(null)
    setError('')
  }, [room?.currentRound, room?.status])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !room) return
    const shouldPlay = room.isMember && ['active', 'voting', 'last_stand'].includes(room.status)
    if (shouldPlay) {
      audio.volume = 0.15
      audio.play().catch(() => {})
    } else {
      audio.pause()
      audio.currentTime = 0
    }
  }, [room?.status, room?.isMember])

  if (status === 'loading') return null
  if (!session) { router.push('/login'); return null }

  if (!room) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  if (room.error) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-primary font-bold mb-4">Room not found</p>
        <Link href="/games/find-the-imposter" className="text-sm text-muted hover:text-text-primary">← Back to lobby</Link>
      </div>
    </div>
  )

  const myPlayer = room.players.find(p => p.userId === session.user.id)
  const isHost = room.isHost
  const isMember = room.isMember
  const activePlayers = room.players.filter(p => !p.isEliminated)
  const isActivePlayer = !!myPlayer && !myPlayer.isEliminated

  // Current speaker logic
  const cluesThisRound = room.messages.filter(m => m.type === 'clue' && m.round === room.currentRound)
  const speakerIndex = cluesThisRound.length
  const currentSpeaker = room.status === 'active' ? activePlayers[speakerIndex] : null
  const isMyTurn = currentSpeaker?.userId === session.user.id
  const iHaveSubmittedClue = cluesThisRound.some(m => m.userId === session.user.id)

  const clueMessages = room.messages.filter(m => m.type === 'clue')
  const chatMessages = room.messages.filter(m => m.type === 'chat')
  const systemMessages = room.messages.filter(m => m.type === 'system')

  const myVoteCount = activePlayers.filter(p => p.hasVoted).length

  async function copyCode() {
    await navigator.clipboard.writeText(room!.code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function joinRoom() {
    setJoining(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/join`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
    } finally { setJoining(false) }
  }

  async function startGame() {
    setStarting(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
    } finally { setStarting(false) }
  }

  async function sendMessage(type: 'chat' | 'clue', value?: string) {
    const payload = (value ?? (type === 'chat' ? chatInput : clueInput)).trim()
    if (!payload) return
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload, type }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (type === 'chat') setChatInput('')
      else setClueInput('')
      mutate()
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } finally { setSending(false) }
  }

  async function submitVote() {
    if (!selectedVote) return
    setVoting(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedVote }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSelectedVote(null)
      mutate()
    } finally { setVoting(false) }
  }

  async function rematchGame() {
    setRematching(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/rematch`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to rematch'); return }
      setSelectedVote(null)
      setClueInput('')
      setChatInput('')
      mutate()
    } finally { setRematching(false) }
  }

  async function submitLastStand() {
    if (!lastStandGuess.trim()) return
    setSubmittingLastStand(true); setError('')
    try {
      const res = await fetch(`/api/game/rooms/${code}/last-stand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: lastStandGuess.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
    } finally { setSubmittingLastStand(false) }
  }

  const phantomPlayer = room.players.find(p => p.role === 'imposter')
  const roundTimeline = Array.from({ length: 5 }, (_, idx) => {
    const roundNumber = idx + 1
    const cluesThisRound = clueMessages.filter(m => m.round === roundNumber)
    const lastClue = cluesThisRound[cluesThisRound.length - 1]?.content ?? 'Silence lingered this firewall.'
    return {
      round: roundNumber,
      clue: lastClue,
      phantom: 'Corrupted feed kept shifting every time.',
    }
  })
  const recentLore = clueMessages.filter(m => m.round === room.currentRound).slice(-3).reverse()
  const eventLog = systemMessages.slice(-3).reverse()
  const chatLog = chatMessages.slice(-4).reverse()
  const inPlayStatus = ['active', 'voting', 'last_stand'].includes(room.status)
  const introConfig = isPhantomMode
    ? {
        title: 'Phantom Protocol Briefing',
        body: 'Hackers see the true lore. The Phantom sees corrupted hints. Share subtle clues, track inconsistencies, and vote when the tribunal opens.',
      }
    : {
        title: 'Find the Imposter Briefing',
        body: 'Everyone gets a word except the Imposter. Give one clue per round, watch for vague tells, then vote after each round.',
      }
  const shouldShowIntro = showIntro && isMember

  if (isPhantomMode) {
    return (
      <div className="min-h-screen bg-[#030303] text-white">
        {shouldShowIntro && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-xl rounded-2xl border border-[#1f1f1f] bg-[#050505] p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.5em] text-amber-400">Briefing</p>
              <h2 className="text-2xl font-black">{introConfig.title}</h2>
              <p className="text-sm text-muted">{introConfig.body}</p>
              <button
                onClick={() => setShowIntro(false)}
                className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-black uppercase tracking-[0.4em] text-black"
              >
                Enter
              </button>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
          <header className="rounded-3xl border border-[#1f1f1f] bg-[#060606] p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#050505] shadow-sm">
                <Image src={introImage} alt="Phantom Protocol" width={256} height={256} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] text-amber-400">Vault Status</p>
                <h1 className="text-3xl font-black">Firewall {room.currentRound} of 5</h1>
                <p className="text-xs text-muted">
                  {isMember
                    ? myPlayer?.role === 'imposter'
                      ? 'You are the Phantom saboteur.'
                      : 'You are a Hacker decoding the lore.'
                    : 'Spectating the protocol.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="text-[10px] uppercase tracking-[0.4em] text-muted">Timer</span>
              <span className="text-3xl font-black text-amber-400">{formatCountdown(countdown)}</span>
              <button onClick={copyCode} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-black uppercase tracking-[0.4em] text-white">
                {copied ? 'Copied' : `Vault ${room.code}`}
              </button>
            </div>
          </header>

          {room.status === 'lobby' ? (
            <section className="rounded-3xl border border-[#1f1f1f] bg-[#050505] p-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400">Staging Area</p>
                  <p className="text-2xl font-black tracking-[0.3em]">{room.code}</p>
                  <p className="text-xs text-muted">Need 4–8 codebreakers before breaching the vault.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted tracking-[0.4em]">Players</p>
                  <p className="text-xl font-black text-amber-400">{room.players.length}/8</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {room.players.map(p => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2 text-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-slate-500 text-xs font-black text-white">
                      {p.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div>
                      <p className="font-bold text-text-primary">{p.name}</p>
                      <p className="text-[10px] text-muted">{p.userId === room.hostId ? 'Host' : 'Hacker'}</p>
                    </div>
                  </div>
                ))}
              </div>
              {isHost && isMember ? (
                <button onClick={startGame} disabled={starting || room.players.length < 4}
                  className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-black uppercase tracking-[0.4em] text-black disabled:opacity-60">
                  {starting ? 'Initiating…' : room.players.length < 4 ? `Need ${4 - room.players.length} more` : 'Initiate Protocol'}
                </button>
              ) : isMember ? (
                <p className="text-center text-xs text-muted">Waiting for the host to initiate the vault.</p>
              ) : (
                <button onClick={joinRoom} disabled={joining}
                  className="w-full rounded-2xl border border-border py-3 text-sm font-black uppercase tracking-[0.4em]">
                  {joining ? 'Joining…' : 'Breach Vault'}
                </button>
              )}
            </section>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
                <div className="rounded-3xl border border-[#1f1f1f] bg-gradient-to-b from-[#0b0b0b] to-[#040404] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400">The Lore</p>
                      <p className="text-xl font-black">Decrypt the Firewall</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-muted">
                      {room.status === 'active' ? 'Observation' : room.status === 'voting' ? 'Tribunal' : 'Last Stand'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {recentLore.length > 0 ? (
                      recentLore.map(lore => (
                        <p key={lore.id} className="rounded-2xl border border-[#1c1c1c] bg-black/40 px-3 py-2 text-sm text-white">
                          {lore.content}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-muted">Awaiting encrypted clues…</p>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">True Lore Feed</p>
                      <p className="mt-2 text-sm text-white">{room.sharedAttr ?? 'Manuscript still sealed.'}</p>
                    </div>
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-red-300">Sabotage Feed</p>
                      <p className="mt-2 text-sm text-white">
                        {myPlayer?.role === 'imposter'
                          ? 'Your corrupted guidance must stay believable.'
                          : 'The Phantom watches every clue for cracks.'}
                      </p>
                    </div>
                  </div>
                </div>
                <aside className="rounded-3xl border border-[#1f1f1f] bg-[#050505] p-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Comms</p>
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {chatLog.length === 0 ? (
                          <p className="text-xs text-muted">Channel is quiet.</p>
                        ) : (
                          chatLog.map(msg => (
                            <div key={msg.id} className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                              <p className="text-[10px] text-muted">{msg.user.name ?? 'Unknown'}</p>
                              <p>{msg.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Event Log</p>
                      <div className="mt-2 space-y-1 text-[11px] text-muted">
                        {eventLog.length === 0 ? (
                          <p>System watching the protocol.</p>
                        ) : (
                          eventLog.map(evt => (
                            <p key={evt.id} className="text-white/70">{evt.content}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
              {inPlayStatus && (
                <div className="rounded-3xl border border-[#1f1f1f] bg-[#050505] p-5">
                  {room.status === 'active' && isMember ? (
                    <div className="space-y-3">
                      {isMyTurn && !iHaveSubmittedClue && (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300">Your clue · Round {room.currentRound}</p>
                          <div className="flex gap-2">
                            <input
                              value={clueInput}
                              onChange={e => setClueInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage('clue', clueInput)}
                              placeholder="Drop a cryptic clue…"
                              className="flex-1 rounded-2xl border border-amber-500/60 bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-muted focus:border-amber-500 focus:outline-none"
                            />
                            <button onClick={() => sendMessage('clue', clueInput)} disabled={!clueInput.trim() || sending}
                              className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black uppercase tracking-[0.4em] text-black disabled:opacity-50">
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage('chat', chatInput)}
                          placeholder={iHaveSubmittedClue ? 'Chat while others give clues…' : 'Chat…'}
                          className="flex-1 rounded-2xl border border-border bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
                        />
                        <button onClick={() => sendMessage('chat', chatInput)} disabled={!chatInput.trim() || sending}
                          className="rounded-2xl bg-primary px-4 py-2 text-sm font-black uppercase tracking-[0.4em] text-white disabled:opacity-50">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      {error && <p className="text-xs text-amber-400 mt-1">{error}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Awaiting the next command window.</p>
                  )}
                </div>
              )}
            </>
          )}
          {false && (
            <section className="rounded-3xl border border-red-600 bg-red-950/70 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-red-400">Tribunal</p>
                  <p className="text-lg font-black">Round {room!.currentRound} - Cast your vote</p>
                </div>
                <span className="text-2xl font-black text-white">{formatCountdown(countdown)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <button onClick={() => setSelectedVote(NO_VOTE)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.3em] transition-all',
                    selectedVote === NO_VOTE ? 'border-amber-400 text-amber-400' : 'border-border bg-[#0b0b0b] text-white'
                  )}>
                  <span className="text-sm">No Vote</span>
                  <span className="text-[10px] text-muted">Abstain</span>
                </button>
                {activePlayers.map(p => (
                  <button key={p.userId} onClick={() => setSelectedVote(p.userId)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.3em] transition-all',
                      selectedVote === p.userId ? 'border-amber-400 text-amber-400' : 'border-border bg-[#0b0b0b] text-white'
                    )}>
                    <span className="text-sm">{p.name}</span>
                    <span className="text-[10px] text-muted">{p.hasVoted ? 'Voted' : 'Awaiting'}</span>
                  </button>
                ))}
              </div>
              {isActivePlayer && myPlayer && !myPlayer!.hasVoted ? (
                <button onClick={submitVote} disabled={!selectedVote || voting}
                  className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-black uppercase tracking-[0.4em] text-black disabled:opacity-50">
                  {voting
                    ? 'Casting...'
                    : selectedVote === NO_VOTE
                    ? 'Submit No Vote'
                    : selectedVote
                    ? `Vote for ${room!.players.find(p => p.userId === selectedVote)?.name}`
                    : 'Select Operative'}
                </button>
              ) : (
                <p className="text-xs text-muted text-center">
                  {myPlayer?.hasVoted ? 'Vote submitted · awaiting tally' : 'Tribunal locked until every operative votes.'}
                </p>
              )}
            </section>
          )}
          {room.status === 'voting' && (
            <section className="rounded-3xl border border-red-600 bg-red-950/70 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-red-400">Tribunal</p>
                  <p className="text-lg font-black">Round {room.currentRound} - Cast your vote</p>
                </div>
                <span className="text-2xl font-black text-white">{formatCountdown(countdown)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <button onClick={() => setSelectedVote(NO_VOTE)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.3em] transition-all',
                    selectedVote === NO_VOTE ? 'border-amber-400 text-amber-400' : 'border-border bg-[#0b0b0b] text-white'
                  )}>
                  <span className="text-sm">No Vote</span>
                  <span className="text-[10px] text-muted">Abstain</span>
                </button>
                {activePlayers.map(p => (
                  <button key={p.userId} onClick={() => setSelectedVote(p.userId)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.3em] transition-all',
                      selectedVote === p.userId ? 'border-amber-400 text-amber-400' : 'border-border bg-[#0b0b0b] text-white'
                    )}>
                    <span className="text-sm">{p.name}</span>
                    <span className="text-[10px] text-muted">{p.hasVoted ? 'Voted' : 'Awaiting'}</span>
                  </button>
                ))}
              </div>
              {!isActivePlayer || !myPlayer ? (
                <p className="text-xs text-muted text-center">You were eliminated and can only observe.</p>
              ) : isMember && !myPlayer.hasVoted ? (
                <button onClick={submitVote} disabled={!selectedVote || voting}
                  className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-black uppercase tracking-[0.4em] text-black disabled:opacity-50">
                  {voting
                    ? 'Casting...'
                    : selectedVote === NO_VOTE
                    ? 'Submit No Vote'
                    : selectedVote
                    ? `Vote for ${room!.players.find(p => p.userId === selectedVote)?.name}`
                    : 'Select Operative'}
                </button>
              ) : (
                <p className="text-xs text-muted text-center">
                  {myPlayer?.hasVoted ? 'Vote submitted - awaiting tally' : 'Tribunal locked until every operative votes.'}
                </p>
              )}
            </section>
          )}

          {room.status === 'completed' && (
            <section className="rounded-3xl border border-[#1f1f1f] bg-[#050505] p-6 space-y-4 relative overflow-hidden">
              <ConfettiBurst />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.5em] text-muted">Aftermath</p>
                  <h2 className="text-2xl font-black text-white">
                    Phantom {phantomPlayer ? `· ${phantomPlayer.name}` : '· Unknown'}
                  </h2>
                  <p className="text-sm text-muted">
                    {room.winningSide === 'civilian' ? 'Hackers prevailed' : 'Phantom prevailed'}
                  </p>
                </div>
                <Link href="/games" className="text-xs uppercase tracking-[0.4em] text-amber-400">Play Again</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {roundTimeline.map(entry => (
                  <div key={entry.round} className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Firewall {entry.round}</p>
                    <p className="mt-1 text-sm text-text-primary">{entry.clue}</p>
                    <p className="text-[10px] text-amber-400">{entry.phantom}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  const difficultyColor = room.difficulty === 'easy' ? 'text-green-400' : room.difficulty === 'hard' ? 'text-primary' : 'text-amber-400'

  return (
    <div className="flex flex-col min-h-screen h-[100dvh] bg-background">
      <audio
        ref={audioRef}
        src={isPhantomMode ? '/audio/phantom-protocol-bgm.weba' : '/audio/imposter-theme.webm'}
        loop
      />
      {shouldShowIntro && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface p-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.5em] text-amber-400">Briefing</p>
            <h2 className="text-2xl font-black text-text-primary">{introConfig.title}</h2>
            <p className="text-sm text-muted">{introConfig.body}</p>
            <button
              onClick={() => setShowIntro(false)}
              className="w-full rounded-xl bg-primary py-3 text-sm font-black text-white"
            >
              Enter
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shrink-0">
        <Link href="/games/find-the-imposter" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 border border-border text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-9 w-9 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
          <Image src={introImage} alt="Find the Imposter" width={128} height={128} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-text-primary">🕵️ Find the Imposter</span>
            <span className={cn('text-[10px] font-bold uppercase', difficultyColor)}>{room.difficulty}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            {room.status === 'lobby' && <span>{room.players.length} players in lobby</span>}
            {room.status === 'active' && <span className="text-amber-400 font-bold">Round {room.currentRound} of 5</span>}
            {room.status === 'voting' && <span className="text-amber-400 font-bold">Voting · {myVoteCount}/{activePlayers.length} voted</span>}
            {room.status === 'last_stand' && <span className="text-primary font-bold">Last Stand!</span>}
            {room.status === 'completed' && <span className="text-green-400 font-bold">Game Over</span>}
          </div>
        </div>
        {/* Room code */}
        <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-black text-text-secondary hover:text-text-primary transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {room.code}
        </button>
      </div>

      {/* Word banner — shown during active/voting/last_stand for members */}
      {isMember && room.myWord && room.status !== 'lobby' && room.status !== 'completed' && (
        <div className={cn(
          'shrink-0 border-b px-4 py-2.5 flex items-center justify-between',
          room.myRole === 'imposter'
            ? 'border-primary/30 bg-primary/5'
            : 'border-green-500/30 bg-green-500/5'
        )}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Your word</p>
            <p className={cn('text-lg font-black', room.myRole === 'imposter' ? 'text-primary' : 'text-green-400')}>
              {room.myWord}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Your role</p>
            <p className={cn('text-sm font-black', room.myRole === 'imposter' ? 'text-primary' : 'text-green-400')}>
              {room.myRole === 'imposter' ? '🕵️ Imposter' : '👤 Civilian'}
            </p>
          </div>
        </div>
      )}

      {/* Current speaker banner */}
      {room.status === 'active' && currentSpeaker && (
        <div className="shrink-0 border-b border-border bg-surface-2 px-4 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-muted">
            {isMyTurn
              ? <span className="text-amber-400 font-bold">Your turn to give a clue!</span>
              : <span>Waiting for <span className="text-text-primary font-bold">{currentSpeaker.name}</span> to speak…</span>}
          </span>
        </div>
      )}

      {/* Lobby screen */}
      {room.status === 'lobby' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Players ({room.players.length}/12)</p>
            <div className="space-y-2">
              {room.players.map(p => (
                <div key={p.userId} className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {p.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm text-text-primary">{p.name}</span>
                  {p.userId === room.hostId && <Crown className="h-3 w-3 text-amber-400" />}
                  {p.userId === session.user.id && <span className="text-[10px] text-muted">(you)</span>}
                </div>
              ))}
            </div>
          </div>

          {!isMember && (
            <button onClick={joinRoom} disabled={joining}
              className="w-full rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50">
              {joining ? 'Joining…' : 'Join Game'}
            </button>
          )}

          {isHost && isMember && (
            <button onClick={startGame} disabled={starting || room.players.length < 3}
              className="w-full rounded-xl bg-primary py-4 text-sm font-black text-white disabled:opacity-50">
              {starting ? 'Starting…' : room.players.length < 3 ? `Need ${3 - room.players.length} more player${room.players.length === 2 ? '' : 's'}` : 'Start Game →'}
            </button>
          )}

          {!isHost && isMember && (
            <p className="text-center text-xs text-muted">Waiting for the host to start…</p>
          )}

          {error && <p className="text-sm text-primary text-center">{error}</p>}

          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs text-muted mb-1">Share this code with friends:</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-text-primary tracking-[0.3em]">{room.code}</span>
              <button onClick={copyCode} className="ml-auto rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-muted hover:text-text-primary">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed screen */}
      {room.status === 'completed' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={cn('rounded-2xl border p-6 text-center relative overflow-hidden',
            room.winningSide === 'civilian' ? 'border-green-500/30 bg-green-500/5' : 'border-primary/30 bg-primary/5'
          )}>
            <ConfettiBurst />
            <div className="text-5xl mb-3">{room.winningSide === 'civilian' ? '🎉' : '🕵️'}</div>
            <h2 className="text-2xl font-black text-text-primary mb-1">
              {room.winningSide === 'civilian' ? 'Civilians Win!' : 'Imposter Wins!'}
            </h2>
            {room.lastStandOutcome && (
              <p className="text-sm text-muted">
                {room.lastStandOutcome === 'success' ? 'The Imposter guessed the word correctly!' : 'The Imposter failed the Last Stand!'}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">The Words</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
                <p className="text-[10px] text-muted mb-1">Civilian Word</p>
                <p className="text-lg font-black text-green-400">{room.civilianWord}</p>
              </div>
              <div className="flex-1 rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-[10px] text-muted mb-1">Imposter Word</p>
                <p className="text-lg font-black text-primary">{room.imposterWord}</p>
              </div>
            </div>
            {room.sharedAttr && <p className="text-[11px] text-muted text-center">Shared: {room.sharedAttr}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Roles Revealed</p>
            <div className="space-y-2">
              {room.players.map(p => (
                <div key={p.userId} className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold w-20 shrink-0', p.role === 'imposter' ? 'text-primary' : 'text-green-400')}>
                    {p.role === 'imposter' ? '🕵️ Imposter' : '👤 Civilian'}
                  </span>
                  <span className="text-sm text-text-primary">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button onClick={rematchGame} disabled={rematching}
              className="block w-full rounded-xl border border-border bg-surface py-3 text-sm font-black text-white text-center disabled:opacity-50">
              {rematching ? 'Resetting...' : 'Rematch'}
            </button>
          ) : (
            <p className="text-center text-xs text-muted">Waiting for the host to start a rematch.</p>
          )}

          <Link href="/games/find-the-imposter"
            className="block w-full rounded-xl bg-primary py-3 text-sm font-black text-white text-center">
            Play Again
          </Link>
        </div>
      )}

      {/* Chat area (active, voting, last_stand) */}
      {['active', 'voting', 'last_stand'].includes(room.status) && (
        <div className="flex-1 overflow-y-auto p-3 pb-24 sm:pb-6 space-y-2">
          {room.messages.map(msg => {
            const isMe = msg.userId === session.user.id
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted text-center max-w-xs">
                    {msg.content}
                  </span>
                </div>
              )
            }
            if (msg.type === 'clue') {
              return (
                <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                  <div className={cn('rounded-xl px-3 py-2 max-w-[75%] space-y-0.5',
                    isMe ? 'bg-primary/15 border border-primary/20' : 'bg-amber-500/10 border border-amber-500/20'
                  )}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Clue · R{msg.round}</span>
                      <span className="text-[9px] text-muted">{msg.user.name}</span>
                    </div>
                    <p className="text-sm text-text-primary">{msg.content}</p>
                  </div>
                </div>
              )
            }
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                <div className={cn('rounded-2xl px-3 py-2 max-w-[75%]',
                  isMe ? 'bg-primary text-white' : 'bg-surface border border-border text-text-primary'
                )}>
                  {!isMe && <p className="text-[10px] text-muted font-semibold mb-0.5">{msg.user.name}</p>}
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Voting overlay */}
      {false && (
        <div className="shrink-0 border-t border-border bg-surface p-3 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)] space-y-2">
          {myPlayer?.hasVoted ? (
            <p className="text-center text-xs text-muted py-2">You voted · Waiting for {activePlayers.length - myVoteCount} more…</p>
          ) : (
            <>
              <p className="text-xs font-bold text-muted uppercase tracking-wider text-center">Vote — who is the Imposter?</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activePlayers.filter(p => p.userId !== session!.user.id).map(p => (
                  <button key={p.userId} onClick={() => setSelectedVote(p.userId)}
                    className={cn('shrink-0 rounded-xl border px-3 py-2 text-sm font-bold transition-all',
                      selectedVote === p.userId ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                    )}>
                    {p.name}
                  </button>
                ))}
              </div>
              <button onClick={submitVote} disabled={!selectedVote || voting}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-black text-white disabled:opacity-50">
                {voting ? 'Submitting…' : selectedVote ? `Vote for ${room!.players.find(p => p.userId === selectedVote)?.name}` : 'Select a player'}
              </button>
              {error && <p className="text-xs text-primary text-center">{error}</p>}
            </>
          )}
        </div>
      )}

      {/* Voting overlay (active players only) */}
      {room.status === 'voting' && isMember && (
        <div className="shrink-0 border-t border-border bg-surface p-3 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)] space-y-2">
          {!isActivePlayer ? (
            <p className="text-center text-xs text-muted py-2">You were eliminated. Spectating this round.</p>
          ) : myPlayer?.hasVoted ? (
            <p className="text-center text-xs text-muted py-2">You voted - Waiting for {activePlayers.length - myVoteCount} more...</p>
          ) : (
            <>
              <p className="text-xs font-bold text-muted uppercase tracking-wider text-center">Vote - who is the Imposter?</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedVote(NO_VOTE)}
                  className={cn('shrink-0 rounded-xl border px-3 py-2 text-sm font-bold transition-all',
                    selectedVote === NO_VOTE ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                  )}>
                  No Vote
                </button>
                {activePlayers.filter(p => p.userId !== session.user.id).map(p => (
                  <button key={p.userId} onClick={() => setSelectedVote(p.userId)}
                    className={cn('shrink-0 rounded-xl border px-3 py-2 text-sm font-bold transition-all',
                      selectedVote === p.userId ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                    )}>
                    {p.name}
                  </button>
                ))}
              </div>
              <button onClick={submitVote} disabled={!selectedVote || voting}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-black text-white disabled:opacity-50">
                {voting
                  ? 'Submitting...'
                  : selectedVote === NO_VOTE
                  ? 'Submit No Vote'
                  : selectedVote
                  ? `Vote for ${room.players.find(p => p.userId === selectedVote)?.name}`
                  : 'Select a player'}
              </button>
              {error && <p className="text-xs text-primary text-center">{error}</p>}
            </>
          )}
        </div>
      )}

      {/* Last Stand input */}
      {room.status === 'last_stand' && room.myRole === 'imposter' && (
        <div className="shrink-0 border-t border-primary/30 bg-primary/5 p-3 space-y-2 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
          <p className="text-xs font-bold text-primary text-center uppercase tracking-wider">Last Stand — Guess the Civilian Word</p>
          <div className="flex gap-2">
            <input
              value={lastStandGuess}
              onChange={e => setLastStandGuess(e.target.value)}
              placeholder="Type the civilian word…"
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button onClick={submitLastStand} disabled={!lastStandGuess.trim() || submittingLastStand}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
              {submittingLastStand ? '…' : 'Guess'}
            </button>
          </div>
          {error && <p className="text-xs text-primary">{error}</p>}
        </div>
      )}

      {room.status === 'last_stand' && room.myRole !== 'imposter' && isMember && (
        <div className="shrink-0 border-t border-border bg-surface p-3 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
          <p className="text-center text-xs text-muted">The Imposter is taking their Last Stand guess…</p>
        </div>
      )}

      {room.status === 'active' && isMember && !isActivePlayer && (
        <div className="shrink-0 border-t border-border bg-surface p-3 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
          <p className="text-center text-xs text-muted">You were eliminated and can only observe.</p>
        </div>
      )}

      {/* Chat input (active phase) */}
      {room.status === 'active' && isActivePlayer && (
        <div className="shrink-0 border-t border-border bg-surface p-3 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage('chat', chatInput)}
                placeholder={iHaveSubmittedClue ? 'Chat while others give clues…' : 'Chat…'}
                className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button onClick={() => sendMessage('chat', chatInput)} disabled={!chatInput.trim() || sending}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-primary mt-1">{error}</p>}
        </div>
      )}

      {/* Clue pop-up (centered) */}
      {room.status === 'active' && isActivePlayer && isMyTurn && !iHaveSubmittedClue && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0b0b0b] p-4 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Your clue · Round {room.currentRound}</p>
            <p className="text-xs text-muted mt-1">Give a short clue about your word.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={clueInput}
                onChange={e => setClueInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage('clue', clueInput)}
                placeholder="Type your clue…"
                className="flex-1 rounded-xl border border-amber-500/40 bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-amber-500 focus:outline-none"
              />
              <button onClick={() => sendMessage('clue', clueInput)} disabled={!clueInput.trim() || sending}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
            {error && <p className="text-xs text-amber-400 mt-2">{error}</p>}
          </div>
        </div>
      )}
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          opacity: 0.9;
          animation: confetti-fall 1.6s ease-in infinite;
        }

        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(140px) rotate(240deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}





