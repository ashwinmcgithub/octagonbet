import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PACKAGES = {
  starter: { amount: 500, label: 'Starter Pack' },
  fighter: { amount: 2000, label: 'Fighter Pack' },
  champion: { amount: 5000, label: 'Champion Pack' },
  legend: { amount: 10000, label: 'Legend Pack' },
} as const

const schema = z.object({
  packageId: z.enum(['starter', 'fighter', 'champion', 'legend']),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { packageId } = schema.parse(await req.json())
    const pkg = PACKAGES[packageId]

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        balance: { increment: pkg.amount },
        transactions: {
          create: {
            type: 'purchase',
            amount: pkg.amount,
            description: `Purchased ${pkg.label} — +FC${pkg.amount.toLocaleString()}`,
          },
        },
      },
      select: { balance: true },
    })

    return NextResponse.json({ balance: user.balance, added: pkg.amount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Purchase failed' }, { status: 400 })
  }
}
