import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/announcements — public, returns active upcoming announcements
export async function GET() {
  const announcements = await prisma.seasonAnnouncement.findMany({
    where: { active: true },
    orderBy: { startsAt: 'asc' },
  })
  return NextResponse.json(announcements)
}
