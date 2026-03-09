import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [userCount, fightCount, betCount, pendingBets, newUsersThisWeek, platformBalance, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.fight.count({ where: { NOT: { status: 'cancelled' } } }),
    prisma.bet.count(),
    prisma.bet.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.user.aggregate({ _sum: { balance: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, role: true },
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
    newUsersThisWeek,
    platformBalance: platformBalance._sum.balance ?? 0,
    recentUsers,
  })
}
