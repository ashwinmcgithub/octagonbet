import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/challenges/[id]/claim — claim victory, submit proof
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Proof description required' }, { status: 400 })

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (challenge.status !== 'active') return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })

  const me = challenge.participants.find((p) => p.userId === session.user.id)
  if (!me) return NextResponse.json({ error: 'You are not in this challenge' }, { status: 403 })

  await prisma.$transaction([
    prisma.challengeProof.create({
      data: {
        challengeId: params.id,
        submittedBy: session.user.id,
        claimSide: me.side,
        description: description.trim(),
      },
    }),
    prisma.challenge.update({
      where: { id: params.id },
      data: { status: 'awaiting_resolution', winningSide: me.side },
    }),
  ])

  return NextResponse.json({ ok: true })
}
