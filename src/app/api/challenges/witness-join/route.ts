import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/challenges/witness-join — join as a witness using witnessCode
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { witnessCode } = await req.json()
  if (!witnessCode?.trim()) return NextResponse.json({ error: 'Witness code required' }, { status: 400 })

  const challenge = await prisma.challenge.findUnique({
    where: { witnessCode: witnessCode.trim().toUpperCase() },
    include: { participants: true },
  })
  if (!challenge) return NextResponse.json({ error: 'Invalid witness code' }, { status: 404 })

  // Don't allow participants to also be the witness
  const isParticipant = challenge.participants.some((p) => p.userId === session.user.id)
  if (isParticipant) return NextResponse.json({ error: 'Participants cannot be a witness' }, { status: 400 })

  // Already has a witness
  if (challenge.witnessId) return NextResponse.json({ error: 'This challenge already has a witness' }, { status: 400 })

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: { witnessId: session.user.id },
  })

  return NextResponse.json({ challengeId: challenge.id })
}
