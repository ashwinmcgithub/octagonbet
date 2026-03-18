import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pickWordPair } from '@/lib/game-words'
import type { Difficulty } from '@/lib/game-words'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== session.user.id) return NextResponse.json({ error: 'Only host can start' }, { status: 403 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Already started' }, { status: 400 })
  if (room.players.length < 3) return NextResponse.json({ error: 'Need at least 3 players' }, { status: 400 })

  const pair = pickWordPair(room.difficulty as Difficulty)
  const shuffled = shuffle(room.players)
  const imposterIndex = Math.floor(Math.random() * shuffled.length)

  await prisma.$transaction([
    prisma.gameRoom.update({
      where: { id: room.id },
      data: {
        status: 'active',
        civilianWord: pair.civilianWord,
        imposterWord: pair.imposterWord,
        sharedAttr: pair.sharedAttribute,
        currentRound: 1,
      },
    }),
    ...shuffled.map((player, i) =>
      prisma.gamePlayer.update({
        where: { id: player.id },
        data: {
          role: i === imposterIndex ? 'imposter' : 'civilian',
          word: i === imposterIndex ? pair.imposterWord : pair.civilianWord,
          hasVoted: false,
          votedFor: null,
          isEliminated: false,
        },
      })
    ),
    prisma.gameMessage.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        content: `Game started! Round 1 of 5 — each player gives one clue about their word.`,
        type: 'system',
      },
    }),
  ])

  return NextResponse.json({ started: true })
}
