import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPayout } from '@/lib/challenge-payout'

async function fetchChallenge(id: string) {
  return prisma.challenge.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, image: true, reputation: true } },
      participants: { include: { user: { select: { id: true, name: true, image: true, reputation: true } } } },
      proofs: { include: { submitter: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
}

// GET /api/challenges/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let challenge = await fetchChallenge(params.id)
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-resolve if deadline has passed
  if (
    challenge.status === 'awaiting_resolution' &&
    challenge.resolveDeadline &&
    challenge.resolveDeadline < new Date()
  ) {
    try {
      await prisma.$transaction(async (tx) => {
        await runPayout(tx, challenge!, challenge!.winningSide!, {})
      })
      // Re-fetch the updated challenge
      challenge = await fetchChallenge(params.id)
    } catch {
      // If payout fails (e.g. already resolved), just return current state
    }
  }

  return NextResponse.json(challenge)
}

// DELETE /api/challenges/[id] — cancel (creator only, while open)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (challenge.creatorId !== session.user.id) return NextResponse.json({ error: 'Only the creator can cancel' }, { status: 403 })
  if (challenge.status !== 'open') return NextResponse.json({ error: 'Can only cancel open challenges' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    // Refund all money participants
    if (challenge.prizeType === 'money') {
      for (const p of challenge.participants) {
        await tx.user.update({ where: { id: p.userId }, data: { balance: { increment: challenge.prizeAmount! } } })
        await tx.transaction.create({
          data: { userId: p.userId, type: 'challenge_refund', amount: challenge.prizeAmount!, description: `Challenge cancelled: "${challenge.title}"` },
        })
      }
    }
    await tx.challenge.update({ where: { id: params.id }, data: { status: 'cancelled' } })
  })

  return NextResponse.json({ cancelled: true })
}
