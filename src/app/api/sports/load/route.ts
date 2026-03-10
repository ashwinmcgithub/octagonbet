import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Maps our sport tab keys → Odds API sport keys
const SPORT_TO_ODDS_KEYS: Record<string, { oddsKey: string; league: string }[]> = {
  cricket:   [
    { oddsKey: 'cricket_test_match', league: 'TEST' },
    { oddsKey: 'cricket_odi',        league: 'ODI'  },
    { oddsKey: 'cricket_ipl',        league: 'IPL'  },
    { oddsKey: 'cricket_t20',        league: 'T20'  },
  ],
  football:  [
    { oddsKey: 'soccer_epl',                    league: 'EPL'              },
    { oddsKey: 'soccer_uefa_champs_league',      league: 'Champions League' },
    { oddsKey: 'soccer_fa_cup',                  league: 'FA Cup'           },
    { oddsKey: 'soccer_spain_la_liga',           league: 'La Liga'          },
    { oddsKey: 'soccer_germany_bundesliga',      league: 'Bundesliga'       },
    { oddsKey: 'soccer_italy_serie_a',           league: 'Serie A'          },
    { oddsKey: 'soccer_france_ligue_one',        league: 'Ligue 1'          },
    { oddsKey: 'soccer_india_isl',               league: 'ISL'              },
  ],
  tennis:    [
    { oddsKey: 'tennis_atp_french_open',  league: 'Roland Garros' },
    { oddsKey: 'tennis_wta_french_open',  league: 'Roland Garros' },
    { oddsKey: 'tennis_atp_wimbledon',    league: 'Wimbledon'     },
    { oddsKey: 'tennis_wta_wimbledon',    league: 'Wimbledon'     },
    { oddsKey: 'tennis_atp_us_open',      league: 'US Open'       },
    { oddsKey: 'tennis_wta_us_open',      league: 'US Open'       },
    { oddsKey: 'tennis_atp',              league: 'ATP'           },
    { oddsKey: 'tennis_wta',              league: 'WTA'           },
  ],
  nba:       [{ oddsKey: 'basketball_nba',         league: 'NBA'     }],
  boxing:    [{ oddsKey: 'boxing_boxing',           league: 'BOXING'  }],
  f1:        [{ oddsKey: 'motorsport_formula_one',  league: 'F1'      }],
}

interface OddsAPIEvent {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: {
    markets: {
      key: string
      outcomes: { name: string; price: number }[]
    }[]
  }[]
}

function extractDecimalOdds(event: OddsAPIEvent, homeTeam: string, awayTeam: string) {
  for (const bk of event.bookmakers) {
    const h2h = bk.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const home = h2h.outcomes.find(o => o.name === homeTeam)
    const away = h2h.outcomes.find(o => o.name === awayTeam)
    const draw = h2h.outcomes.find(o => o.name === 'Draw')
    if (home && away) return { home: home.price, away: away.price, draw: draw?.price ?? null }
  }
  return { home: 1.9, away: 1.9, draw: null }
}

// GET /api/sports/load?sport=cricket  — public, uses ODDS_API_KEY
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport')
  if (!sport || sport === 'all' || sport === 'mma') {
    return NextResponse.json({ ok: true, upserted: 0, note: 'Use specific sport key' })
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })

  const mappings = SPORT_TO_ODDS_KEYS[sport]
  if (!mappings) return NextResponse.json({ ok: true, upserted: 0, note: 'No Odds API mapping for this sport' })

  let totalUpserted = 0
  const errors: string[] = []

  for (const { oddsKey, league } of mappings) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds?apiKey=${apiKey}&regions=uk,us,au&markets=h2h&oddsFormat=decimal`
      const res = await fetch(url, { next: { revalidate: 0 } })

      // 404 = sport not currently available (off-season), skip gracefully
      if (res.status === 404 || res.status === 422) continue
      if (!res.ok) {
        errors.push(`${oddsKey}: HTTP ${res.status}`)
        continue
      }

      const events: OddsAPIEvent[] = await res.json()

      for (const ev of events) {
        const { home, away, draw } = extractDecimalOdds(ev, ev.home_team, ev.away_team)
        const now = new Date()
        const commence = new Date(ev.commence_time)
        const status = commence < now ? 'live' : 'upcoming'

        const sportEvent = await prisma.sportEvent.upsert({
          where: { externalId: `odds-${ev.id}` },
          update: { status },
          create: {
            externalId: `odds-${ev.id}`,
            sport,
            league,
            homeTeam: ev.home_team,
            awayTeam: ev.away_team,
            commenceTime: commence,
            status,
          },
        })

        // Create moneyline market if it doesn't exist
        const existing = await prisma.market.findFirst({
          where: { eventId: sportEvent.id, marketType: 'moneyline' },
        })

        if (!existing) {
          const options: { key: string; label: string; odds: number }[] = [
            { key: 'home', label: ev.home_team, odds: home },
            { key: 'away', label: ev.away_team, odds: away },
          ]
          if (draw) options.splice(1, 0, { key: 'draw', label: 'Draw', odds: draw })

          await prisma.market.create({
            data: {
              eventId: sportEvent.id,
              marketType: 'moneyline',
              label: 'Match Winner',
              options,
            },
          })
        } else {
          // Update odds on existing open market
          if (existing.status === 'open') {
            const options: { key: string; label: string; odds: number }[] = [
              { key: 'home', label: ev.home_team, odds: home },
              { key: 'away', label: ev.away_team, odds: away },
            ]
            if (draw) options.splice(1, 0, { key: 'draw', label: 'Draw', odds: draw })
            await prisma.market.update({
              where: { id: existing.id },
              data: { options },
            })
          }
        }

        totalUpserted++
      }
    } catch (e) {
      errors.push(`${oddsKey}: ${String(e)}`)
    }
  }

  return NextResponse.json({ ok: true, sport, upserted: totalUpserted, errors })
}
