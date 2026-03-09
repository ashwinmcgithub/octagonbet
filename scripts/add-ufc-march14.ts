import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set in .env.local')

const adapter = new PrismaNeon({ connectionString: url })
const prisma = new PrismaClient({ adapter })

async function main() {
  // UFC Fight Night: Emmett vs. Vallejos — March 14, 2026
  // Main Card: 8 PM ET = 01:00 UTC March 15
  // Prelims: 5 PM ET = 22:00 UTC March 14

  const mainCardTime = new Date('2026-03-15T01:00:00.000Z')
  const prelimTime = new Date('2026-03-14T22:00:00.000Z')

  const fights = [
    // ── MAIN CARD ──
    {
      externalId: 'ufc-fn-269-main-1',
      homeTeam: 'Kevin Vallejos',
      awayTeam: 'Josh Emmett',
      homeOdds: -500,
      awayOdds: 375,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Main Event — Featherweight',
    },
    {
      externalId: 'ufc-fn-269-main-2',
      homeTeam: 'Gillian Robertson',
      awayTeam: 'Amanda Lemos',
      homeOdds: -250,
      awayOdds: 210,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: "UFC Fight Night · Co-Main — Women's Strawweight",
    },
    {
      externalId: 'ufc-fn-269-main-3',
      homeTeam: 'Oumar Sy',
      awayTeam: 'Ion Cutelaba',
      homeOdds: -200,
      awayOdds: 170,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Main Card — Light Heavyweight',
    },
    {
      externalId: 'ufc-fn-269-main-4',
      homeTeam: 'Jose Delgado',
      awayTeam: 'Andre Fili',
      homeOdds: -300,
      awayOdds: 250,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Main Card — Featherweight',
    },
    {
      externalId: 'ufc-fn-269-main-5',
      homeTeam: 'Marwan Rahiki',
      awayTeam: 'Harry Hardwick',
      homeOdds: -200,
      awayOdds: 170,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Main Card — Featherweight',
    },
    {
      externalId: 'ufc-fn-269-main-6',
      homeTeam: 'Vitor Petrino',
      awayTeam: 'Steven Asplund',
      homeOdds: -250,
      awayOdds: 210,
      commenceTime: mainCardTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Main Card — Heavyweight',
    },
    // ── PRELIMS ──
    {
      externalId: 'ufc-fn-269-prelim-1',
      homeTeam: 'Brad Tavares',
      awayTeam: 'Eryk Anders',
      homeOdds: -185,
      awayOdds: 160,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Middleweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-2',
      homeTeam: 'Charles Johnson',
      awayTeam: 'Bruno Silva',
      homeOdds: -175,
      awayOdds: 145,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Flyweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-3',
      homeTeam: 'Hecher Sosa',
      awayTeam: 'Luan Lacerda',
      homeOdds: -200,
      awayOdds: 170,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Bantamweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-4',
      homeTeam: 'Bia Mesquita',
      awayTeam: 'Montserrat Rendon',
      homeOdds: -500,
      awayOdds: 375,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: "UFC Fight Night · Prelims — Women's Bantamweight",
    },
    {
      externalId: 'ufc-fn-269-prelim-5',
      homeTeam: 'Myktybek Orolbai',
      awayTeam: 'Chris Curtis',
      homeOdds: -250,
      awayOdds: 210,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Welterweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-6',
      homeTeam: 'Manoel Sousa',
      awayTeam: 'Bolaji Oki',
      homeOdds: -200,
      awayOdds: 170,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Lightweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-7',
      homeTeam: 'Elijah Smith',
      awayTeam: 'SuYoung You',
      homeOdds: -250,
      awayOdds: 210,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: 'UFC Fight Night · Prelims — Bantamweight',
    },
    {
      externalId: 'ufc-fn-269-prelim-8',
      homeTeam: 'Piera Rodriguez',
      awayTeam: 'Sam Hughes',
      homeOdds: -200,
      awayOdds: 170,
      commenceTime: prelimTime,
      sport: 'mma_mixed_martial_arts',
      eventName: "UFC Fight Night · Prelims — Women's Strawweight",
    },
  ]

  let added = 0
  for (const fight of fights) {
    const result = await prisma.fight.upsert({
      where: { externalId: fight.externalId },
      update: {
        homeOdds: fight.homeOdds,
        awayOdds: fight.awayOdds,
        commenceTime: fight.commenceTime,
        eventName: fight.eventName,
      },
      create: fight,
    })
    console.log(`✓  ${result.homeTeam} vs ${result.awayTeam}`)
    added++
  }

  console.log(`\nDone! Added/updated ${added} fights for UFC Fight Night: Emmett vs. Vallejos (March 14, 2026)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
