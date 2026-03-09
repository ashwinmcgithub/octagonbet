import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/challenges/join — join a challenge via invite code, pick side
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode, side } = await req.json()
  if (!inviteCode?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
  if (side !== 'a' && side !== 'b') return NextResponse.json({ error: 'Side must be "a" or "b"' }, { status: 400 })

  const challenge = await prisma.challenge.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (challenge.status === 'cancelled' || challenge.status === 'completed') {
    return NextResponse.json({ error: 'Challenge is no longer open' }, { status: 400 })
  }

  // Already in?
  const existing = challenge.participants.find((p) => p.userId === session.user.id)
  if (existing) return NextResponse.json({ challengeId: challenge.id, alreadyJoined: true })

  if (challenge.prizeType === 'money') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.balance < (challenge.prizeAmount ?? 0)) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (challenge.prizeType === 'money') {
      await tx.user.update({ where: { id: session.user.id }, data: { balance: { decrement: challenge.prizeAmount! } } })
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'challenge_locked',
          amount: -(challenge.prizeAmount!),
          description: `Joined challenge: "${challenge.title}"`,
        },
      })
    }

    await tx.challengeParticipant.create({
      data: { challengeId: challenge.id, userId: session.user.id, side },
    })

    // Activate if both sides now have participants
    const updated = await tx.challenge.findUnique({
      where: { id: challenge.id },
      include: { participants: true },
    })
    const hasA = updated!.participants.some((p) => p.side === 'a')
    const hasB = updated!.participants.some((p) => p.side === 'b')
    if (hasA && hasB && updated!.status === 'open') {
      await tx.challenge.update({ where: { id: challenge.id }, data: { status: 'active' } })
    }
  })

  return NextResponse.json({ challengeId: challenge.id })
}
