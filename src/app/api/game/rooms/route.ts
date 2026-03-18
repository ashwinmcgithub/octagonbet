import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { difficulty = 'medium' } = await req.json().catch(() => ({}))
  const code = nanoid(6).toUpperCase()

  const room = await prisma.gameRoom.create({
    data: {
      code,
      hostId: session.user.id,
      difficulty,
      players: { create: { userId: session.user.id } },
    },
    include: { players: { include: { user: { select: { id: true, name: true } } } } },
  })

  return NextResponse.json(room)
}
