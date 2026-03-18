import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      host: { select: { id: true, name: true } },
      players: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // Only expose the requesting player's own word/role
  const myPlayer = room.players.find(p => p.userId === session.user.id)
  const sanitizedPlayers = room.players.map(p => ({
    id: p.id,
    userId: p.userId,
    name: p.user.name,
    hasVoted: p.hasVoted,
    votedFor: room.status === 'completed' ? p.votedFor : null,
    role: p.userId === session.user.id ? p.role : (room.status === 'completed' ? p.role : null),
    word: p.userId === session.user.id ? p.word : null,
    isEliminated: p.isEliminated,
    joinedAt: p.joinedAt,
  }))

  return NextResponse.json({
    ...room,
    players: sanitizedPlayers,
    myRole: myPlayer?.role ?? null,
    myWord: myPlayer?.word ?? null,
    isMember: !!myPlayer,
    isHost: room.hostId === session.user.id,
  })
}
