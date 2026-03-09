import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/groups/join — join a group by invite code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const group = await prisma.group.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
  })
  if (!group) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Already a member?
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ groupId: group.id, alreadyMember: true })

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id },
  })

  return NextResponse.json({ groupId: group.id })
}
