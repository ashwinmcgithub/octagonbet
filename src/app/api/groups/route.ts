import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// GET /api/groups — list groups the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(groups)
}

// POST /api/groups — create a group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const inviteCode = nanoid(6).toUpperCase()

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      inviteCode,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id },
      },
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true, messages: true } },
    },
  })

  return NextResponse.json(group)
}
