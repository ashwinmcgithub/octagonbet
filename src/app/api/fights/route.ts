import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  console.log('DATABASE_URL at request time:', process.env.DATABASE_URL?.slice(0, 40))
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'

  const where =
    status === 'all'
      ? { NOT: { status: 'cancelled' } }
      : { status }

  const fights = await prisma.fight.findMany({
    where,
    orderBy: { commenceTime: 'asc' },
    include: {
      _count: { select: { bets: true } },
    },
  })

  return NextResponse.json(fights)
}
