import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runPayout } from '@/lib/challenge-payout'

// GET /api/challenges/auto-resolve — called by cron job
// Finds all challenges past their resolve deadline and auto-resolves them
export async function GET() {
  const now = new Date()

  const expired = await prisma.challenge.findMany({
    where: {
      status: 'awaiting_resolution',
      resolveDeadline: { lt: now },
      winningSide: { not: null },
    },
    include: { participants: true },
  })

  const results: { id: string; status: string }[] = []

  for (const challenge of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await runPayout(tx, challenge, challenge.winningSide!, {})
      })
      results.push({ id: challenge.id, status: 'resolved' })
    } catch (err) {
      results.push({ id: challenge.id, status: `error: ${String(err)}` })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
