import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePayout } from '@/lib/odds-api'
import { z } from 'zod'

const betSchema = z.object({
  fightId: z.string(),
  fighter: z.enum(['home', 'away']),
  amount: z.number().positive(),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bets = await prisma.bet.findMany({
    where: { userId: session.user.id },
    include: {
      fight: {
        select: {
          homeTeam: true,
          awayTeam: true,
          commenceTime: true,
          status: true,
          winner: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bets)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { fightId, fighter, amount } = betSchema.parse(body)

    // Run in a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { balance: true },
      })

      if (!user) throw new Error('User not found')
      if (user.balance < amount) throw new Error('Insufficient balance')

      const fight = await tx.fight.findUnique({ where: { id: fightId } })
      if (!fight) throw new Error('Fight not found')
      if (fight.status !== 'upcoming' && fight.status !== 'live') {
        throw new Error('Betting is closed for this fight')
      }

      const odds = fighter === 'home' ? fight.homeOdds : fight.awayOdds
      if (!odds) throw new Error('Odds not available for this fighter')

      const potentialPayout = calculatePayout(amount, odds)

      // Deduct balance
      await tx.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: amount } },
      })

      const fighterName = fighter === 'home' ? fight.homeTeam : fight.awayTeam

      // Create bet
      const bet = await tx.bet.create({
        data: {
          userId: session.user.id,
          fightId,
          fighter,
          amount,
          odds,
          payout: potentialPayout,
        },
      })

      // Record transaction
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'bet',
          amount: -amount,
          description: `Bet FC${amount} on ${fighterName} vs ${fighter === 'home' ? fight.awayTeam : fight.homeTeam}`,
        },
      })

      return bet
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: err.message || 'Failed to place bet' }, { status: 400 })
  }
}
