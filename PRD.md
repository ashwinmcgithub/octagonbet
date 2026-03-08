# Product Requirements Document - OctagonBet

**Version:** 1.1
**Date:** 2026-03-08
**Status:** Updated

---

## 1. Product Overview

**OctagonBet** is a UFC fight betting web application where users wager virtual currency (FightCoins) on MMA fight outcomes. The platform pulls real-time odds from The Odds API and provides a full betting experience with **no real-money transactions**.

**Tagline:** "Bet on the Octagon - Real-time UFC odds. Watch your FightCoins grow."

---

## 2. Goals and Non-Goals

**Goals**
- Provide a fun, fast, virtual betting experience for UFC fights.
- Keep onboarding simple with a welcome bonus and easy recharge.
- Enable friends to help each other with FightCoins when a user runs out.

**Non-Goals**
- Real-money payments, deposits, or withdrawals.
- Gambling compliance features like KYC or age verification.
- Live video streaming.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Auth | NextAuth.js |
| External API | The Odds API (MMA/UFC odds) |
| Deployment | Vercel |

---

## 4. User Roles

| Role | Access |
|---|---|
| Guest | View fights, see odds |
| User | Place bets, manage wallet, view bet history, send/receive FightCoins |
| Admin | All user access + admin panel (stats, odds sync, fight/user management) |

---

## 5. Core Features

### 5.1 Authentication

- Email/password registration and login
- OAuth provider support (via NextAuth accounts)
- Session-based auth with NextAuth
- New users receive **1,000 FC** starting balance (welcome bonus)
- Role field (`user` / `admin`) controls admin panel access

**Pages:** `/login`, `/register`

---

### 5.2 Fight Listings (Home Page `/`)

The main page is the betting hub.

**Behavior:**
- Fetches all UFC fights from the database via `/api/fights`
- Auto-syncs odds from The Odds API every **2 minutes**
- Manual "Sync Odds" button with last-sync timestamp display
- Displays a live stats bar: live fight count, upcoming fight count, data source label

**Fight Filters:**
| Filter | Description |
|---|---|
| All | All fights regardless of status |
| Live | Fights currently in progress |
| Upcoming | Scheduled future fights |
| Completed | Finished fights with results |

**Fight Card (FightCard component):**
- Shows: fighter names, initials avatar, odds (American format), fight time countdown or status badge, bet count
- Status badges: LIVE NOW (pulsing), COMPLETED (trophy icon), time-until-fight countdown
- Winner highlighted in green after fight completion
- Clicking a fighter opens the Betting Modal (redirects to login if unauthenticated)

---

### 5.3 Betting (BettingModal)

Triggered by selecting a fighter on a FightCard.

**Fields and UI:**
- Selected fighter name and opponent display
- Current odds shown as American format (e.g., +150, -200)
- Bet amount input (numeric, labeled in FC)
- Quick-select amounts: **FC 50, 100, 250, 500**
- "Bet all" button (fills full wallet balance)
- Live payout preview: Stake, Profit, Total Payout

**Validation:**
- Amount must be > 0
- Amount must not exceed current balance (Insufficient FightCoins error)
- Cannot bet on completed fights

**On Success:**
- Balance deducted from user's account
- Transaction recorded
- Session balance refreshed in navbar
- Success message shown, modal auto-closes after 1.2 seconds

**API:** `POST /api/bets` with `{ fightId, fighter, amount }`

---

### 5.4 Wallet and Recharge (`/wallet`)

Manages the user's FightCoin balance.

**Balance Card:**
- Displays current FC balance (large prominent display)
- Shows user name and email

**Recharge (free virtual currency, no real money):**
- Users can recharge FightCoins for free.
- Each recharge grants a **1,000 FC bonus**.
- Recharge availability and limits are controlled by product rules (see Business Rules).

**Friend Support (Send/Receive):**
- If a user runs out of coins, friends can send FightCoins to them.
- Transfers are user-initiated and recorded as transactions.
- The sender chooses an amount; the recipient receives the same amount.

**Transaction History:**
| Type | Description |
|---|---|
| initial | Welcome bonus on registration |
| bet | Bet placed (negative amount) |
| win | Bet won (positive payout) |
| recharge | Free recharge bonus |
| transfer_in | FC received from friends |
| transfer_out | FC sent to friends |
| refund | Refund (e.g., cancelled fight) |

**API:** `GET /api/wallet`, `POST /api/wallet/recharge`, `POST /api/wallet/transfer`

---

### 5.5 My Bets (`/my-bets`)

Bet history and tracking for the logged-in user.

**Summary Stats:**
- Total Bets placed
- Total FC Won (sum of all winning payouts)
- Pending bets count

**Bet Status Filters:** All, Pending, Won, Lost

**Bet Card shows:**
- Fight date
- Fighter picked (highlighted) vs opponent
- Stake amount
- Odds at time of bet
- Profit (if won)
- Status badge: Pending (amber), Won (green), Lost (red), Cancelled (gray)
- Payout amount (if won)

**API:** `GET /api/bets`

---

### 5.6 Admin Panel (`/admin`)

Restricted to users with `role === 'admin'`. Accessible via the user dropdown menu.

**Admin Dashboard (`/admin`):**
- Stat cards: Total Users, Active Fights, Total Bets, Pending Bets
- Pending Bet Volume (total FC at risk across unsettled bets)
- "Sync Odds & Settle" button - triggers `/api/odds/sync` which:
  - Fetches latest odds from The Odds API
  - Syncs fight statuses
  - Settles completed bets and pays out winners
  - Returns count of synced fights and settled bets

**Admin Sub-pages:**
- `/admin/fights` - fight management
- `/admin/users` - user management

---

## 6. Data Models

### User
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String? | Display name |
| email | String | Unique |
| password | String? | Hashed |
| balance | Float | Default: 1000 FC |
| role | String | "user" or "admin" |
| createdAt / updatedAt | DateTime | Auto-managed |

### Fight
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| externalId | String | Unique, from The Odds API |
| sport | String | Default: "mma_mixed_martial_arts" |
| eventName | String? | UFC event name |
| homeTeam | String | Fighter 1 |
| awayTeam | String | Fighter 2 |
| commenceTime | DateTime | Scheduled fight time |
| homeOdds / awayOdds | Float? | American odds |
| status | String | "upcoming", "live", "completed" |
| winner | String? | "home", "away", or null |
| lastOddsUpdate | DateTime? | Last sync time |

### Bet
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String | FK -> User |
| fightId | String | FK -> Fight |
| fighter | String | "home" or "away" |
| amount | Float | FC staked |
| odds | Float | Odds at time of bet |
| status | String | "pending", "won", "lost", "cancelled" |
| payout | Float? | Set on settlement |

### Transaction
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String | FK -> User |
| type | String | "initial", "bet", "win", "recharge", "transfer_in", "transfer_out", "refund" |
| amount | Float | Positive or negative |
| description | String | Human-readable label |

---

## 7. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fights` | Public | List fights, filter by status |
| GET | `/api/fights/[id]` | Public | Single fight detail |
| POST | `/api/odds/sync` | Auth | Sync odds + settle bets |
| GET | `/api/bets` | User | Get user's bets |
| POST | `/api/bets` | User | Place a new bet |
| GET | `/api/wallet` | User | Get balance + transactions |
| POST | `/api/wallet/recharge` | User | Grant 1,000 FC recharge bonus |
| POST | `/api/wallet/transfer` | User | Send FC to a friend |
| GET | `/api/admin/stats` | Admin | Platform-wide stats |
| GET/POST | `/api/auth/[...nextauth]` | - | NextAuth handlers |
| GET | `/api/user` | User | Current user info |

---

## 8. Business Rules

1. Users cannot bet on completed fights.
2. Bets require a positive amount not exceeding the user's current balance.
3. Balance is deducted immediately when a bet is placed.
4. Bets are settled when an admin triggers "Sync Odds & Settle" or on auto-sync when a fight result is detected.
5. Winners receive full payout (stake + profit) based on American odds.
6. Cancelled fights trigger refunds.
7. FightCoins are virtual - **no real money involved**.
8. New accounts start with 1,000 FC.
9. Users can use **Recharge** to receive **1,000 FC** per recharge.
10. Recharge is free and has product-defined limits to prevent abuse (e.g., daily limit, cooldown).
11. If a user has **0 FC**, they can request help from friends.
12. Friends can transfer FC to other users (peer-to-peer).
13. Transfers are optional, user-initiated, and recorded as transactions.
14. Odds auto-refresh every 2 minutes on the home page.

---

## 9. UX and Design Conventions

- Dark theme with red (`primary`) accent color
- "Live" fights use amber/yellow indicators with pulsing animations
- "Won" states use green (`win` color)
- American odds format throughout (e.g., +150, -200)
- Responsive: desktop grid (3-col), tablet (2-col), mobile (1-col)
- Loading states: skeleton pulses and spinners
- Animations: fade-in, slide-up modals, spin on sync

---

## 10. Known Gaps / Potential Improvements

| Area | Gap |
|---|---|
| Payments | No real-money payments (intentionally out of scope) |
| Odds format | Only American odds - no Decimal/Fractional options |
| Bet types | Only fight winner betting - no round/method/prop bets |
| Live updates | Polling only (no WebSocket/SSE for real-time push) |
| Notifications | No email or in-app notifications for bet settlement |
| Bet limits | No max bet cap or house edge applied |
| KYC/Age verification | Not implemented |
| Leaderboard | No public ranking or social features |
| Admin fight management | Fight status/winner edit UI exists but not fully documented |
| Mobile app | Web only, no native app |
