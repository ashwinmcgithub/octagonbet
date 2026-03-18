# Edit Log — 2026-03-10

> This log covers all changes made in the Claude Code session on 2026-03-10.
> Intended as a reference for future AI assistants (Codex, Claude, etc.) working on this codebase.

---

## 1. Tiered Hero Layout on Landing Page

**Commits:** `3a5a457`
**Files changed:**
- `src/app/page.tsx` — full rewrite of content section
- `src/components/SeasonBanner.tsx` — exported `BannerCard` and `Announcement`

**What changed:**
- Removed the standalone floating `<SeasonBanner />` between the hero tagline and content
- `BannerCard` and `Announcement` are now named exports from `SeasonBanner.tsx` so they can be reused inline
- Landing page content now follows a **tiered hierarchy**:
  1. **Hero card** — top-priority fight/event shown centered with a red glow ring and badge
  2. **Secondary grid** — remaining cards in `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
  3. **Inline banners** — `SeasonAnnouncement` cards injected at the top of each matching sport section instead of floating separately
- Added `useSWR('/api/announcements')` fetch in `page.tsx` to drive inline banners
- Added `InlineBannerRow` helper component inside `page.tsx`

---

## 2. UFC Card Fight Ordering: Main Card on Top, Prelims Below

**Commits:** `49a7c64`, `632a5de`, `6556980`
**Files changed:**
- `src/app/page.tsx` — MMA section rendering logic

**What changed:**
- Fights within each UFC card are split into two groups using `getBoutPriority()`:
  - **Main card** (`priority !== 3`): main event (0), co-main (1), main card bouts (2), unlabeled (4)
  - **Prelims** (`priority === 3`): only fights explicitly labeled with "Prelims" in `eventName`
- Main event (priority 0) shown as centered **hero card** with red glow + pulsing badge
- Co-main + main card bouts rendered in a standard grid below the hero
- Prelims separated by a `─── Prelims · N fights ───` divider line at the bottom
- **Safety guard**: if `mainCardFights` is empty (all fights are prelims), falls back to all fights as main card so `heroFight` is never `undefined`
- **Bug fixed**: unlabeled fights (priority 4) were incorrectly going to prelims section — fixed to keep them in main card

**Priority mapping (`getBoutPriority`):**
```
0 = eventName contains "Main Event"
1 = eventName contains "Co-Main"
2 = eventName contains "Main Card"
3 = eventName contains "Prelims"   ← only these go to bottom
4 = everything else / null         ← stays in main card
```

---

## 3. Sport Events: Same Sort Order as MMA

**Commit:** `1a0f01e`
**Files changed:**
- `src/app/page.tsx` — sport events grouped map

**What changed:**
- Each sport's events are now sorted before rendering: `live → upcoming → completed`, then by `commenceTime` ascending
- This mirrors the MMA fight sort using the same `STATUS_ORDER` constant
- The first event after sorting becomes the **hero event** (featured match badge + full-width display)
- Remaining events go into the secondary grid below

---

## 4. Image & Video Sharing in Group Chat

**Commits:** `0e5959d`, `ededdb2`, `bfeb328`, `9e8fd95`, `8cf84fe`, `6871106`, `731ce19`
**Files changed:**
- `prisma/schema.prisma` — added `mediaUrl String?` and `mediaType String?` to `Message` model; `content` now has `@default("")`
- `src/app/api/groups/[groupId]/messages/route.ts` — POST accepts `mediaUrl` + `mediaType`; allows empty text if `mediaUrl` present
- `src/app/groups/[groupId]/page.tsx` — full chat UI with media support
- `src/app/api/upload/config/route.ts` — **new file**, public endpoint returning Cloudinary credentials

**Schema change (already pushed to DB via `prisma db push`):**
```prisma
model Message {
  ...
  content   String   @default("")   // was required String, now has default
  mediaUrl  String?                 // NEW — Cloudinary URL
  mediaType String?                 // NEW — "image" | "video"
  ...
}
```

**How file upload works:**
1. User clicks **paperclip button** (📎) in chat input bar
2. Hidden `<input type="file" accept="image/*,video/*">` opens file picker
3. Local preview shown immediately via `URL.createObjectURL()`
4. Client fetches `/api/upload/config` to get Cloudinary credentials
5. File uploaded **directly from browser to Cloudinary** (bypasses Vercel body size limits)
6. On success, `cloudUrl` stored in `mediaPreview` state
7. On send: `mediaUrl` + `mediaType` included in POST to `/api/groups/[groupId]/messages`
8. Messages render images (clickable, opens full-size) and videos (native controls)

**File size limits:**
- Images: 10 MB (Cloudinary free tier max)
- Videos: 100 MB (Cloudinary free tier max)

**Cloudinary config:**
- Cloud name: `dbwkbqdqi`
- Upload preset: `octagonbet_chat` (must be set to **Unsigned** in Cloudinary dashboard)
- Config served from `/api/upload/config` (no auth required — unsigned presets are public by design)
- Credentials are hardcoded in the API route (not env vars) due to Vercel CLI adding trailing `\n` to piped env var values

**Bugs fixed during this feature:**
- `NEXT_PUBLIC_` env vars are baked at build time — switched to server-side API route
- Vercel CLI `echo "value" | vercel env add` injects a trailing `\n` — worked around by hardcoding
- Auth gate on config endpoint was causing 401s — removed since unsigned preset is public

---

## Key Files Reference (updated)

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Landing page — tiered hero layout, inline banners, MMA + sport sections |
| `src/components/SeasonBanner.tsx` | Season announcement banners — exports `BannerCard`, `Announcement` |
| `src/app/groups/[groupId]/page.tsx` | Group chat room — messages, group bets, file upload |
| `src/app/api/groups/[groupId]/messages/route.ts` | Chat messages API — GET (poll) + POST (send with optional media) |
| `src/app/api/upload/config/route.ts` | Returns Cloudinary cloud name + upload preset |
| `prisma/schema.prisma` | DB schema — `Message` now has `mediaUrl` + `mediaType` |

---

## Environment Variables (Vercel Production)

| Variable | Value | Notes |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `dbwkbqdqi` | Has trailing `\n` from CLI — ignored, hardcoded in route |
| `CLOUDINARY_UPLOAD_PRESET` | `octagonbet_chat` | Has trailing `\n` from CLI — ignored, hardcoded in route |
| `DATABASE_URL` | Neon PostgreSQL | Must include `channel_binding=disable` |
| `NEXTAUTH_SECRET` | — | JWT signing |
| `NEXTAUTH_URL` | `https://octagonbet.vercel.app` | Must match exactly |

## 2026-03-12
- Removed Observation Deck game route and card.
- Added Games Hub banner on homepage linking to /games.
- Added Outpost Anomaly as a game in the games list (kept).
- Moved new game images to public/games and wired them into Find the Imposter and Phantom Protocol cards with responsive Next/Image.
- Updated chat input on Find the Imposter room to be sticky on mobile (safe-area padding).

## 2026-03-12 (Find the Imposter updates)
- Added early-round voting after each clue round and updated vote resolution logic.
- Added rematch API and UI button to reuse the same room after completion.
- Split clue input from chat input (two bars) and kept chat always available.
- Added low-volume looping background music during active/voting/last-stand phases.

## 2026-03-13
- Simplified the front page to two primary options (Games and UFC Betting).
- Added a clear sign-in note on the Games card and tightened CTA styling.

## 2026-03-13
- Fixed UTF-8 build failure on betting page by rewriting with ASCII-safe labels.
- Deployed production build to octagonbet.vercel.app.

## 2026-03-13 (Find the Imposter voting + elimination)
- Added no-vote option during round voting and majority-based elimination.
- Eliminated players become spectators and are excluded from clue turns and voting.

## 2026-03-13 (Outpost Anomaly UX)
- Added an intro briefing modal and exit-confirm dialog (back button and Back to Games).
- Added crew color dots to each log entry and enhanced the spatial grid styling.
- Replaced Advance Day with Next Day + Previous Day and removed New Run.

## 2026-03-13 (Games visuals)
- Added background image to the games section with low opacity.
- Added Game Zone and UFC Betting intro images to the homepage cards.

## 2026-03-13 (Outpost Anomaly grid rollback)
- Reverted the arcade-style grid redesign back to the simpler grid layout.
- Ensured crew dots in the comms log are full circles.

## 2026-03-13 (Game audio)
- Added Phantom Protocol background music and set game music volume to 15%.

## 2026-03-13
- Added Outpost Anomaly background music at 15% volume on start (loops).

## 2026-03-13
- Added intro images to Find the Imposter lobby and room views, and to Phantom Protocol room header.

## 2026-03-15
- Hardened Outpost Anomaly clue difficulty with denser legit vocab, more technical imposter phrasing, and closer mismatch rates.
