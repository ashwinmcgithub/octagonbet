/**
 * Global setup — warms up the site before tests run.
 * For Vercel production runs, this wakes Neon DB from suspension.
 * For localhost runs, this is a no-op (server started via webServer config).
 */
import { request } from '@playwright/test'

async function globalSetup() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
  if (BASE_URL.includes('localhost')) return // dev server handles this

  console.log(`\n[Setup] Waking up Neon DB at ${BASE_URL}...`)
  const ctx = await request.newContext()
  for (let i = 1; i <= 5; i++) {
    try {
      console.log(`[Setup] Attempt ${i}/5...`)
      const res = await ctx.get(`${BASE_URL}/api/fights`, { timeout: 30000 })
      if (res.ok()) { console.log('[Setup] Ready.\n'); break }
    } catch {
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  await ctx.dispose()
}

export default globalSetup
