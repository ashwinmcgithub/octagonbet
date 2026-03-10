import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rows = await prisma.seasonAnnouncement.findMany({ orderBy: { startsAt: 'asc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { sport, title, description, startsAt, bettingOpensAt } = await req.json()
  if (!sport || !title || !startsAt) return NextResponse.json({ error: 'sport, title, startsAt required' }, { status: 400 })

  const row = await prisma.seasonAnnouncement.create({
    data: {
      sport,
      title: title.trim(),
      description: description?.trim() || null,
      startsAt: new Date(startsAt),
      bettingOpensAt: bettingOpensAt ? new Date(bettingOpensAt) : null,
    },
  })
  return NextResponse.json(row, { status: 201 })
}
