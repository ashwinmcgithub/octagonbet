import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/groups/[groupId] — group info + members
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  return NextResponse.json(group)
}

// PATCH /api/groups/[groupId] — rename group (owner only)
export async function PATCH(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (group.ownerId !== session.user.id) return NextResponse.json({ error: 'Only the owner can rename this group' }, { status: 403 })

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { name: name.trim(), description: description?.trim() ?? group.description },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } }, orderBy: { joinedAt: 'asc' } },
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/groups/[groupId] — leave (or delete if owner)
export async function DELETE(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = params

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (group.ownerId === session.user.id) {
    // Owner deletes the whole group
    await prisma.group.delete({ where: { id: groupId } })
    return NextResponse.json({ deleted: true })
  }

  // Member leaves
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  return NextResponse.json({ left: true })
}
