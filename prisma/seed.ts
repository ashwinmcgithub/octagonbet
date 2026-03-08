import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
      balance: 999999,
      transactions: {
        create: {
          type: 'initial',
          amount: 999999,
          description: 'Admin account',
        },
      },
    },
  })

  console.log('Admin created:', admin.email, '/ password: admin123')

  // Create demo fights (these will be replaced by real API data)
  const fights = [
    {
      externalId: 'demo-1',
      homeTeam: 'Jon Jones',
      awayTeam: 'Stipe Miocic',
      homeOdds: -450,
      awayOdds: 320,
      commenceTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      externalId: 'demo-2',
      homeTeam: 'Islam Makhachev',
      awayTeam: 'Charles Oliveira',
      homeOdds: -300,
      awayOdds: 240,
      commenceTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      externalId: 'demo-3',
      homeTeam: 'Alex Pereira',
      awayTeam: 'Jiri Prochazka',
      homeOdds: -175,
      awayOdds: 145,
      commenceTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const fight of fights) {
    await prisma.fight.upsert({
      where: { externalId: fight.externalId },
      update: {},
      create: fight,
    })
  }

  console.log(`Created ${fights.length} demo fights`)
  console.log('\nDone! Visit http://localhost:3000 to see the site.')
  console.log('Admin login: admin@octagonbet.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
