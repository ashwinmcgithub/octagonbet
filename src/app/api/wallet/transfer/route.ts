import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive().int(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { recipientEmail, amount } = parsed.data

  if (recipientEmail.toLowerCase() === session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can't send ApexCoins to yourself" }, { status: 400 })
  }

  // Find recipient
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
    select: { id: true, name: true, email: true },
  })
  if (!recipient) {
    return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  }

  // Check sender balance
  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true, name: true },
  })
  if (!sender || sender.balance < amount) {
    return NextResponse.json({ error: 'Insufficient ApexCoins' }, { status: 400 })
  }

  // Atomic transfer
  await prisma.$transaction([
    // Deduct from sender
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: amount } },
    }),
    // Credit recipient
    prisma.user.update({
      where: { id: recipient.id },
      data: { balance: { increment: amount } },
    }),
    // Sender transaction log
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'transfer_out',
        amount: -amount,
        description: `Sent FC${amount.toLocaleString()} to ${recipient.name ?? recipient.email}`,
      },
    }),
    // Recipient transaction log
    prisma.transaction.create({
      data: {
        userId: recipient.id,
        type: 'transfer_in',
        amount: amount,
        description: `Received FC${amount.toLocaleString()} from ${sender.name ?? session.user.email}`,
      },
    }),
  ])

  const updatedSender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  })

  return NextResponse.json({
    balance: updatedSender?.balance ?? 0,
    sent: amount,
    recipient: recipient.name ?? recipient.email,
  })
}
