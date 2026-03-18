import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params
  const { guess } = await req.json()
  if (!guess?.trim()) return NextResponse.json({ error: 'No guess' }, { status: 400 })

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (room.status !== 'last_stand') return NextResponse.json({ error: 'Not last stand phase' }, { status: 400 })

  const myPlayer = room.players.find(p => p.userId === session.user.id)
  if (!myPlayer || myPlayer.role !== 'imposter') return NextResponse.json({ error: 'Only the Imposter can guess' }, { status: 403 })

  const success = guess.trim().toLowerCase() === (room.civilianWord ?? '').toLowerCase()
  const outcome = success ? 'success' : 'failure'
  const winningSide = success ? 'imposter' : 'civilian'
  const resultMsg = success
    ? `The Imposter guessed correctly — "${room.civilianWord}"! Imposter wins!`
    : `Wrong guess! The Civilian word was "${room.civilianWord}". Civilians win!`

  await prisma.$transaction([
    prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'completed', winningSide, lastStandOutcome: outcome } }),
    prisma.gameMessage.create({ data: { roomId: room.id, userId: session.user.id, content: resultMsg, type: 'system' } }),
  ])

  return NextResponse.json({ outcome, winningSide })
}
