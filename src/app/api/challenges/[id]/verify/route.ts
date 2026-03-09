import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPayout } from '@/lib/challenge-payout'

// ── Game result fetchers ────────────────────────────────────────────────────

interface GameResult {
  winnerUsername: string | null // null = draw
  isDraw: boolean
  raw: Record<string, unknown>
}

async function fetchChessCom(gameId: string): Promise<GameResult> {
  const res = await fetch(`https://api.chess.com/pub/game/${gameId}`, {
    headers: { 'User-Agent': 'OctagonBet/1.0' },
  })
  if (!res.ok) throw new Error(`Chess.com API error: ${res.status}`)
  const data = await res.json() as {
    white: { username: string; result: string }
    black: { username: string; result: string }
  }
  if (data.white.result === 'win') return { winnerUsername: data.white.username.toLowerCase(), isDraw: false, raw: data as Record<string, unknown> }
  if (data.black.result === 'win') return { winnerUsername: data.black.username.toLowerCase(), isDraw: false, raw: data as Record<string, unknown> }
  return { winnerUsername: null, isDraw: true, raw: data as Record<string, unknown> }
}

async function fetchLichess(gameId: string): Promise<GameResult> {
  const res = await fetch(`https://lichess.org/api/game/${gameId}?opening=false`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'OctagonBet/1.0' },
  })
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`)
  const data = await res.json() as {
    players: { white: { user?: { name: string } }; black: { user?: { name: string } } }
    winner?: 'white' | 'black'
    status: string
  }
  if (!data.winner) return { winnerUsername: null, isDraw: true, raw: data as Record<string, unknown> }
  const winnerUser = data.winner === 'white' ? data.players.white.user : data.players.black.user
  return { winnerUsername: winnerUser?.name.toLowerCase() ?? null, isDraw: false, raw: data as Record<string, unknown> }
}

// ── Extract game ID from URL ────────────────────────────────────────────────

function extractChessComId(url: string): string | null {
  // https://www.chess.com/game/live/12345678  or  /daily/...
  const match = url.match(/chess\.com\/game\/(?:live|daily|blitz|bullet|rapid)\/(\d+)/i)
  return match?.[1] ?? null
}

function extractLichessId(url: string): string | null {
  // https://lichess.org/AbCdEfGh or /AbCdEfGh/white
  const match = url.match(/lichess\.org\/([a-zA-Z0-9]{8})/)
  return match?.[1] ?? null
}

// ── POST /api/challenges/[id]/verify ───────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMember = challenge.participants.some((p) => p.userId === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  if (!['active', 'awaiting_resolution'].includes(challenge.status)) {
    return NextResponse.json({ error: 'Challenge is not in a verifiable state' }, { status: 400 })
  }

  if (!challenge.verificationSource || !challenge.verificationGameUrl) {
    return NextResponse.json({ error: 'No game verification configured for this challenge' }, { status: 400 })
  }

  // "link" type — no auto-resolve, just acknowledge
  if (challenge.verificationSource === 'link') {
    return NextResponse.json({ type: 'link', url: challenge.verificationGameUrl, message: 'Open the game link and check who won, then submit proof or accept defeat.' })
  }

  // Fetch result from game API
  let result: GameResult
  try {
    if (challenge.verificationSource === 'chess.com') {
      const gameId = challenge.verificationGameId ?? extractChessComId(challenge.verificationGameUrl)
      if (!gameId) return NextResponse.json({ error: 'Could not extract game ID from Chess.com URL' }, { status: 400 })
      result = await fetchChessCom(gameId)
    } else if (challenge.verificationSource === 'lichess') {
      const gameId = challenge.verificationGameId ?? extractLichessId(challenge.verificationGameUrl)
      if (!gameId) return NextResponse.json({ error: 'Could not extract game ID from Lichess URL' }, { status: 400 })
      result = await fetchLichess(gameId)
    } else {
      return NextResponse.json({ error: 'Unknown verification source' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch game result'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (result.isDraw) {
    return NextResponse.json({ type: 'draw', message: 'The game ended in a draw. No winner to determine.' })
  }

  if (!result.winnerUsername) {
    return NextResponse.json({ type: 'unknown', message: 'Could not determine winner from game data.' })
  }

  // Map winner username to a side
  const teamA = challenge.teamAUsername?.toLowerCase()
  const teamB = challenge.teamBUsername?.toLowerCase()

  let winningSide: 'a' | 'b' | null = null
  if (teamA && result.winnerUsername === teamA) winningSide = 'a'
  else if (teamB && result.winnerUsername === teamB) winningSide = 'b'

  if (!winningSide) {
    return NextResponse.json({
      type: 'unmatched',
      winnerUsername: result.winnerUsername,
      message: `Game winner is "${result.winnerUsername}" but we couldn't match them to Team A (${teamA ?? '?'}) or Team B (${teamB ?? '?'}). Check the usernames.`,
    })
  }

  // Auto-resolve the challenge
  await prisma.$transaction(async (tx) => {
    await runPayout(tx, challenge, winningSide!, {})
  })

  return NextResponse.json({
    type: 'resolved',
    winningSide,
    winnerUsername: result.winnerUsername,
    message: `Game verified! ${result.winnerUsername} (Team ${winningSide.toUpperCase()}) wins.`,
  })
}
