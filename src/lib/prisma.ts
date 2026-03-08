import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Use WebSocket (port 443) instead of direct TCP (port 5432)
if (typeof WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws')
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  console.log('[prisma] createClient called, DATABASE_URL present:', !!url, 'prefix:', url?.slice(0, 20))

  if (!url) throw new Error('DATABASE_URL not set')

  const pool = new Pool({ connectionString: url })
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter } as any)
}

// Export a lazy-initialized proxy so the client is created on first use
let _prisma: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma
  if (globalForPrisma.prisma) {
    _prisma = globalForPrisma.prisma
    return _prisma
  }
  _prisma = createClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _prisma
  }
  return _prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})
