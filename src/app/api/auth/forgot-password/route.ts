import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to avoid email enumeration
  if (!user || !user.password) {
    return NextResponse.json({ success: true })
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expires },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL || 'https://apexwager.vercel.app'}/reset-password?token=${token}`

  return NextResponse.json({ success: true, resetUrl })
}
