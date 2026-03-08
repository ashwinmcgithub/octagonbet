/**
 * Database setup script using Neon's WebSocket driver (port 443).
 * Run: node scripts/setup-db.mjs
 */

// Must be first — patches DNS to use Google DNS (8.8.8.8)
import './dns-fix.mjs'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Required for WebSocket in Node.js environments
neonConfig.webSocketConstructor = ws

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '../.env'), 'utf8')
const DATABASE_URL = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1]

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function run(label, query, params = []) {
  try {
    await pool.query(query, params)
    console.log(`  ✓ ${label}`)
    return true
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('Connecting to Neon via WebSocket...')

  try {
    const res = await pool.query('SELECT version()')
    console.log('Connected:', res.rows[0].version.split(' ').slice(0, 2).join(' '))
  } catch (err) {
    console.error('Connection failed:', err.message)
    await pool.end()
    process.exit(1)
  }

  console.log('\nCreating tables...')

  await run('User', `
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      "emailVerified" TIMESTAMP WITH TIME ZONE,
      image TEXT,
      password TEXT,
      balance DOUBLE PRECISION NOT NULL DEFAULT 1000,
      role TEXT NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `)

  await run('Account', `
    CREATE TABLE IF NOT EXISTS "Account" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, "providerAccountId")
    )
  `)

  await run('Session', `
    CREATE TABLE IF NOT EXISTS "Session" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "sessionToken" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      expires TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `)

  await run('VerificationToken', `
    CREATE TABLE IF NOT EXISTS "VerificationToken" (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires TIMESTAMP WITH TIME ZONE NOT NULL,
      UNIQUE(identifier, token)
    )
  `)

  await run('Fight', `
    CREATE TABLE IF NOT EXISTS "Fight" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "externalId" TEXT UNIQUE NOT NULL,
      sport TEXT NOT NULL DEFAULT 'mma_mixed_martial_arts',
      "eventName" TEXT,
      "homeTeam" TEXT NOT NULL,
      "awayTeam" TEXT NOT NULL,
      "commenceTime" TIMESTAMP WITH TIME ZONE NOT NULL,
      "homeOdds" DOUBLE PRECISION,
      "awayOdds" DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'upcoming',
      winner TEXT,
      "lastOddsUpdate" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `)

  await run('Bet', `
    CREATE TABLE IF NOT EXISTS "Bet" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "fightId" TEXT NOT NULL REFERENCES "Fight"(id) ON DELETE CASCADE,
      fighter TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      odds DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payout DOUBLE PRECISION,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `)

  await run('Transaction', `
    CREATE TABLE IF NOT EXISTS "Transaction" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      description TEXT NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `)

  // Seed admin (bcrypt hash of "admin123" with 12 rounds)
  console.log('\nCreating admin user...')
  try {
    const res = await pool.query(`
      INSERT INTO "User" (id, name, email, password, role, balance)
      VALUES (gen_random_uuid()::text, 'Admin', 'admin@octagonbet.com', $1, 'admin', 999999)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4e7HT.Bi0K'])

    if (res.rows[0]) {
      await pool.query(`
        INSERT INTO "Transaction" (id, "userId", type, amount, description)
        VALUES (gen_random_uuid()::text, $1, 'initial', 999999, 'Admin account')
      `, [res.rows[0].id])
    }
    console.log('  ✓ admin@octagonbet.com / admin123')
  } catch (err) {
    // User might already exist
    const existing = await pool.query(`SELECT id FROM "User" WHERE email = 'admin@octagonbet.com'`)
    if (existing.rows[0]) {
      console.log('  ✓ Admin already exists')
    } else {
      console.error('  ✗ Admin:', err.message)
    }
  }

  // Seed demo fights
  console.log('\nCreating demo fights...')
  const fights = [
    { exId: 'demo-1', home: 'Jon Jones', away: 'Stipe Miocic', homeOdds: -450, awayOdds: 320, days: 3 },
    { exId: 'demo-2', home: 'Islam Makhachev', away: 'Charles Oliveira', homeOdds: -300, awayOdds: 240, days: 5 },
    { exId: 'demo-3', home: 'Alex Pereira', away: 'Jiri Prochazka', homeOdds: -175, awayOdds: 145, days: 7 },
  ]

  for (const f of fights) {
    const commence = new Date(Date.now() + f.days * 24 * 60 * 60 * 1000)
    await run(`${f.home} vs ${f.away}`, `
      INSERT INTO "Fight" (id, "externalId", "homeTeam", "awayTeam", "homeOdds", "awayOdds", "commenceTime")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)
      ON CONFLICT ("externalId") DO NOTHING
    `, [f.exId, f.home, f.away, f.homeOdds, f.awayOdds, commence])
  }

  await pool.end()

  console.log('\n=== Setup complete! ===')
  console.log('Admin login: admin@octagonbet.com / admin123')
  console.log('Run: npm run dev')
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
