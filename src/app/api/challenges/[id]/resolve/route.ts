import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPayout } from '@/lib/challenge-payout'

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
  if (me.side === challenge.winningSide) {
    return NextResponse.json({ error: 'Winners cannot resolve — only the losing side accepts defeat' }, { status: 400 })
  }

  if (action === 'dispute') {
    // If challenge has a witness, go to witness_review instead of disputed
    const newStatus = challenge.witnessId ? 'witness_review' : 'disputed'
    await prisma.challenge.update({ where: { id: params.id }, data: { status: newStatus } })
    return NextResponse.json({ status: newStatus })
  }

  // Accept defeat → pay out winners
  // Check if the current status was previously disputed (we track this via the challenge status)
  // The acceptor gets +5 rep for honesty
  const winningSide = challenge.winningSide!

  await prisma.$transaction(async (tx) => {
    await runPayout(tx, challenge, winningSide, {
      rewardAcceptor: session.user.id, // +5 rep for honest acceptance
    })
  })

  return NextResponse.json({ status: 'completed', winningSide })
}
