import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/groups/[groupId]/bets
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const bets = await prisma.groupBet.findMany({
    where: { groupId },
    include: {
      fight: { select: { id: true, homeTeam: true, awayTeam: true, homeOdds: true, awayOdds: true, status: true, winner: true, eventName: true } },
      shares: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bets)
}

// POST /api/groups/[groupId]/bets — propose a group bet
export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params
  const { fightId, fighter, amount } = await req.json()

  if (!fightId || !fighter || !amount || amount <= 0) {
    return NextResponse.json({ error: 'fightId, fighter, and amount required' }, { status: 400 })
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const fight = await prisma.fight.findUnique({ where: { id: fightId } })
  if (!fight || fight.status !== 'upcoming') {
    return NextResponse.json({ error: 'Fight not available for betting' }, { status: 400 })
  }

  // Already proposed a bet on this fight in this group?
  const existing = await prisma.groupBet.findFirst({
    where: { groupId, fightId, status: 'open' },
  })
  if (existing) return NextResponse.json({ error: 'A bet on this fight already exists in the group' }, { status: 400 })

  // Deduct proposer's share immediately
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const groupBet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: amount } },
    })
    await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: 'group_bet_placed',
        amount: -amount,
        description: `Group bet: ${fight.homeTeam} vs ${fight.awayTeam} — ${fighter}`,
      },
    })
    const bet = await tx.groupBet.create({
      data: {
        groupId,
        fightId,
        proposerId: session.user.id,
        fighter,
        totalAmount: amount,
        shares: {
          create: { userId: session.user.id, amount },
        },
      },
      include: {
        fight: { select: { id: true, homeTeam: true, awayTeam: true, homeOdds: true, awayOdds: true, status: true, winner: true, eventName: true } },
        shares: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    })
    return bet
  })

  return NextResponse.json(groupBet)
}
