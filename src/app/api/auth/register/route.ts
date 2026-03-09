import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
})

function generateReferralCode(name: string): string {
  const base = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
  const suffix = Math.floor(100 + Math.random() * 900).toString()
  return `${base}${suffix}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, phone, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    // Validate referral code if provided
    let referrer: { id: string; name: string | null } | null = null
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { id: true, name: true },
      })
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
      }
    }

    const hashed = await bcrypt.hash(password, 12)

    // Generate unique referral code for new user
    let newReferralCode = generateReferralCode(name)
    while (await prisma.user.findUnique({ where: { referralCode: newReferralCode } })) {
      newReferralCode = generateReferralCode(name)
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone: phone || null,
        balance: 1000,
        referralCode: newReferralCode,
        referredBy: referrer?.id ?? null,
        transactions: {
          create: {
            type: 'initial',
            amount: 1000,
            description: 'Welcome bonus — 1,000 ApexCoins to get you started!',
          },
        },
      },
    })

    // Credit referrer 500 FC
    if (referrer) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: referrer.id },
          data: { balance: { increment: 500 } },
        }),
        prisma.transaction.create({
          data: {
            userId: referrer.id,
            type: 'referral_bonus',
            amount: 500,
            description: `Referral bonus — ${name} signed up with your code!`,
          },
        }),
      ])
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[register] error:', err?.message, err?.code, err?.stack?.slice(0, 500))
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
