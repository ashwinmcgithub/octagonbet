import { adjustReputation } from '@/lib/reputation'

type Participant = {
  id: string
  userId: string
  side: string
}

type Challenge = {
  id: string
  title: string
  prizeType: string
  prizeAmount: number | null
  participants: Participant[]
  winningSide: string | null
}

/**
 * Runs the payout logic for a completed challenge.
 * Call this inside a prisma.$transaction callback.
 * winningSide overrides challenge.winningSide if provided.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runPayout(
  tx: any,
  challenge: Challenge,
  winningSide: string,
  options?: {
    penalizeLosers?: boolean       // -20 rep to each loser (witness path)
    rewardAcceptor?: string        // userId who accepted — gets +5 rep
    penalizeDisputer?: string      // userId who disputed falsely — gets -20 rep
  },
) {
  const winners = challenge.participants.filter((p) => p.side === winningSide)
  const losers = challenge.participants.filter((p) => p.side !== winningSide)

  if (challenge.prizeType === 'money') {
    const totalPool = challenge.participants.length * (challenge.prizeAmount ?? 0)
    const payoutPerWinner = winners.length > 0 ? totalPool / winners.length : 0

    for (const winner of winners) {
      await tx.user.update({ where: { id: winner.userId }, data: { balance: { increment: payoutPerWinner } } })
      await tx.transaction.create({
        data: {
          userId: winner.userId,
          type: 'challenge_won',
          amount: payoutPerWinner,
          description: `Won challenge: "${challenge.title}" — FC ${payoutPerWinner.toFixed(0)}`,
        },
      })
      await tx.challengeParticipant.update({ where: { id: winner.id }, data: { payout: payoutPerWinner } })
    }

    for (const loser of losers) {
      await tx.transaction.create({
        data: { userId: loser.userId, type: 'challenge_lost', amount: 0, description: `Lost challenge: "${challenge.title}"` },
      })
    }
  }

  // Reputation adjustments
  if (options?.rewardAcceptor) {
    await adjustReputation(tx, options.rewardAcceptor, 5)
  }
  if (options?.penalizeDisputer) {
    await adjustReputation(tx, options.penalizeDisputer, -20)
  }
  if (options?.penalizeLosers) {
    for (const loser of losers) {
      await adjustReputation(tx, loser.userId, -20)
    }
  }

  await tx.challenge.update({
    where: { id: challenge.id },
    data: { status: 'completed', winningSide },
  })
}
