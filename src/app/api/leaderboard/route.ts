import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/leaderboard?sport=all&period=all|week
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'all'

  const since = period === 'week'
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : new Date(0)

  // Aggregate MarketBet winnings
  const marketWins = await prisma.marketBet.groupBy({
    by: ['userId'],
    where: { status: 'won', createdAt: { gte: since } },
    _sum: { payout: true },
  })

  // Aggregate Fight bet winnings
  const fightWins = await prisma.bet.groupBy({
    by: ['userId'],
    where: { status: 'won', createdAt: { gte: since } },
    _sum: { payout: true },
  })

  // Aggregate MarketBet losses (amount staked on lost bets)
  const marketLosses = await prisma.marketBet.groupBy({
    by: ['userId'],
    where: { status: 'lost', createdAt: { gte: since } },
    _sum: { amount: true },
  })

  // Aggregate Fight bet losses
  const fightLosses = await prisma.bet.groupBy({
    by: ['userId'],
    where: { status: 'lost', createdAt: { gte: since } },
    _sum: { amount: true },
  })

  // Merge into a map
  const profitMap: Record<string, { won: number; lost: number }> = {}

  for (const r of marketWins) {
    if (!profitMap[r.userId]) profitMap[r.userId] = { won: 0, lost: 0 }
    profitMap[r.userId].won += r._sum.payout ?? 0
  }
  for (const r of fightWins) {
    if (!profitMap[r.userId]) profitMap[r.userId] = { won: 0, lost: 0 }
    profitMap[r.userId].won += r._sum.payout ?? 0
  }
  for (const r of marketLosses) {
    if (!profitMap[r.userId]) profitMap[r.userId] = { won: 0, lost: 0 }
    profitMap[r.userId].lost += r._sum.amount ?? 0
  }
  for (const r of fightLosses) {
    if (!profitMap[r.userId]) profitMap[r.userId] = { won: 0, lost: 0 }
    profitMap[r.userId].lost += r._sum.amount ?? 0
  }

  const userIds = Object.keys(profitMap)

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, reputation: true, balance: true },
  })

  const ranked = users
    .map((u) => {
      const stats = profitMap[u.id] ?? { won: 0, lost: 0 }
      return {
        ...u,
        totalWon: stats.won,
        totalLost: stats.lost,
        netProfit: stats.won - stats.lost,
      }
    })
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 50)

  return NextResponse.json(ranked)
}
