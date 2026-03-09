import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/groups/[groupId]/bets/[betId]/join — add share to existing group bet
export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string; betId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, betId } = params
  const { amount } = await req.json()

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount required' }, { status: 400 })

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const result = await prisma.$transaction(async (tx) => {
    const bet = await tx.groupBet.findUnique({
      where: { id: betId },
      include: { fight: true },
    })
    if (!bet) throw new Error('Bet not found')
    if (bet.groupId !== groupId) throw new Error('Bet not in this group')
    if (bet.status !== 'open') throw new Error('Bet is no longer open')
    if (bet.fight.status !== 'upcoming') throw new Error('Fight already started')

    // Already joined?
    const existing = await tx.groupBetShare.findUnique({
      where: { groupBetId_userId: { groupBetId: betId, userId: session.user.id } },
    })
    if (existing) throw new Error('Already joined this bet')

    // Balance check
    const user = await tx.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.balance < amount) throw new Error('Insufficient balance')

    await tx.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: amount } },
    })
    await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: 'group_bet_placed',
        amount: -amount,
        description: `Joined group bet: ${bet.fight.homeTeam} vs ${bet.fight.awayTeam} — ${bet.fighter}`,
      },
    })
    await tx.groupBetShare.create({
      data: { groupBetId: betId, userId: session.user.id, amount },
    })
    const updated = await tx.groupBet.update({
      where: { id: betId },
      data: { totalAmount: { increment: amount } },
      include: {
        fight: { select: { id: true, homeTeam: true, awayTeam: true, homeOdds: true, awayOdds: true, status: true, winner: true, eventName: true } },
        shares: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    })
    return updated
  })

  return NextResponse.json(result)
}
