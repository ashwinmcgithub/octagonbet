import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const row = await prisma.seasonAnnouncement.update({
    where: { id: params.id },
    data: {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startsAt && { startsAt: new Date(body.startsAt) }),
      ...(body.bettingOpensAt !== undefined && { bettingOpensAt: body.bettingOpensAt ? new Date(body.bettingOpensAt) : null }),
    },
  })
  return NextResponse.json(row)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.seasonAnnouncement.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
