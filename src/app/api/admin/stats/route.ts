import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    totalGameRooms,
    activeGameRooms,
    gamePlayersToday,
    recentUsers,
    allUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.gameRoom.count(),
    prisma.gameRoom.count({ where: { status: { in: ['lobby', 'active', 'voting', 'last_stand'] } } }),
    // distinct users who joined/hosted a game room today
    prisma.gamePlayer.groupBy({
      by: ['userId'],
      where: { joinedAt: { gte: startOfToday } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
  ])

  return NextResponse.json({
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    totalGameRooms,
    activeGameRooms,
    gamePlayersToday: gamePlayersToday.length,
    recentUsers,
    allUsers,
  })
}
