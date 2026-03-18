import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const room = await prisma.gameRoom.findUnique({ where: { code: code.toUpperCase() } })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const messages = await prisma.gameMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params
  const { content, type = 'chat' } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { joinedAt: 'asc' } },
      messages: { where: { type: 'clue' } },
    },
  })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const myPlayer = room.players.find(p => p.userId === session.user.id)
  if (!myPlayer) return NextResponse.json({ error: 'Not a player' }, { status: 403 })
  if (myPlayer.isEliminated) return NextResponse.json({ error: 'Eliminated players can only observe' }, { status: 403 })

  const activePlayers = room.players.filter(p => !p.isEliminated)

  // If submitting a clue, validate it's this player's turn
  if (type === 'clue') {
    if (room.status !== 'active') return NextResponse.json({ error: 'Not in clue phase' }, { status: 400 })

    const cluesThisRound = room.messages.filter(m => m.round === room.currentRound)
    const alreadySubmitted = cluesThisRound.some(m => m.userId === session.user.id)
    if (alreadySubmitted) return NextResponse.json({ error: 'Already submitted clue this round' }, { status: 400 })

    // Check it's their turn (index = cluesThisRound.length)
    const speakerIndex = cluesThisRound.length
    const currentSpeaker = activePlayers[speakerIndex]
    if (!currentSpeaker || currentSpeaker.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    }

    const msg = await prisma.gameMessage.create({
      data: { roomId: room.id, userId: session.user.id, content: content.trim(), type: 'clue', round: room.currentRound },
      include: { user: { select: { id: true, name: true } } },
    })

    // Check if round is complete (all players submitted)
    const totalCluesThisRound = cluesThisRound.length + 1
    if (totalCluesThisRound >= activePlayers.length) {
      const roundLabel = room.currentRound >= 5 ? 'Final round' : `Round ${room.currentRound}`
      // Move to voting after every round
      await prisma.$transaction([
        prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'voting' } }),
        prisma.gameMessage.create({
          data: { roomId: room.id, userId: session.user.id, content: `${roundLabel} complete! Voting is now open - kick out the Imposter?`, type: 'system' },
        }),
      ])
    }

    return NextResponse.json(msg)
  }

  // Regular chat message - allowed any time while game is active
  if (!['lobby', 'active', 'voting', 'last_stand'].includes(room.status)) {
    return NextResponse.json({ error: 'Game ended' }, { status: 400 })
  }

  const msg = await prisma.gameMessage.create({
    data: { roomId: room.id, userId: session.user.id, content: content.trim(), type: 'chat' },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(msg)
}
