import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params
  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'No target' }, { status: 400 })

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (room.status !== 'voting') return NextResponse.json({ error: 'Not voting phase' }, { status: 400 })

  const myPlayer = room.players.find(p => p.userId === session.user.id)
  if (!myPlayer) return NextResponse.json({ error: 'Not a player' }, { status: 403 })
  if (myPlayer.isEliminated) return NextResponse.json({ error: 'Eliminated players can only observe' }, { status: 403 })
  if (myPlayer.hasVoted) return NextResponse.json({ error: 'Already voted' }, { status: 400 })

  const NO_VOTE = 'no_vote'
  const activePlayers = room.players.filter(p => !p.isEliminated)
  const validTargets = new Set(activePlayers.map(p => p.userId))
  if (targetUserId !== NO_VOTE && !validTargets.has(targetUserId)) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }
  if (targetUserId === session.user.id) return NextResponse.json({ error: 'Cannot vote for yourself' }, { status: 400 })

  await prisma.gamePlayer.update({
    where: { id: myPlayer.id },
    data: { hasVoted: true, votedFor: targetUserId },
  })

  // Check if all players voted
  const updatedPlayers = await prisma.gamePlayer.findMany({ where: { roomId: room.id } })
  const activeUpdated = updatedPlayers.filter(p => !p.isEliminated)
  const allVoted = activeUpdated.every(p => p.hasVoted)

  if (allVoted) {
    // Tally votes
    const tally: Record<string, number> = {}
    for (const p of activeUpdated) {
      if (!p.votedFor || p.votedFor === NO_VOTE) continue
      if (!validTargets.has(p.votedFor)) continue
      tally[p.votedFor] = (tally[p.votedFor] ?? 0) + 1
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
    const topCount = sorted[0]?.[1] ?? 0
    const topTargets = sorted.filter(([, c]) => c === topCount)

    const imposterPlayer = updatedPlayers.find(p => p.role === 'imposter')
    const majorityThreshold = Math.floor(activeUpdated.length / 2) + 1

    const isTie = topTargets.length > 1
    const pickedImposter = sorted[0]?.[0] === imposterPlayer?.userId
    const hasMajority = topCount >= majorityThreshold

    if (!isTie && pickedImposter && hasMajority) {
      // Imposter caught - last stand
      await prisma.$transaction([
        prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'last_stand' } }),
        prisma.gameMessage.create({ data: { roomId: room.id, userId: session.user.id, content: 'The Imposter was caught! Last Stand begins - guess the Civilian word.', type: 'system' } }),
      ])
    } else {
      const pickedTarget = sorted[0]?.[0] ?? null
      const shouldEliminate = !isTie && hasMajority && pickedTarget
      const isFinalRound = room.currentRound >= 5
      if (isFinalRound) {
        await prisma.$transaction([
          prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'completed', winningSide: 'imposter' } }),
          ...(shouldEliminate ? [prisma.gamePlayer.update({ where: { roomId_userId: { roomId: room.id, userId: pickedTarget as string } }, data: { isEliminated: true } })] : []),
          prisma.gameMessage.create({ data: { roomId: room.id, userId: session.user.id, content: shouldEliminate ? 'Wrong player eliminated. The Imposter escapes. Imposter wins!' : 'Vote failed. The Imposter escapes. Imposter wins!', type: 'system' } }),
        ])
      } else {
        await prisma.$transaction([
          prisma.gamePlayer.updateMany({ where: { roomId: room.id }, data: { hasVoted: false, votedFor: null } }),
          ...(shouldEliminate ? [prisma.gamePlayer.update({ where: { roomId_userId: { roomId: room.id, userId: pickedTarget as string } }, data: { isEliminated: true } })] : []),
          prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'active', currentRound: room.currentRound + 1 } }),
          prisma.gameMessage.create({
            data: {
              roomId: room.id,
              userId: session.user.id,
              content: shouldEliminate
                ? `A player was eliminated. Round ${room.currentRound + 1} begins!`
                : `Vote failed. Round ${room.currentRound + 1} begins!`,
              type: 'system',
            },
          }),
        ])
      }
    }
  }

  return NextResponse.json({ voted: true })
}
