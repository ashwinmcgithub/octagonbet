/**
 * Global setup: warms up the Vercel deployment + Neon DB before tests run.
 * Neon free-tier databases suspend after inactivity and need ~30s to wake up.
 */
import { request } from '@playwright/test'

async function globalSetup() {
  const BASE_URL = process.env.BASE_URL || 'https://octagonbet.vercel.app'
  console.log(`\n[Setup] Waking up Neon DB and warming Vercel at ${BASE_URL}...`)

  const ctx = await request.newContext()

  // Retry loop — Neon can take up to 45s to wake from suspension
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[Setup] Attempt ${attempt}/5 — hitting /api/fights...`)
      const res = await ctx.get(`${BASE_URL}/api/fights`, { timeout: 30000 })
      if (res.ok()) {
        console.log('[Setup] DB is awake! Waiting 2s for full warmup...')
        await new Promise(r => setTimeout(r, 2000))
        break
      }
    } catch {
      console.log(`[Setup] Attempt ${attempt} timed out — retrying...`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  await ctx.dispose()
  console.log('[Setup] Ready.\n')
}

export default globalSetup
