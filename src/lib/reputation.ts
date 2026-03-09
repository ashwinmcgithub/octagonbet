/**
 * Adjusts a user's reputation score within a Prisma transaction.
 * Uses increment so concurrent updates are safe.
 * A separate post-clamp is omitted for simplicity — the UI shows
 * a floor of 0 visually. Use negative deltas for penalties.
 */
export async function adjustReputation(
  tx: { user: { update: (args: object) => Promise<unknown> } },
  userId: string,
  delta: number,
) {
  await tx.user.update({
    where: { id: userId },
    data: { reputation: { increment: delta } },
  })
}
