import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/groups/[groupId]/messages?after=<ISO>
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params
  const after = req.nextUrl.searchParams.get('after')

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const messages = await prisma.message.findMany({
    where: {
      groupId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json(messages)
}

// POST /api/groups/[groupId]/messages
export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params
  const { content, mediaUrl, mediaType } = await req.json()

  // Must have text or media
  if (!content?.trim() && !mediaUrl) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const message = await prisma.message.create({
    data: {
      groupId,
      userId: session.user.id,
      content: content?.trim() ?? '',
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  })

  // Bump group updatedAt
  await prisma.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } })

  return NextResponse.json(message)
}
