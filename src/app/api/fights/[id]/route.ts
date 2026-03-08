import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const fight = await prisma.fight.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { bets: true } },
      bets: {
        select: { fighter: true, amount: true },
      },
    },
  })

  if (!fight) {
    return NextResponse.json({ error: 'Fight not found' }, { status: 404 })
  }

  // Calculate bet distribution
  const homeBets = fight.bets
    .filter((b) => b.fighter === 'home')
    .reduce((sum, b) => sum + b.amount, 0)
  const awayBets = fight.bets
    .filter((b) => b.fighter === 'away')
    .reduce((sum, b) => sum + b.amount, 0)

  return NextResponse.json({
    ...fight,
    bets: undefined,
    homeTotalBets: homeBets,
    awayTotalBets: awayBets,
  })
}
