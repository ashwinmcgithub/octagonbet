import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

// GET /api/admin/events — list all sport events
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const events = await prisma.sportEvent.findMany({
    orderBy: { commenceTime: 'desc' },
    include: {
      markets: { include: { _count: { select: { bets: true } } } },
    },
  })

  return NextResponse.json(events)
}

// POST /api/admin/events — create event + markets manually
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { sport, league, eventName, homeTeam, awayTeam, commenceTime, markets } = await req.json()

  if (!sport || !league || !homeTeam || !awayTeam || !commenceTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const event = await prisma.sportEvent.create({
    data: {
      externalId: `manual-${nanoid(10)}`,
      sport,
      league,
      eventName: eventName?.trim() || null,
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      commenceTime: new Date(commenceTime),
      markets: {
        create: (markets ?? [
          {
            marketType: 'moneyline',
            label: 'Match Winner',
            options: [
              { key: 'home', label: homeTeam.trim(), odds: 1.9 },
              { key: 'away', label: awayTeam.trim(), odds: 1.9 },
            ],
          },
        ]).map((m: { marketType: string; label: string; options: unknown[] }) => ({
          marketType: m.marketType,
          label: m.label,
          options: m.options,
        })),
      },
    },
    include: { markets: true },
  })

  return NextResponse.json(event, { status: 201 })
}
