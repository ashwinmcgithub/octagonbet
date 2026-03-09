import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/challenges/[id]/resolve — accept defeat or dispute
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() // "accept" | "dispute"
  if (action !== 'accept' && action !== 'dispute') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (challenge.status !== 'awaiting_resolution') return NextResponse.json({ error: 'Challenge not awaiting resolution' }, { status: 400 })

  const me = challenge.participants.find((p) => p.userId === session.user.id)
  if (!me) return NextResponse.json({ error: 'You are not in this challenge' }, { status: 403 })

  // Only the losing side can resolve
  if (me.side === challenge.winningSide) return NextResponse.json({ error: 'Winners cannot resolve — only the losing side accepts defeat' }, { status: 400 })

  if (action === 'dispute') {
    await prisma.challenge.update({ where: { id: params.id }, data: { status: 'disputed' } })
    return NextResponse.json({ status: 'disputed' })
  }

  // Accept defeat → pay out winners
  const winningSide = challenge.winningSide!
  const winners = challenge.participants.filter((p) => p.side === winningSide)
  const losers = challenge.participants.filter((p) => p.side !== winningSide)

  await prisma.$transaction(async (tx) => {
    if (challenge.prizeType === 'money') {
      const totalPool = challenge.participants.length * (challenge.prizeAmount ?? 0)
      const payoutPerWinner = totalPool / winners.length

      for (const winner of winners) {
        await tx.user.update({ where: { id: winner.userId }, data: { balance: { increment: payoutPerWinner } } })
        await tx.transaction.create({
          data: { userId: winner.userId, type: 'challenge_won', amount: payoutPerWinner, description: `Won challenge: "${challenge.title}" — FC ${payoutPerWinner.toFixed(0)}` },
        })
        await tx.challengeParticipant.update({ where: { id: winner.id }, data: { payout: payoutPerWinner } })
      }

      // Record loss transaction for losers (money was already deducted at join)
      for (const loser of losers) {
        await tx.transaction.create({
          data: { userId: loser.userId, type: 'challenge_lost', amount: 0, description: `Lost challenge: "${challenge.title}"` },
        })
      }
    }

    await tx.challenge.update({ where: { id: params.id }, data: { status: 'completed' } })
  })

  return NextResponse.json({ status: 'completed', winningSide })
}
