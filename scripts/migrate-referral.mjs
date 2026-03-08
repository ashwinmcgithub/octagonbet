/**
 * Migration: Add referralCode and referredBy columns to User table.
 * Run: node scripts/migrate-referral.mjs
 */

import './dns-fix.mjs'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '../.env'), 'utf8')
const DATABASE_URL = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1]

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function main() {
  console.log('Connecting to Neon...')
  await pool.query('SELECT 1')
  console.log('Connected.\n')

  console.log('Adding referralCode column...')
  try {
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT UNIQUE`)
    console.log('  ✓ referralCode column added')
  } catch (err) {
    console.error('  ✗ referralCode:', err.message)
  }

  console.log('Adding referredBy column...')
  try {
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT`)
    console.log('  ✓ referredBy column added')
  } catch (err) {
    console.error('  ✗ referredBy:', err.message)
  }

  await pool.end()
  console.log('\nMigration complete!')
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
