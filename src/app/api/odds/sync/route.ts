import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUpcomingFights, fetchScores, extractOdds } from '@/lib/odds-api'
import { calculatePayout } from '@/lib/odds-api'

// This endpoint syncs fights from the Odds API and auto-settles completed fights.
// Call it from a cron job or Vercel cron every 5 minutes.
// Also called client-side periodically for real-time odds.

export async function POST(req: Request) {
  // Optional secret to secure the endpoint in production
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { synced: 0, settled: 0, errors: [] as string[] }

  try {
    // 1. Fetch upcoming fights with odds
    const events = await fetchUpcomingFights()

    for (const event of events) {
      const [homeOdds, awayOdds] = extractOdds(event)

      await prisma.fight.upsert({
        where: { externalId: event.id },
        update: {
          homeOdds,
          awayOdds,
          commenceTime: new Date(event.commence_time),
          status: new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
          lastOddsUpdate: new Date(),
        },
        create: {
          externalId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: new Date(event.commence_time),
          homeOdds,
          awayOdds,
          status: new Date(event.commence_time) <= new Date() ? 'live' : 'upcoming',
          lastOddsUpdate: new Date(),
        },
      })
      results.synced++
    }
  } catch (err: any) {
    results.errors.push(`Odds sync: ${err.message}`)
  }

  try {
    // 2. Fetch recent scores and auto-settle
    const scores = await fetchScores(3)

    for (const score of scores) {
      if (!score.completed || !score.scores) continue

      const fight = await prisma.fight.findUnique({
        where: { externalId: score.id },
        include: { bets: { where: { status: 'pending' } } },
      })

      if (!fight || fight.status === 'completed') continue

      // Determine winner: the fighter with higher score wins
      const sorted = [...score.scores].sort(
        (a, b) => parseFloat(b.score) - parseFloat(a.score)
      )
      const winnerName = sorted[0]?.name
      if (!winnerName) continue

      const winner = winnerName === fight.homeTeam ? 'home' : 'away'

      // Settle all pending bets
      for (const bet of fight.bets) {
        const won = bet.fighter === winner
        const payout = won ? calculatePayout(bet.amount, bet.odds) : 0

        await prisma.$transaction([
          prisma.bet.update({
            where: { id: bet.id },
            data: { status: won ? 'won' : 'lost', payout: won ? payout : 0 },
          }),
          ...(won
            ? [
                prisma.user.update({
                  where: { id: bet.userId },
                  data: { balance: { increment: payout } },
                }),
                prisma.transaction.create({
                  data: {
                    userId: bet.userId,
                    type: 'win',
                    amount: payout,
                    description: `Won bet on ${winnerName} — FC${payout.toFixed(0)} payout`,
                  },
                }),
              ]
            : []),
        ])

        results.settled++
      }

      // Settle group bets for this fight
      const openGroupBets = await prisma.groupBet.findMany({
        where: { fightId: fight.id, status: 'open' },
        include: { shares: true, fight: true },
      })

      for (const groupBet of openGroupBets) {
        const won = groupBet.fighter === winner
        const odds = winner === 'home' ? fight.homeOdds : fight.awayOdds

        for (const share of groupBet.shares) {
          const sharePayout = won && odds ? calculatePayout(share.amount, odds) * (share.amount / groupBet.totalAmount) : 0
          await prisma.groupBetShare.update({
            where: { id: share.id },
            data: { payout: won ? sharePayout : 0 },
          })
          if (won && sharePayout > 0) {
            await prisma.user.update({
              where: { id: share.userId },
              data: { balance: { increment: sharePayout } },
            })
            await prisma.transaction.create({
              data: {
                userId: share.userId,
                type: 'group_bet_win',
                amount: sharePayout,
                description: `Group bet won: ${winnerName} — FC${sharePayout.toFixed(0)} payout`,
              },
            })
          }
        }

        await prisma.groupBet.update({
          where: { id: groupBet.id },
          data: { status: won ? 'won' : 'lost' },
        })
      }

      // Mark fight as completed
      await prisma.fight.update({
        where: { id: fight.id },
        data: { status: 'completed', winner },
      })
    }
  } catch (err: any) {
    results.errors.push(`Settlement: ${err.message}`)
  }

  return NextResponse.json(results)
}

// GET returns current fights from DB (for real-time polling)
export async function GET() {
  const fights = await prisma.fight.findMany({
    where: { NOT: { status: 'cancelled' } },
    orderBy: { commenceTime: 'asc' },
  })
  return NextResponse.json(fights)
}
