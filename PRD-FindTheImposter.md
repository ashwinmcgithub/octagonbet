# Product Requirements Document
## Find the Imposter — Niche-Adjacent Social Deduction Game

**Version:** 1.0
**Date:** 2026-03-11
**Status:** Draft

---

## 1. Product Vision

Find the Imposter is a high-stakes social deduction web game designed to challenge players' vocabulary and perception. Using "Niche-Adjacent" word pairing and a mandatory 5-round format, the game prevents quick guesses and forces the Imposter to skillfully blend in while Civilians attempt to subtly verify each other's identity.

Unlike generic word games, every word pair is carefully chosen from the same sub-category — close enough to confuse, different enough to matter.

---

## 2. Target Users

| User | Description |
|---|---|
| Casual groups | Friends playing in the same room on separate phones |
| Online groups | Remote players in a shared session |
| Party hosts | Someone who wants a quick, no-download party game |

**Minimum players:** 3
**Maximum players:** 12
**Session length:** ~10–15 minutes per game

---

## 3. Core Game Flow

### 3.1 Lobby & Room Management

- Any user can **create a room** — no account required
- Rooms are identified by a **unique 6-character room code**
- Players join via **room code** or **shareable link**
- The **Host** (creator) controls the start trigger
- Players can set a display name on join (no registration needed)
- Room is destroyed after the game ends or after 30 minutes of inactivity

### 3.2 Role & Word Assignment

When the Host starts the game:

1. System picks one **Niche-Adjacent word pair** from the database
2. Roles are assigned randomly:
   - **Civilians (N−1 players):** receive the **Common Word**
   - **Imposter (1 player):** receives the **Close Word**
3. Each player sees a **"Tap & Hold to Reveal"** card — hidden by default for physical room privacy
4. No player knows who received which word

### 3.3 The 5-Round Inquisition

- The game **strictly requires 5 full rounds** before voting opens
- Each round: every player gives exactly **one sentence or clue** about their word
- A **"Current Speaker" indicator** highlights whose turn it is (sequential order)
- **The Log sidebar** records every clue from every round
- The **Vote button is locked** until the last player finishes their clue in Round 5
- Players cannot skip or pass — they must submit something

### 3.4 Voting Phase

After Round 5 completes:

- All players enter the **Voting Screen**
- Each player votes for who they think the Imposter is
- Votes are **anonymous** — hidden until everyone submits or the timer expires
- **Vote timer:** 60 seconds (configurable by host)

### 3.5 Win Conditions

| Outcome | Condition |
|---|---|
| Civilian Victory | Majority vote correctly identifies the Imposter |
| Imposter Victory (escape) | Majority votes for an innocent Civilian |
| Imposter Victory (confusion) | Vote ends in a tie |

### 3.6 The Last Stand Mechanic

If the Imposter is correctly identified by majority vote, they get **one final chance**:

- The Imposter must **type the Civilians' exact word**
- **Success:** Imposter wins (or game is declared a Draw — configurable)
- **Failure:** Civilians win

This mechanic prevents the Imposter from losing without a fighting chance and adds dramatic tension at the reveal.

---

## 4. Word Logic — Anti-Guessing Strategy

Words are **never generic**. Every pair is chosen from the same sub-category so both the Civilian and Imposter can speak plausibly about their word.

### Design Rules for Word Pairs
- Both words must share ≥90% of surface-level attributes
- The difference must be specific enough to be detectable in clues by Round 4–5
- Words must not be so niche that non-expert players cannot give clues

### Sample Word Pairs by Category

| Category | Civilian Word | Imposter Word | Shared Attribute |
|---|---|---|---|
| Tech | FaceID | Fingerprint Sensor | Biometric authentication |
| Gym | Deadlift | Squat | Barbell + leg-dominant |
| Brands | Pepsi | Coca-Cola | Cola drinks |
| Food | Cappuccino | Latte | Espresso-based milk drinks |
| Sports | Sprint | Hurdles | Running track events |
| Animals | Alligator | Crocodile | Large reptiles |
| Space | Meteor | Meteorite | Rocks from space |
| Music | Guitar | Bass Guitar | String instruments |
| Movies | Marvel | DC | Superhero cinematic universes |
| Finance | Debit Card | Credit Card | Bank-issued payment cards |

### Difficulty Tiers

| Tier | Description | Example |
|---|---|---|
| Easy | Common knowledge pairs | Pepsi vs Coca-Cola |
| Medium | Requires general awareness | Deadlift vs Squat |
| Hard | Requires domain knowledge | FaceID vs Fingerprint Sensor |

Host selects difficulty before starting. Default: Medium.

---

## 5. Functional Requirements

| Feature | Requirement |
|---|---|
| Real-time sync | WebSockets (Socket.io) — all game state changes broadcast instantly to all players in the room |
| Privacy mode | Secret word hidden by default; only visible while player taps and holds the card |
| Round tracker | Persistent UI element: "Round X of 5" — always visible |
| Word database | Curated list of Niche-Adjacent pairs, tagged by category and difficulty |
| Anonymous voting | Individual votes hidden until all submitted or timer expires |
| Last Stand input | Text input shown only to the caught Imposter after vote reveal |
| Room cleanup | Auto-destroy room on game end or 30 min idle |
| No account required | Entirely session-based; display name set on join |
| Clue log | Sidebar/panel records every clue in chronological order with player name + round number |
| Turn enforcement | Backend enforces turn order — only the current speaker can submit a clue |

---

## 6. UI / Screen Requirements

### 6.1 Landing Page
- **Create Room** button → generates room code, takes Host to lobby
- **Join Room** input → enter 6-character code → enter display name → enter lobby
- Shareable link auto-joins with code pre-filled

### 6.2 Lobby Screen
- Shows room code prominently (for sharing)
- Lists all players who have joined with their display names
- Host sees **Start Game** button (disabled until ≥3 players)
- Host can set difficulty (Easy / Medium / Hard)

### 6.3 Word Reveal Screen
- Full-screen card with blurred/hidden word
- Large instruction: **"Tap & Hold to See Your Word"**
- Word visible only while finger/mouse is held down
- Beneath the word: your role label — **CIVILIAN** or **IMPOSTER**
- "Ready" button to confirm they've seen it — game waits for all players

### 6.4 Game Board Screen
- **Top:** Secret word (hidden by default, tap-hold to reveal again)
- **Top right:** Round counter — "Round 2 of 5"
- **Center:** Current speaker name + pulsing indicator
- **Center input:** Text box for current speaker's clue (disabled for all others)
- **Side panel / bottom drawer (mobile):** The Log — all previous clues, grouped by round

### 6.5 Voting Screen
- Grid of all player names as vote cards
- Player taps a card to vote — can change before submitting
- **Submit Vote** button
- Once submitted, shows "Waiting for X more players…"
- Vote reveal: animated unmasking of all votes simultaneously

### 6.6 Results / Reveal Screen
- High-contrast animation revealing:
  - Who the Imposter was
  - The Civilian word + the Imposter word side by side
  - Who won
- If Last Stand triggered: dramatic "Guess the Word" input screen for the Imposter
- **Play Again** button (same room, new game) / **Leave Room** button

---

## 7. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS (mobile-first, responsive) |
| Backend | Node.js + Express |
| Real-time | Socket.io (WebSockets) |
| Database | JSON flat-file or PostgreSQL for word pairs; Redis or in-memory store for live game state |
| Frontend hosting | Vercel |
| Backend hosting | Railway or Render |
| No auth required | Session-based only (localStorage UUID per player) |

### Socket.io Events (Key)

| Event | Direction | Description |
|---|---|---|
| `room:join` | Client → Server | Player joins room |
| `room:update` | Server → All | Player list updated |
| `game:start` | Server → All | Roles + words assigned |
| `game:clue_submit` | Client → Server | Current speaker submits clue |
| `game:clue_broadcast` | Server → All | Clue added to The Log |
| `game:next_turn` | Server → All | Advance to next speaker |
| `game:round_end` | Server → All | Round completed |
| `game:vote_open` | Server → All | Unlock voting (after Round 5) |
| `game:vote_submit` | Client → Server | Player submits vote |
| `game:vote_reveal` | Server → All | All votes revealed simultaneously |
| `game:last_stand` | Server → Imposter | Prompt Imposter to guess word |
| `game:result` | Server → All | Final result broadcast |

---

## 8. Game State Machine

```
LOBBY
  └─→ WORD_REVEAL (all players ready)
        └─→ ROUND_1 ... ROUND_5 (5 rounds, each with N turns)
              └─→ VOTING (all clues submitted)
                    └─→ VOTE_REVEAL
                          ├─→ LAST_STAND (if Imposter caught)
                          │     └─→ RESULT
                          └─→ RESULT (if Imposter escaped)
```

---

## 9. Scoring System (Optional / Phase 2)

| Event | Points |
|---|---|
| Correctly vote for Imposter | +2 pts per Civilian |
| Imposter survives vote | +3 pts for Imposter |
| Imposter guesses word correctly (Last Stand) | +5 pts for Imposter |
| Voted for incorrectly (false accusation) | 0 pts |

Scores tracked per player across multiple rounds in the same room session. Persistent leaderboards are a Phase 2 feature.

---

## 10. Out of Scope (v1.0)

- User accounts / authentication
- Persistent leaderboards across sessions
- Custom word pair entry by players
- Spectator mode
- Voice chat integration
- Mobile native app (web only for v1)
- Multiple imposters per round

---

## 11. Open Questions

| # | Question | Owner |
|---|---|---|
| 1 | Should ties in voting always go to Imposter, or trigger a re-vote? | Product |
| 2 | Is the Last Stand guess case-sensitive? | Engineering |
| 3 | How many word pairs needed at launch? (Recommended: 50+ per difficulty) | Content |
| 4 | Should the Host be able to pause / kick players? | Product |
| 5 | Is a 60-second vote timer the right default? | Design |

---

## 12. Success Metrics (Launch)

| Metric | Target |
|---|---|
| Average session completion rate | >70% of started games reach Result screen |
| Rounds per session | 5 (enforced — metric validates enforcement works) |
| Last Stand activation rate | >40% of caught Imposter games |
| Return play rate | >50% of rooms click "Play Again" |
