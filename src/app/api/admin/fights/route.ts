import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePayout } from '@/lib/odds-api'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const fights = await prisma.fight.findMany({
    orderBy: { commenceTime: 'desc' },
    include: {
      _count: { select: { bets: true } },
      bets: { select: { amount: true, status: true } },
    },
  })

  return NextResponse.json(fights)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, fightId, winner } = await req.json()

  if (action === 'settle') {
    if (!fightId || !winner || !['home', 'away'].includes(winner)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const fight = await prisma.fight.findUnique({
      where: { id: fightId },
      include: { bets: { where: { status: 'pending' } } },
    })

    if (!fight) return NextResponse.json({ error: 'Fight not found' }, { status: 404 })

    let settled = 0
    for (const bet of fight.bets) {
      const won = bet.fighter === winner
      const payout = won ? calculatePayout(bet.amount, bet.odds) : 0

      await prisma.$transaction([
        prisma.bet.update({
          where: { id: bet.id },
          data: { status: won ? 'won' : 'lost', payout: won ? payout : 0 },
        }),
        ...(won
          ? [
              prisma.user.update({
                where: { id: bet.userId },
                data: { balance: { increment: payout } },
              }),
              prisma.transaction.create({
                data: {
                  userId: bet.userId,
                  type: 'win',
                  amount: payout,
                  description: `Won bet on ${winner === 'home' ? fight.homeTeam : fight.awayTeam} — FC${payout.toFixed(0)} payout`,
                },
              }),
            ]
          : []),
      ])
      settled++
    }

    await prisma.fight.update({
      where: { id: fightId },
      data: { status: 'completed', winner },
    })

    return NextResponse.json({ settled })
  }

  if (action === 'cancel') {
    const fight = await prisma.fight.findUnique({
      where: { id: fightId },
      include: { bets: { where: { status: 'pending' } } },
    })
    if (!fight) return NextResponse.json({ error: 'Fight not found' }, { status: 404 })

    for (const bet of fight.bets) {
      await prisma.$transaction([
        prisma.bet.update({ where: { id: bet.id }, data: { status: 'cancelled' } }),
        prisma.user.update({
          where: { id: bet.userId },
          data: { balance: { increment: bet.amount } },
        }),
        prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'refund',
            amount: bet.amount,
            description: `Refund — fight cancelled: ${fight.homeTeam} vs ${fight.awayTeam}`,
          },
        }),
      ])
    }

    await prisma.fight.update({ where: { id: fightId }, data: { status: 'cancelled' } })
    return NextResponse.json({ cancelled: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
