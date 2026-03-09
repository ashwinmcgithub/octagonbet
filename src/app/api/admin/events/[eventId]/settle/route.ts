import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

// POST /api/admin/events/[eventId]/settle
// body: { marketId, resultKey } | { action: 'cancel' }
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.action === 'cancel') {
    // Cancel all open markets + refund pending bets
    const markets = await prisma.market.findMany({
      where: { eventId: params.eventId, status: 'open' },
      include: { bets: { where: { status: 'pending' } } },
    })

    for (const market of markets) {
      for (const bet of market.bets) {
        await prisma.$transaction([
          prisma.marketBet.update({ where: { id: bet.id }, data: { status: 'void' } }),
          prisma.user.update({ where: { id: bet.userId }, data: { balance: { increment: bet.amount } } }),
          prisma.transaction.create({ data: { userId: bet.userId, type: 'refund', amount: bet.amount, description: 'Event cancelled — bet refunded' } }),
        ])
      }
      await prisma.market.update({ where: { id: market.id }, data: { status: 'void' } })
    }

    await prisma.sportEvent.update({ where: { id: params.eventId }, data: { status: 'cancelled' } })
    return NextResponse.json({ ok: true, action: 'cancelled' })
  }

  const { marketId, resultKey } = body
  if (!marketId || !resultKey) {
    return NextResponse.json({ error: 'marketId and resultKey required' }, { status: 400 })
  }

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { bets: { where: { status: 'pending' } }, event: true },
  })
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.eventId !== params.eventId) return NextResponse.json({ error: 'Market does not belong to this event' }, { status: 400 })
  if (market.status !== 'open') return NextResponse.json({ error: 'Market already settled' }, { status: 400 })

  let settled = 0
  for (const bet of market.bets) {
    const won = bet.optionKey === resultKey
    const payout = won ? parseFloat((bet.amount * bet.odds).toFixed(2)) : 0

    await prisma.$transaction([
      prisma.marketBet.update({ where: { id: bet.id }, data: { status: won ? 'won' : 'lost', payout } }),
      ...(won ? [
        prisma.user.update({ where: { id: bet.userId }, data: { balance: { increment: payout } } }),
        prisma.transaction.create({
          data: {
            userId: bet.userId, type: 'win', amount: payout,
            description: `Won ${market.label} — ${market.event.homeTeam} vs ${market.event.awayTeam}`,
          },
        }),
      ] : []),
    ])
    settled++
  }

  await prisma.market.update({ where: { id: marketId }, data: { status: 'settled', resultKey } })
  await prisma.sportEvent.update({ where: { id: params.eventId }, data: { status: 'completed', result: resultKey } })

  return NextResponse.json({ ok: true, settled })
}
