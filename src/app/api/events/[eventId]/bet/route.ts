import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/events/[eventId]/bet
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { marketId, optionKey, amount } = await req.json()

  if (!marketId || !optionKey || !amount || amount < 1) {
    return NextResponse.json({ error: 'Invalid bet data' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: session.user.id }, select: { balance: true } })
      if (!user) throw new Error('User not found')
      if (user.balance < amount) throw new Error('Insufficient balance')

      const market = await tx.market.findUnique({
        where: { id: marketId },
        include: { event: true },
      })
      if (!market) throw new Error('Market not found')
      if (market.status !== 'open') throw new Error('Market is closed')
      if (market.eventId !== params.eventId) throw new Error('Market does not belong to this event')

      const options = market.options as { key: string; label: string; odds: number }[]
      const option = options.find((o) => o.key === optionKey)
      if (!option) throw new Error('Invalid option')

      if (!['upcoming', 'live'].includes(market.event.status)) {
        throw new Error('Betting is closed for this event')
      }

      const payout = parseFloat((amount * option.odds).toFixed(2))

      await tx.user.update({ where: { id: session.user.id }, data: { balance: { decrement: amount } } })

      const bet = await tx.marketBet.create({
        data: {
          userId: session.user.id,
          marketId,
          optionKey,
          amount,
          odds: option.odds,
          payout,
        },
      })

      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'bet',
          amount: -amount,
          description: `Bet FC${amount} on ${option.label} — ${market.label} (${market.event.homeTeam} vs ${market.event.awayTeam})`,
        },
      })

      return { bet, potentialPayout: payout, option }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to place bet'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
