import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL not set')

const adapter = new PrismaNeon({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const announcements = [
  {
    sport: 'cricket',
    title: 'IPL 2026',
    description: 'The biggest T20 cricket league in the world. All 10 teams battle it out across 74 matches.',
    startsAt: new Date('2026-03-22T14:00:00Z'),
    bettingOpensAt: new Date('2026-03-22T14:00:00Z'),
  },
  {
    sport: 'cricket',
    title: 'ICC T20 World Cup 2026',
    description: "The biggest T20 international tournament. India, Pakistan, Australia and 18 more nations.",
    startsAt: new Date('2026-06-01T10:00:00Z'),
    bettingOpensAt: new Date('2026-05-25T00:00:00Z'),
  },
  {
    sport: 'football',
    title: 'FIFA World Cup 2026',
    description: 'The biggest sporting event on the planet. 48 teams, hosted across USA, Canada and Mexico.',
    startsAt: new Date('2026-06-11T17:00:00Z'),
    bettingOpensAt: new Date('2026-06-01T00:00:00Z'),
  },
  {
    sport: 'football',
    title: 'UEFA Champions League Final',
    description: 'The crown jewel of European club football. Two giants clash for the ultimate prize.',
    startsAt: new Date('2026-05-30T18:00:00Z'),
    bettingOpensAt: new Date('2026-05-25T00:00:00Z'),
  },
  {
    sport: 'f1',
    title: 'Formula 1 2026 Season',
    description: 'New regulations, new cars, new world order. 24 Grand Prix from Bahrain to Abu Dhabi.',
    startsAt: new Date('2026-03-15T15:00:00Z'),
    bettingOpensAt: new Date('2026-03-15T15:00:00Z'),
  },
  {
    sport: 'tennis',
    title: 'Roland Garros 2026',
    description: 'The French Open — the premier clay court Grand Slam.',
    startsAt: new Date('2026-05-24T10:00:00Z'),
    bettingOpensAt: new Date('2026-05-20T00:00:00Z'),
  },
  {
    sport: 'tennis',
    title: 'Wimbledon 2026',
    description: 'The oldest Grand Slam on grass. Traditions, whites and world-class tennis.',
    startsAt: new Date('2026-06-29T11:00:00Z'),
    bettingOpensAt: new Date('2026-06-25T00:00:00Z'),
  },
  {
    sport: 'nba',
    title: 'NBA Playoffs 2026',
    description: "The best 16 teams fight for the Larry O'Brien trophy across 4 gruelling rounds.",
    startsAt: new Date('2026-04-18T22:00:00Z'),
    bettingOpensAt: new Date('2026-04-15T00:00:00Z'),
  },
  {
    sport: 'kabaddi',
    title: 'Pro Kabaddi League Season 11',
    description: "India's home-grown league returns. 12 franchises, one champion.",
    startsAt: new Date('2026-12-01T18:00:00Z'),
    bettingOpensAt: new Date('2026-11-25T00:00:00Z'),
  },
  {
    sport: 'chess',
    title: 'FIDE Candidates 2026',
    description: 'Decides who challenges the World Champion. India leads the global chess revolution.',
    startsAt: new Date('2026-04-03T09:00:00Z'),
    bettingOpensAt: new Date('2026-04-01T00:00:00Z'),
  },
  {
    sport: 'badminton',
    title: 'BWF World Championships 2026',
    description: 'The pinnacle of world badminton. Can India claim gold at the top level?',
    startsAt: new Date('2026-08-10T09:00:00Z'),
    bettingOpensAt: new Date('2026-08-08T00:00:00Z'),
  },
]

async function main() {
  // Clear existing ones first to avoid duplicates
  await prisma.seasonAnnouncement.deleteMany({})
  const result = await prisma.seasonAnnouncement.createMany({ data: announcements })
  console.log(`Seeded ${result.count} season announcements`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
