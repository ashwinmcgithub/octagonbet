import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Helpers ────────────────────────────────────────────────────────────────

function mapCricStatus(m: { matchStarted: boolean; matchEnded: boolean }): string {
  if (m.matchEnded) return 'completed'
  if (m.matchStarted) return 'live'
  return 'upcoming'
}

function mapFootballStatus(s: string): string {
  if (['FINISHED'].includes(s)) return 'completed'
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(s)) return 'live'
  if (['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(s)) return 'cancelled'
  return 'upcoming'
}

function mapFootballResult(winner: string | null): string | null {
  if (winner === 'HOME_TEAM') return 'home'
  if (winner === 'AWAY_TEAM') return 'away'
  if (winner === 'DRAW') return 'draw'
  return null
}

// ── Cricket sync (CricAPI) ─────────────────────────────────────────────────

async function syncCricket(): Promise<{ upserted: number; errors: string[] }> {
  const apiKey = process.env.CRIC_API_KEY
  if (!apiKey) return { upserted: 0, errors: ['CRIC_API_KEY not set'] }

  const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`, {
    headers: { 'User-Agent': 'OctagonBet/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return { upserted: 0, errors: [`CricAPI error ${res.status}`] }

  const json = await res.json() as {
    status: string
    data: {
      id: string
      name: string
      matchType: string
      status: string
      teams: string[]
      dateTimeGMT: string
      matchStarted: boolean
      matchEnded: boolean
      series_id?: string
    }[]
  }
  if (json.status !== 'success' || !Array.isArray(json.data)) {
    return { upserted: 0, errors: ['CricAPI returned no data'] }
  }

  let upserted = 0
  const errors: string[] = []

  for (const m of json.data) {
    try {
      const teams = m.teams ?? []
      if (teams.length < 2) continue
      const [home, away] = teams
      const status = mapCricStatus(m)
      const league = m.matchType?.toUpperCase() === 'IPL' ? 'IPL' : m.matchType?.toUpperCase() ?? 'CRICKET'

      const event = await prisma.sportEvent.upsert({
        where: { externalId: `cric-${m.id}` },
        update: { status, metadata: { name: m.name, type: m.matchType } },
        create: {
          externalId: `cric-${m.id}`,
          sport: 'cricket',
          league,
          eventName: m.name,
          homeTeam: home,
          awayTeam: away,
          commenceTime: new Date(m.dateTimeGMT),
          status,
          metadata: { name: m.name, type: m.matchType },
        },
      })

      // Create default Match Winner market if not exists
      const existing = await prisma.market.findFirst({
        where: { eventId: event.id, marketType: 'moneyline' },
      })
      if (!existing && status !== 'completed') {
        await prisma.market.create({
          data: {
            eventId: event.id,
            marketType: 'moneyline',
            label: 'Match Winner',
            options: [
              { key: 'home', label: home, odds: 1.9 },
              { key: 'away', label: away, odds: 1.9 },
              { key: 'draw', label: 'Draw', odds: 3.5 },
            ],
          },
        })
      }
      upserted++
    } catch (e) {
      errors.push(String(e))
    }
  }

  return { upserted, errors }
}

// ── Football sync (football-data.org) ──────────────────────────────────────

async function syncFootball(): Promise<{ upserted: number; errors: string[] }> {
  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey) return { upserted: 0, errors: ['FOOTBALL_API_KEY not set'] }

  // Fetch next 14 days + last 3 days
  const from = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  const res = await fetch(
    `https://api.football-data.org/v4/matches?competitions=PL,CL,SA,PD,FL1&dateFrom=${from}&dateTo=${to}`,
    {
      headers: { 'X-Auth-Token': apiKey, 'User-Agent': 'OctagonBet/1.0' },
      next: { revalidate: 0 },
    }
  )
  if (!res.ok) return { upserted: 0, errors: [`football-data.org error ${res.status}`] }

  const json = await res.json() as {
    matches: {
      id: number
      competition: { name: string; code: string }
      utcDate: string
      status: string
      homeTeam: { name: string }
      awayTeam: { name: string }
      score: { winner: string | null; fullTime: { home: number | null; away: number | null } }
    }[]
  }

  let upserted = 0
  const errors: string[] = []

  for (const m of json.matches ?? []) {
    try {
      const status = mapFootballStatus(m.status)
      const result = mapFootballResult(m.score?.winner ?? null)
      const league = m.competition?.code ?? 'FOOTBALL'

      const event = await prisma.sportEvent.upsert({
        where: { externalId: `football-${m.id}` },
        update: {
          status,
          result: result ?? undefined,
          metadata: { score: m.score },
        },
        create: {
          externalId: `football-${m.id}`,
          sport: 'football',
          league,
          eventName: m.competition?.name,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          commenceTime: new Date(m.utcDate),
          status,
          result,
          metadata: { score: m.score },
        },
      })

      // Settle any open markets if result is in
      if (result && status === 'completed') {
        const openMarkets = await prisma.market.findMany({
          where: { eventId: event.id, status: 'open', marketType: 'moneyline' },
          include: { bets: { where: { status: 'pending' } } },
        })
        for (const market of openMarkets) {
          for (const bet of market.bets) {
            const won = bet.optionKey === result
            const payout = won ? parseFloat((bet.amount * bet.odds).toFixed(2)) : 0
            await prisma.$transaction([
              prisma.marketBet.update({ where: { id: bet.id }, data: { status: won ? 'won' : 'lost', payout } }),
              ...(won ? [
                prisma.user.update({ where: { id: bet.userId }, data: { balance: { increment: payout } } }),
                prisma.transaction.create({ data: { userId: bet.userId, type: 'win', amount: payout, description: `Won ${market.label} on ${event.homeTeam} vs ${event.awayTeam}` } }),
              ] : []),
            ])
          }
          await prisma.market.update({ where: { id: market.id }, data: { status: 'settled', resultKey: result } })
        }
      }

      // Create default moneyline market if not exists
      if (status !== 'completed') {
        const existing = await prisma.market.findFirst({ where: { eventId: event.id, marketType: 'moneyline' } })
        if (!existing) {
          await prisma.market.create({
            data: {
              eventId: event.id,
              marketType: 'moneyline',
              label: 'Match Winner',
              options: [
                { key: 'home', label: m.homeTeam.name, odds: 1.9 },
                { key: 'draw', label: 'Draw', odds: 3.4 },
                { key: 'away', label: m.awayTeam.name, odds: 1.9 },
              ],
            },
          })
        }
      }
      upserted++
    } catch (e) {
      errors.push(String(e))
    }
  }

  return { upserted, errors }
}

// ── POST /api/sports/sync ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'all'

  const results: Record<string, { upserted: number; errors: string[] }> = {}

  if (scope === 'cricket' || scope === 'all') results.cricket = await syncCricket()
  if (scope === 'football' || scope === 'all') results.football = await syncFootball()

  return NextResponse.json({ ok: true, results })
}
