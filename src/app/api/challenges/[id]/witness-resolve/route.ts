import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPayout } from '@/lib/challenge-payout'

// POST /api/challenges/[id]/witness-resolve — witness decides the winner
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { winningSide } = await req.json()
  if (winningSide !== 'a' && winningSide !== 'b') {
    return NextResponse.json({ error: 'Invalid winningSide — must be "a" or "b"' }, { status: 400 })
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (challenge.status !== 'witness_review') {
    return NextResponse.json({ error: 'Challenge is not in witness review' }, { status: 400 })
  }
  if (challenge.witnessId !== session.user.id) {
    return NextResponse.json({ error: 'You are not the witness for this challenge' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    await runPayout(tx, { ...challenge, winningSide }, winningSide, {
      penalizeLosers: true, // -20 rep to losing side members
    })
  })

  return NextResponse.json({ status: 'completed', winningSide })
}
