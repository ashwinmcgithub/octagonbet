import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL not set')

const adapter = new PrismaNeon({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@octagonbet.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@octagonbet.com',
      password: adminPassword,
      role: 'admin',
    },
  })

  console.log('Admin created:', admin.email, '/ password: admin123')
  console.log('\nDone! Visit http://localhost:3000 to see the site.')
  console.log('Admin login: admin@octagonbet.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
