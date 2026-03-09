import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// GET /api/challenges — all challenges the user is part of
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const challenges = await prisma.challenge.findMany({
    where: {
      participants: { some: { userId: session.user.id } },
    },
    include: {
      creator: { select: { id: true, name: true, image: true, reputation: true } },
      participants: { include: { user: { select: { id: true, name: true, image: true, reputation: true } } } },
      proofs: { include: { submitter: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(challenges)
}

// POST /api/challenges — create a challenge
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, prizeType, prizeAmount, prizeItem, addWitness } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (prizeType !== 'money' && prizeType !== 'item') return NextResponse.json({ error: 'Invalid prize type' }, { status: 400 })
  if (prizeType === 'money' && (!prizeAmount || prizeAmount < 1)) return NextResponse.json({ error: 'Stake amount required' }, { status: 400 })
  if (prizeType === 'item' && !prizeItem?.trim()) return NextResponse.json({ error: 'Item description required' }, { status: 400 })

  if (prizeType === 'money') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.balance < prizeAmount) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const inviteCode = nanoid(8).toUpperCase()
  const witnessCode = addWitness ? nanoid(8).toUpperCase() : undefined

  const challenge = await prisma.$transaction(async (tx) => {
    if (prizeType === 'money') {
      await tx.user.update({ where: { id: session.user.id }, data: { balance: { decrement: prizeAmount } } })
      await tx.transaction.create({
        data: { userId: session.user.id, type: 'challenge_locked', amount: -prizeAmount, description: `Challenge locked: "${title}"` },
      })
    }

    return tx.challenge.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        creatorId: session.user.id,
        prizeType,
        prizeAmount: prizeType === 'money' ? prizeAmount : null,
        prizeItem: prizeType === 'item' ? prizeItem.trim() : null,
        inviteCode,
        witnessCode: witnessCode ?? null,
        participants: { create: { userId: session.user.id, side: 'a' } },
      },
      include: {
        creator: { select: { id: true, name: true, image: true, reputation: true } },
        participants: { include: { user: { select: { id: true, name: true, image: true, reputation: true } } } },
        proofs: true,
      },
    })
  })

  return NextResponse.json(challenge)
}
