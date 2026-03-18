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
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  if (room.players.length >= 12) return NextResponse.json({ error: 'Room is full' }, { status: 400 })

  const existing = room.players.find(p => p.userId === session.user.id)
  if (existing) return NextResponse.json({ joined: true })

  await prisma.gamePlayer.create({ data: { roomId: room.id, userId: session.user.id } })
  return NextResponse.json({ joined: true })
}
