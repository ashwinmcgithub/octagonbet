import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      referralCode: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const referralCount = await prisma.user.count({
    where: { referredBy: user.id },
  })

  return NextResponse.json({ ...user, referralCount })
}
