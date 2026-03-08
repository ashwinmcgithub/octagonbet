const BASE_URL = 'https://api.the-odds-api.com/v4'
const SPORT = 'mma_mixed_martial_arts'

export interface OddsEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

export interface Bookmaker {
  key: string
  title: string
  markets: Market[]
}

export interface Market {
  key: string
  outcomes: Outcome[]
}

export interface Outcome {
  name: string
  price: number
}

export interface ScoreEvent {
  id: string
  sport_key: string
  commence_time: string
  completed: boolean
  home_team: string
  away_team: string
  scores: { name: string; score: string } [] | null
  last_update: string | null
}

function getApiKey() {
  const key = process.env.ODDS_API_KEY
  if (!key) throw new Error('ODDS_API_KEY is not set')
  return key
}

export async function fetchUpcomingFights(): Promise<OddsEvent[]> {
  const key = getApiKey()
  const url = `${BASE_URL}/sports/${SPORT}/odds?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`
  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Odds API error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function fetchScores(daysFrom = 3): Promise<ScoreEvent[]> {
  const key = getApiKey()
  const url = `${BASE_URL}/sports/${SPORT}/scores?apiKey=${key}&daysFrom=${daysFrom}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Scores API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Extract best available h2h odds for a fight event.
 * Returns [homeOdds, awayOdds] in American format, or [null, null] if unavailable.
 */
export function extractOdds(event: OddsEvent): [number | null, number | null] {
  for (const bookmaker of event.bookmakers) {
    const h2h = bookmaker.markets.find((m) => m.key === 'h2h')
    if (!h2h) continue

    const homeOutcome = h2h.outcomes.find((o) => o.name === event.home_team)
    const awayOutcome = h2h.outcomes.find((o) => o.name === event.away_team)

    if (homeOutcome && awayOutcome) {
      return [homeOutcome.price, awayOutcome.price]
    }
  }
  return [null, null]
}

/**
 * Calculate payout from American odds.
 * Returns total payout (stake + profit).
 */
export function calculatePayout(amount: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return amount * (1 + americanOdds / 100)
  } else {
    return amount * (1 + 100 / Math.abs(americanOdds))
  }
}

/**
 * Format American odds for display (+150, -200)
 */
export function formatOdds(odds: number | null): string {
  if (odds === null) return 'N/A'
  return odds > 0 ? `+${odds}` : `${odds}`
}
