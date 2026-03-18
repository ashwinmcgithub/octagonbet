# OctagonBet Product Requirements Document
## Sports Expansion for India (Refined)
**Version:** 2.0  
**Status:** Draft for execution  
**Owner:** Product + Engineering  
**Date:** March 10, 2026

---

## 1. Purpose
Expand OctagonBet from UFC-only into a multi-sport, social-prediction platform for Indian users, while preserving the current no-real-money model (FightCoins only).

This document defines:
- What ships in each phase
- What explicitly does not ship
- Functional and technical requirements
- Acceptance criteria and KPIs

---

## 2. Product Vision
Become the default app for friend-group sports predictions in India:
- Fast event discovery
- Easy prediction placement
- Transparent settlement
- Strong social competition (groups, leaderboards, streaks)

Positioning:
- Not fantasy team-building (Dream11 model)
- Not real-money gambling
- Yes: outcome prediction with virtual currency and social rivalry

---

## 3. Goals and Non-Goals

### 3.1 Goals (next 6 months)
1. Support at least 4 sports with reliable event ingestion and settlement.
2. Increase weekly bet volume by 5x from current UFC baseline.
3. Make app usable year-round, not tied to UFC schedule only.
4. Ship sport-specific UI navigation and filtering.
5. Ship leaderboard + streak mechanics to increase retention.

### 3.2 Non-Goals (this plan)
1. Real-money deposits, withdrawals, or cash prizes.
2. In-app payment wallets (UPI/cards) for betting.
3. Full trading exchange or cash-out betting.
4. Native mobile app in phase 1-2.

---

## 4. Target Users

### Primary
- Age 18-35 in India
- Sports-following users active in friend groups (WhatsApp/Telegram/Discord)
- Already familiar with sports predictions

### Secondary
- College communities
- Office sports groups
- Existing fantasy sports users looking for quick prediction games

---

## 5. Market Scope and Launch Order

### Phase 1 Sports (Must Ship)
1. Cricket
2. Football
3. UFC/MMA (existing, retained)

### Phase 2 Sports (Next)
1. Kabaddi
2. Formula 1

### Phase 3 Sports (Later)
1. Tennis
2. Badminton
3. Chess
4. NBA
5. Boxing
6. WWE (must be clearly labeled entertainment/scripted)

Reasoning:
- Phase 1 prioritizes data availability + Indian demand + engineering feasibility.

---

## 6. Core Experience Requirements

## 6.1 Sports Lobby
User can:
- Switch by sport (Cricket, Football, MMA, etc.)
- See Live, Upcoming, Completed per sport
- View event cards with local time (IST), league, and market options

Must include:
- Empty states per sport/filter
- Fast switch without full page reload

## 6.2 Event Card
Each card must show:
- Teams/players/fighters
- Competition/league
- Start date/time in IST
- Market type (Match Winner, Toss Winner, etc.)
- Odds and status

## 6.3 Bet Placement
User can place:
- Standard outcome bet (`home`, `away`, optional `draw`)
- Proposition bet (yes/no or A/B options)

Validation:
- Sufficient balance
- Event is open
- Market is open
- Stake above minimum

## 6.4 Settlement
System must:
- Auto-settle from API when result is final
- Support manual admin settle for unsupported sports/APIs
- Log settlement source (`api`, `manual`, `corrected`)
- Record full audit trail for disputes

## 6.5 Social Features
Must ship:
- Global leaderboard
- Sport leaderboard
- Weekly reset leaderboard
- Streak badges (per sport)

---

## 7. Data and Domain Model

Current `Fight` model is too narrow. Move to generic event + market models.

### 7.1 Minimum Schema Direction
```prisma
model SportEvent {
  id             String   @id @default(cuid())
  externalId     String   @unique
  sport          String   // cricket, football, mma, f1...
  league         String   // IPL, EPL, UFC...
  eventName      String?
  homeTeam       String
  awayTeam       String
  commenceTime   DateTime
  status         String   @default("upcoming") // upcoming/live/completed/cancelled
  result         String?  // home/away/draw/no_result
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  markets        Market[]
}

model Market {
  id             String   @id @default(cuid())
  eventId        String
  marketType     String   // moneyline, toss_winner, over_under, prop_yes_no...
  label          String
  status         String   @default("open") // open/closed/settled/void
  options        Json     // [{key,label,odds}]
  resultKey      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  event          SportEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  bets           Bet[]
}
```

Notes:
- Keep legacy `Fight` backward-compatible during migration window.
- Do not hard-cut old endpoints until parity is proven.

---

## 8. API/Data Source Strategy

## 8.1 Initial Data Sources
1. Cricket: CricAPI (or equivalent)
2. Football: football-data.org (plus optional backup provider)
3. MMA: existing Odds API integration
4. F1 (phase 2): Ergast/OpenF1
5. Manual admin path: kabaddi + any API outage scenario

## 8.2 Sync Jobs
Replace single UFC-only sync with per-sport jobs:
- `POST /api/sports/sync?scope=cricket`
- `POST /api/sports/sync?scope=football`
- `POST /api/sports/sync?scope=mma`
- `POST /api/sports/sync?scope=all`

Requirements:
- Idempotent upsert by `externalId`
- Rate-limit protection
- Retry with backoff
- Dead-letter logging for failed events

---

## 9. Legal and Compliance Constraints

Hard requirements:
1. FightCoins remain non-withdrawable and non-convertible.
2. UI must clearly disclose virtual-currency prediction nature.
3. WWE markets must be labeled:
   - "Entertainment Prediction - scripted outcomes"
4. Terms and disclaimer updates required before multi-sport launch.

Note:
- This PRD is not legal advice. Production launch requires India-focused legal review.

---

## 10. Analytics and Success Metrics

## 10.1 North Star
- Weekly settled predictions per active user

## 10.2 Core Metrics
1. DAU / WAU
2. Bets placed per day
3. Settled bets per day
4. 7-day retention
5. Group activity rate
6. Sport distribution (% of bets by sport)
7. Failed settlement rate

## 10.3 Initial Targets
- 3 months:
  - 1,000 registered users
  - 250 WAU
  - 1,000 bets/week
  - <2% settlement failures requiring manual correction
- 6 months:
  - 3,000 registered users
  - 900 WAU
  - 4,000 bets/week

---

## 11. Rollout Plan

## Phase 1 (Weeks 1-8)
Scope:
1. SportEvent + Market schema
2. Cricket + Football ingestion
3. Sports Lobby UI
4. Bet placement on generic markets
5. Basic global/sport leaderboard
6. Manual settle admin tool

Exit criteria:
1. 95%+ events ingest without manual correction
2. End-to-end settlement working for cricket + football + MMA
3. No critical regressions in existing UFC flow

## Phase 2 (Weeks 9-16)
Scope:
1. Kabaddi (manual-first)
2. F1 ingestion
3. Streak badges
4. Weekly leaderboard reset
5. Prop market templates

Exit criteria:
1. At least 5 live leagues operational
2. Weekly leaderboard trusted and dispute-free

## Phase 3 (Weeks 17-24)
Scope:
1. Tennis/Badminton/Chess (prioritized by data quality)
2. Advanced props
3. Bet slip/parlay mode (optional, feature flag)
4. Notification events for live/settled bets

Exit criteria:
1. 8+ sports/competitions supported
2. 7-day retention improved by >=20% vs phase 1 baseline

---

## 12. Engineering Requirements

1. Backward compatibility:
   - Existing UFC endpoints continue to work during migration.
2. Observability:
   - Every sync run emits counts for fetched/upserted/failed/settled.
3. Data quality:
   - Strict mapping for teams/players normalization.
4. Reliability:
   - Job retries and safe re-runs.
5. Performance:
   - Sports lobby first contentful paint under 2.5s on 4G-equivalent network.

---

## 13. UX Requirements

1. All dates/times default to IST.
2. Event card text must pass contrast (WCAG AA minimum).
3. Sport filters must be one-tap accessible on mobile.
4. Market labels must be unambiguous and localized-ready.

---

## 14. Risks and Mitigation

1. API instability:
   - Mitigation: fallback provider + manual admin settlement path.
2. Rate limits:
   - Mitigation: cache + incremental sync windows.
3. Settlement disputes:
   - Mitigation: immutable settlement logs + source attribution.
4. Scope creep:
   - Mitigation: strict phase gates and exit criteria.
5. Legal misinterpretation:
   - Mitigation: explicit in-product disclosures and legal review before scale.

---

## 15. Open Questions

1. Which cricket API provider is final for production SLA?
2. Do we support parlays in phase 2 or behind invite-only flag?
3. What is the official policy for voided/cancelled markets by sport?
4. Is multilingual UI (Hindi) required in phase 1 or phase 2?
5. Which anti-abuse checks are mandatory for leaderboard integrity?

---

## 16. Immediate Execution Checklist (This Sprint)

1. Finalize SportEvent + Market schema and migration plan.
2. Implement cricket ingestion + settlement pipeline.
3. Implement football ingestion + settlement pipeline.
4. Build sports tabs in home lobby with IST display.
5. Add admin manual settlement page for generic events/markets.
6. Add instrumentation dashboards for sync and settlement health.

---

## 17. Acceptance Summary

This PRD is considered ready for engineering when:
1. Open questions are assigned owners.
2. Schema and API contracts are approved.
3. Phase 1 scope is estimated and scheduled.
4. Legal disclaimer language is approved.

