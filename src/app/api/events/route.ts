import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/events?sport=cricket&status=upcoming
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') || 'all'
  const status = searchParams.get('status') || 'all'

  const where: Record<string, unknown> = {}
  if (sport !== 'all') where.sport = sport
  if (status !== 'all') where.status = status
  else where.status = { not: 'cancelled' }

  const events = await prisma.sportEvent.findMany({
    where,
    orderBy: { commenceTime: 'asc' },
    include: {
      markets: {
        where: { status: { not: 'void' } },
        include: { _count: { select: { bets: true } } },
      },
    },
  })

  return NextResponse.json(events)
}
