import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [userCount, fightCount, betCount, pendingBets] = await Promise.all([
    prisma.user.count(),
    prisma.fight.count({ where: { NOT: { status: 'cancelled' } } }),
    prisma.bet.count(),
    prisma.bet.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const betsByStatus = await prisma.bet.groupBy({
    by: ['status'],
    _count: true,
    _sum: { amount: true },
  })

  return NextResponse.json({
    userCount,
    fightCount,
    betCount,
    pendingBets: {
      count: pendingBets._count,
      totalAmount: pendingBets._sum.amount ?? 0,
    },
    betsByStatus,
  })
}
