import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== session.user.id) return NextResponse.json({ error: 'Only host can rematch' }, { status: 403 })

  await prisma.$transaction([
    prisma.gameMessage.deleteMany({ where: { roomId: room.id } }),
    prisma.gamePlayer.updateMany({
      where: { roomId: room.id },
      data: { role: null, word: null, hasVoted: false, votedFor: null, isEliminated: false },
    }),
    prisma.gameRoom.update({
      where: { id: room.id },
      data: {
        status: 'lobby',
        civilianWord: null,
        imposterWord: null,
        sharedAttr: null,
        currentRound: 1,
        winningSide: null,
        lastStandOutcome: null,
      },
    }),
  ])

  return NextResponse.json({ rematch: true })
}
