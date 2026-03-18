# OctagonBet Handoff

Last updated: 2026-03-10  
Live URL: https://octagonbet.vercel.app  
Admin: admin@octagonbet.com / admin123

---

## 1) Current Product State

OctagonBet is a social UFC betting app (virtual currency: FightCoins, no real money).  
Core flows working:
- Register/login
- View upcoming/live/completed fights
- Place bets
- Wallet + transactions
- Admin settle/cancel flows

Recent work completed (the previously unfinished Claude thread is now finished):
- Demo Jon Jones seed removed
- Seed replaced with upcoming UFC poll fights
- Fight cards now show:
  - fighter images (with robust fallback)
  - weight-class/main-card labels
  - date in ordinal format (for example `14th March 2026`)
  - India time (IST)
- Home page defaults to upcoming fights so the app is not empty
- Fight cards grouped by weight categories on home view

---

## 2) Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma 7 + Neon adapter
- NextAuth v4
- PostgreSQL (Neon)
- Playwright tests

---

## 3) Key Files

Core:
- `src/app/page.tsx` - home page, filters, grouping by weight category
- `src/components/FightCard.tsx` - fight card UI, photos, IST date/time chips
- `src/lib/utils.ts` - formatting helpers, ordinal IST date formatter
- `src/lib/fighter-images.ts` - fighter image resolver + guaranteed fallback image

Data/seed:
- `prisma/seed.ts` - admin seed + upcoming UFC fight polls (no demo Jon Jones)
- `scripts/setup-db.mjs` - DB bootstrap with same UFC poll seed set
- `src/lib/prisma.ts` - PrismaNeon adapter runtime

APIs:
- `src/app/api/fights/route.ts`
- `src/app/api/bets/route.ts`
- `src/app/api/odds/sync/route.ts`
- `src/app/api/admin/fights/route.ts`

Continuity docs:
- `CLAUDE_EDIT_LOG_2026-03-09.md` - detailed per-edit trail from prior session
- `PRD-SportsBetting-Expansion.md` - refined v2 expansion PRD

---

## 4) Seed Data and Poll Behavior

Default seeded card now includes upcoming UFC Fight Night polls (instead of demo fights):
- Main card UTC: `2026-03-15T01:00:00Z` (IST: 6:30 AM)
- Prelim UTC: `2026-03-14T22:00:00Z` (IST: 3:30 AM)

Legacy demo records removed on seed/setup:
- `demo-1`
- `demo-2`
- `demo-3`

Run:
```bash
npm run db:seed
```

Note:
- `prisma/seed.ts` uses PrismaNeon adapter + `.env.local` + `ws` constructor.

---

## 5) UI Changes Completed

Fight card:
- Event label text switched to white for readability
- Date shown as ordinal IST (`14th March 2026`)
- Time shown as IST (`6:30 AM IST`)
- Fighter photo rendering with fallback data URI so image never appears blank

Home page:
- Default filter = `upcoming`
- Cards divided by weight categories (Featherweight, Lightweight, etc.)

---

## 6) Commands Verified

Executed successfully:
- `npm.cmd run db:seed`
- `npm.cmd run build`

Both completed after latest code changes.

---

## 7) Known Caveats

1. Some fighter image URLs rely on external sources and can fail; fallback image will still render.
2. Odds sync depends on external API quota/availability.
3. This is still virtual-currency-only; no real-money flows are implemented.

---

## 8) Next Suggested Engineering Steps

1. Move fighter image map to admin-editable storage (DB or CMS) instead of code constants.
2. Add Playwright coverage for:
   - image visibility on fight cards
   - weight-category section rendering
   - ordinal date format checks
3. Begin Phase 1 from `PRD-SportsBetting-Expansion.md`:
   - generic `SportEvent` model migration plan
   - cricket + football data ingestion pipeline

