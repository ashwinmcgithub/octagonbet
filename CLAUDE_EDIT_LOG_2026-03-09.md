# Claude Continuity Edit Log (2026-03-09)

This file documents every edit made in this session so Claude can continue work safely.

## 1) Home page default filter changed to upcoming polls
- File: `src/app/page.tsx`
- Edit: Changed initial filter state from `live` to `upcoming`.
- Why: Site was appearing empty when there were no live fights. Upcoming fights now show first.

## 2) Added India time format helpers
- File: `src/lib/utils.ts`
- Edit: Added `formatDateIST()` and `formatTimeIST()` using timezone `Asia/Kolkata`.
- Why: User requested date/time specifically for India.

## 3) Added fighter image URL resolver
- File: `src/lib/fighter-images.ts` (new)
- Edit: Added:
  - `FIGHTER_IMAGE_MAP` for known fighters.
  - `getFighterImageUrl(fighterName)` with fallback to generated avatar image.
- Why: User requested fighter images on polls.

## 4) Fight poll card UI enhanced
- File: `src/components/FightCard.tsx`
- Edits:
  - Imported `formatDateIST`, `formatTimeIST`, and `getFighterImageUrl`.
  - Added poll metadata chips under event label:
    - `Prediction Poll`
    - `Date: <IST date>`
    - `India Time: <IST time>`
  - Replaced initials circles with fighter `img` thumbnails.
  - Added `onError` fallback image handling per fighter.
- Why: User requested poll data to include fighter images, category/main card context, and India date/time.

## 5) Removed Jon Jones demo seeding and replaced with upcoming UFC card
- File: `prisma/seed.ts`
- Edits:
  - Removed demo fights (`demo-1`, `demo-2`, `demo-3`), including Jon Jones.
  - Added UFC Fight Night seed fights with event labels for:
    - Main event / co-main
    - Main card categories
    - One prelim
  - Added `deleteMany` cleanup for old `demo-*` fights.
  - Updated upsert `update` payload so seeded fights refresh cleanly.
  - Updated console message to `Created/updated ... UFC fights`.
- Why: User requested removal of demo Jon Jones fight and non-empty upcoming UFC polls.

## 6) Updated standalone DB bootstrap script
- File: `scripts/setup-db.mjs`
- Edits:
  - Replaced demo fight seed block with upcoming UFC poll fights.
  - Added deletion of legacy `demo-*` fights.
  - Added `eventName` in insert.
  - Changed `ON CONFLICT DO NOTHING` to `ON CONFLICT DO UPDATE` for repeatable setup runs.
- Why: Keep bootstrap path aligned with seed.ts and remove old demo content.

## 7) Handoff docs continuity note
- File: `HANDOFF.md`
- Status: Not edited in this session (formatting/encoding conflicts in existing file).
- Next follow-up should add:
  - Seed data now uses upcoming UFC polls (no demo Jon Jones fight).
  - Fight card now includes fighter images plus IST date/time chips.
  - This file (`CLAUDE_EDIT_LOG_2026-03-09.md`) should be linked from `HANDOFF.md`.

## Data reference used
- Next UFC card baseline used in seed content:
  - UFC Fight Night: Emmett vs. Vallejos
  - Main card UTC: `2026-03-15T01:00:00Z`
  - Prelims UTC: `2026-03-14T22:00:00Z`
  - Displayed in UI as IST via timezone formatter.

## 8) Seed runtime compatibility fix (Prisma v7 + Neon adapter)
- File: `prisma/seed.ts`
- Edit:
  - Added Neon adapter initialization (`PrismaNeon`) with `DATABASE_URL`.
  - Added dotenv loading (`.env.local`) and WebSocket constructor (`ws`) setup.
  - Switched from `new PrismaClient()` to `new PrismaClient({ adapter })`.
- Why: Seeding was failing with Prisma client initialization error in this repo's adapter-based setup.
- Verification:
  - Ran `npm.cmd run db:seed` successfully.
  - Output: `Created/updated 7 UFC fights`.

## 9) UFC upcoming section grouping and bout ordering (2026-03-10)
- File: `src/app/page.tsx`
- Edit:
  - Grouped MMA/UFC fights by fight card name extracted from `eventName` (for example `UFC 300` / `UFC Fight Night`).
  - Ordered bouts inside each UFC card section as:
    1. Main Event
    2. Co-Main
    3. Main Card
    4. Prelims
    5. fallback by time
  - Ensured sport sections in all-sports view are rendered in a stable tab-based order.
- Why: User requested upcoming UFC display by card and main/co-main structure, and clear sectioning for all upcoming sports.
- Verification:
  - Ran `npm.cmd run build` successfully after changes.
