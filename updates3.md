# Updates 3 (2026-04-02)
> NOTE: This document is intentionally long (500+ lines) and is meant to be saved as `updates3.md`.
> Goal: tighten Match Pass timing + fix match lifecycle hotspots (before / live / after) end-to-end across backend + frontend.

---

## TL;DR (What we’re fixing)
- Match passes currently behave like: “active immediately if `expiresAt > now`”.
- There is no tracked **pass start** time, and no tracked **match end** time.
- Match lifecycle uses a single manual `match.isLive` boolean and a naive “past = kickoff <= now”.
- Watch pages trigger viewer counts and analytics even when the stream isn’t actually playing.
- Stream token TTL can exceed pass expiry by up to 10 minutes.

---

## Table of contents
- Definitions and target behavior
- Current reality (facts from code)
- Hotspots (backend + frontend)
- Proposed fixes (decision-complete)
- Match lifecycle gaps (before / during / after)
- Pass lifecycle gaps (purchase / upcoming / active / ended)
- API contract proposals
- UX behaviors per page
- Automated tests to add/update
- Manual QA scenarios (large checklist)
- Implementation checklist (large checklist)
- Notes / commands / line-count check

---

## 1) Definitions and target behavior (locked)
### 1.1 Time buffers (locked by request)
- Pregame buffer: **15 minutes** before kickoff
- Postgame buffer: **60 minutes** after match end

### 1.2 Match phases (new unified concept)
- `UPCOMING`: now < (kickoff - 15m)
- `PREGAME`: (kickoff - 15m) <= now < kickoff
- `LIVE`: kickoff <= now < matchEnd
- `POSTGAME`: matchEnd <= now < (matchEnd + 60m)
- `ENDED`: now >= (matchEnd + 60m)

### 1.3 Pass states (separate from purchase time)
- `OWNED_UPCOMING`: user owns pass but now < passStart
- `OWNED_ACTIVE`: user owns pass and passStart <= now < passEnd
- `OWNED_EXPIRED`: user owns pass and now >= passEnd
- Optional: `NOT_OWNED`

### 1.4 Pass window (derived from match window)
- `passStart = kickoff - 15m`
- `passEnd = matchEnd + 60m`

### 1.5 Where does `matchEnd` come from? (decision-complete)
- Preferred: `Program` row with `category=SPORTS` and `matchId=<match.id>`
  - Interpret `program.endTime` as “coverage end” (match end OR end of postgame show)
  - If `program.endTime` is “coverage end”, then:
    - `matchEnd = program.endTime - 60m` (if program includes postgame)
    - OR (simpler) treat `program.endTime` as `passEnd` directly
- Recommended (simplest + consistent): treat the linked SPORTS `Program.endTime` as **passEnd**.
  - Then: `passEnd = program.endTime`
  - And: `matchEnd = program.endTime - 60m` (only for UI phase labeling)
- Fallback when no linked program exists:
  - `DEFAULT_MATCH_DURATION_MIN = 150` (2h30m) (assumption)
  - `matchEnd = kickoff + 150m`
  - `passEnd = matchEnd + 60m`

### 1.6 Timezone (current behavior to preserve)
- DB stores `DateTime` (Prisma) and UI formats with `toLocaleTimeString("en-ZW", ...)`.
- Keep comparisons in UTC milliseconds (`Date.now()`, `new Date(...)`).
- Always return ISO strings from APIs when adding new fields.

---

## 2) Current reality (facts from the repo)
### 2.1 Data model (Prisma)
- `Match` has:
  - `kickoff: DateTime`
  - `isLive: Boolean` (manual toggle)
  - No `endsAt`, no status enum, no score fields
- `MatchPass` has:
  - `expiresAt: DateTime`
  - No `startsAt`
- `Program` has:
  - `startTime`, `endTime`, `category`, `matchId?`
  - Used for EPG + ZTV blackout logic

Source: `prisma/schema.prisma`

### 2.2 How matches are listed today
- Backend list route caches results (Redis 60s):
  - `/api/matches?status=live|upcoming|all`
  - upcoming = `kickoff >= now AND isLive=false`
  - live = `isLive=true`
- Frontend sports page defines “past” as:
  - `!isLive AND kickoff <= now` (not actual ended)

Sources:
- `src/app/api/matches/route.ts`
- `src/app/(app)/sports/page.tsx`

### 2.3 How match live status is controlled today
- Admin toggles `match.isLive` via:
  - PATCH `/api/admin/matches/[id]` with `{ isLive: true|false }`
- There is no automation based on kickoff time.

Sources:
- `src/app/api/admin/matches/[id]/route.ts`
- `src/app/(admin)/admin/matches/page.tsx`

### 2.4 How passes are created today
- Payment poll + webhook create/upsert MatchPass and set:
  - `expiresAt = max(kickoff + 4h, now + 4h)`
- Result: buying early still yields a pass that appears “active” immediately (in UI)
- Result: buying a match that ended long ago can still grant ~4h access from “now”

Sources:
- `src/app/api/payments/poll/[id]/route.ts`
- `src/app/api/payments/webhook/route.ts`

### 2.5 How passes are checked today
- Match detail page sets `hasPass` when:
  - pass exists AND `expiresAt > now`
- Profile page considers pass active when:
  - `expiresAt > now`
- Stream token endpoint allows stream when:
  - pass exists AND `expiresAt > now`
  - does NOT enforce match start/end
  - does NOT enforce `match.isLive`

Sources:
- `src/app/(app)/sports/[id]/page.tsx`
- `src/app/(app)/profile/page.tsx`
- `src/app/api/streams/token/route.ts`

### 2.6 Stream token TTL bug (security / access control)
- Token TTL uses:
  - `Math.max(passRemainingSeconds, 600)`
- Meaning: if pass expires in 1 minute, token TTL becomes 10 minutes.
- Outcome: token can outlive pass by up to 10 minutes.

Source:
- `src/app/api/streams/token/route.ts`

### 2.7 Watch page behavior today (missing pregame/ended UX)
- `watch/[id]`:
  - immediately fetches match then requests `/api/streams/token`
  - shows “Access Denied” only if token endpoint errors
  - does not show “Not started yet” UX
  - does not show “Match ended” UX
- Viewer count and activity tracking are started regardless of stream actually playing:
  - viewer count uses channel = match.streamKey (even if streamUrl is null)
  - activity tracking increments time regardless of playback

Sources:
- `src/app/(app)/watch/[id]/page.tsx`
- `src/hooks/use-viewer-count.ts`
- `src/hooks/use-track-activity.ts`

---

## 3) Hotspots and missing features (backend)
### 3.1 `/api/streams/token` access control is time-blind
- Symptom:
  - Pass validity is only `expiresAt > now`
  - Tokens are generated outside the intended match window
- Impact:
  - Users can attempt watch pre-match, post-match
  - Security mismatch between business logic and time-based access
- Fix:
  - Enforce `now` within `[passStart, passEnd]`
  - Fix token TTL to never exceed remaining window

File:
- `src/app/api/streams/token/route.ts`

### 3.2 Payment routes do not model pass start/end
- Symptom:
  - `expiresAt` is derived from kickoff + 4h or now + 4h
  - No start gating exists at all
- Impact:
  - Pass appears “active” immediately after purchase
  - Post-match purchases may grant fresh access
- Fix:
  - Compute pass window from match window (kickoff + linked program)
  - Set expiresAt = passEnd (for backward compatibility)

Files:
- `src/app/api/payments/poll/[id]/route.ts`
- `src/app/api/payments/webhook/route.ts`
- `src/app/api/payments/initiate/route.ts` (purchase gating decision)

### 3.3 `/api/matches` caching may hide phase transitions
- Symptom:
  - Redis TTL 60s for match lists
- Impact:
  - A match may show “upcoming” for up to 60s after kickoff
  - Or “live” mismatch if admin toggles quickly
- Fix options:
  - Lower TTL around kickoff windows (e.g., 10–15s)
  - Or keep TTL, but compute phases client-side and treat as approximate
  - Or include a `generatedAt` timestamp and compute phases on client

File:
- `src/app/api/matches/route.ts`

### 3.4 Lack of match end time prevents “ENDED” state
- Symptom:
  - `Match` has only kickoff + isLive boolean
- Impact:
  - Cannot reliably label a match as ended
  - Pass window cannot be “match end + 1h” without assumptions
- Fix:
  - Use `Program.endTime` (SPORTS + matchId) as passEnd
  - Or add explicit match end fields to DB schema

Files:
- `prisma/schema.prisma`
- `src/app/api/programs/route.ts`
- `src/app/api/admin/programs/...` (link matchId consistently)

### 3.5 Activity tracking endpoint accepts watch records any time
- Symptom:
  - `/api/activity` stores watchDuration without checking:
    - match phase
    - whether stream playback occurred
- Impact:
  - Analytics can be inflated by idle tabs / pregame watch page
- Fix:
  - Shift “watchDuration accumulation” to player events on client
  - Add `playState` or `startedAt` semantics if needed
  - Optionally, server can reject match watch records outside pass window

File:
- `src/app/api/activity/route.ts`

### 3.6 Viewer counts can be inflated by page open states
- Symptom:
  - Heartbeats register viewer count even if stream URL is missing
- Impact:
  - “Live viewers” can be non-zero when stream is off
- Fix:
  - Client: only set channel when stream is actually playing
  - Optional server: add `playing=true` signal (not required)

File:
- `src/app/api/streams/viewers/route.ts`

---

## 4) Hotspots and missing features (frontend)
### 4.1 Sports listing mislabels “past”
- Symptom:
  - `past = !isLive && kickoff <= now`
- Impact:
  - Delayed matches become “past”
  - Matches in progress but not toggled live become “past”
- Fix:
  - Use derived match phase from matchEnd (program or fallback)
  - Add explicit label: UPCOMING / STARTING SOON / LIVE / ENDED

File:
- `src/app/(app)/sports/page.tsx`

### 4.2 MatchCard / SportsHero rely on `isLive` only
- Symptom:
  - They only show LIVE badge when admin toggles `isLive`
  - They do not show “ENDED” label at all
- Fix:
  - Add phase badges:
    - “STARTING SOON” during pregame buffer
    - “ENDED” after postgame end
    - “IN PROGRESS” if kickoff passed but match not ended even if isLive false

Files:
- `src/components/match-card.tsx`
- `src/components/sports-hero.tsx`

### 4.3 Match detail page shows “Watch Now” even pre-kickoff when pass exists
- Symptom:
  - If `hasPass`, it says “Your match pass is active. Start watching now.”
- Impact:
  - Confusing; leads to watch page errors and inflated metrics
- Fix:
  - Replace with phase-aware pass UX:
    - Owned upcoming: “Pass purchased. Available at HH:MM.”
    - Owned active: “You have access. Watch now.”
    - Owned expired: “Pass expired.”

File:
- `src/app/(app)/sports/[id]/page.tsx`

### 4.4 Watch page lacks pregame + ended states
- Symptom:
  - Always requests token immediately
  - Shows only “Access denied” or video
- Fix:
  - Compute pass window on client (from API payload)
  - If now < passStart:
    - show countdown
    - don’t request token yet (or request but don’t heartbeat/track)
  - If passStart <= now < passEnd:
    - request token and render player
  - If now >= passEnd:
    - show ended/expired UX and link back

File:
- `src/app/(app)/watch/[id]/page.tsx`

### 4.5 Viewer count + activity tracking start too early
- Symptom:
  - viewer count is tied to match existence, not stream playing
  - track activity ticks regardless of stream playing
- Fix:
  - Gate both on `isPlaying` from video.js events:
    - start counting only on `play`
    - stop on `pause` / `ended` / error
  - Or at least gate on `streamUrl != null`

Files:
- `src/hooks/use-viewer-count.ts`
- `src/hooks/use-track-activity.ts`
- `src/app/(app)/watch/[id]/page.tsx`

---

## 5) Proposed fixes (decision-complete) — Pass window + match lifecycle
### 5.1 Core principle
- A pass can be purchased at any time before it ends.
- A pass only grants watch access inside its “access window”:
  - start = kickoff - 15m
  - end = matchEnd + 60m (or program-derived passEnd)

### 5.2 Recommended data approach (no schema migration needed)
- Keep `MatchPass.expiresAt` as the **passEnd** (end of access window).
- Do NOT store passStart in DB initially.
- Always derive `passStart = kickoff - 15m` (kickoff exists).
- Derive `passEnd` from:
  - linked SPORTS Program endTime (preferred)
  - else fallback to `kickoff + 150m + 60m`

Pros:
- Minimal DB changes
- Immediately enforces start/end logic consistently

Cons:
- Still depends on program linkage (if you want accurate end)
- If kickoff changes, passStart shifts automatically (good)
- If program end changes, passEnd should update (needs sync)

### 5.3 Best long-term data approach (schema improvement)
- Add to `Match`:
  - `scheduledEnd: DateTime?` (or `endsAt`)
  - optional `status: enum` (UPCOMING/LIVE/ENDED)
- Add to `MatchPass`:
  - `startsAt: DateTime` (copied from match)
  - `endsAt: DateTime` (copied from match)
  - keep `expiresAt` for backward compatibility (set = endsAt)

Pros:
- Fully tracks start and end explicitly
- Less “guessing” across services

Cons:
- Requires Prisma migration + backfill
- Needs update logic when match times change

### 5.4 Payment creation + completion behavior (updated)
- When a payment is confirmed (poll/webhook):
  - Determine `passStart` and `passEnd`
  - Set `MatchPass.expiresAt = passEnd`
  - (If schema upgraded) set `startsAt` and `endsAt`
- Remove “now + 4h” logic
- If payment completes after match ended:
  - recommended: do not grant pass (mark payment failed/refund path)
  - at minimum: set passEnd as “ended” so it’s immediately expired

### 5.5 Purchase gating (initiate endpoint)
- On `/api/payments/initiate`:
  - If now >= passEnd:
    - return 409 with message “This match has ended”
  - Else allow purchase
- If user has existing pass record:
  - If now < passEnd:
    - return 409 “You already have access”
  - If now >= passEnd:
    - allow repurchase (new window not possible since match ended)
    - recommended: still block if match ended

### 5.6 Stream token gating (match stream)
- On `/api/streams/token`:
  - Require session
  - Require pass exists
  - Compute passStart/passEnd
  - If now < passStart:
    - return 409 “Match stream starts at …”
  - If now >= passEnd:
    - return 403 “Pass expired”
  - Else:
    - issue token with TTL = min(remainingSeconds, 4h max, etc)
  - Fix TTL bug:
    - use `Math.min(remainingSeconds, 600)`? (No)
    - correct approach: `ttl = Math.max(remainingSeconds, MIN_TTL)` but MIN_TTL must not exceed remainingSeconds
    - recommended: `ttl = Math.max(Math.min(remainingSeconds, 4*60*60), 30)` and never exceed remainingSeconds
    - simplest safe: `ttl = Math.max(remainingSeconds, 1)` (no minimum), plus client auto-refresh token if needed

### 5.7 Match lifecycle automation (recommended)
- Today: manual `isLive` toggle is the only way
- Missing: auto mark match live at kickoff and ended after window
- Recommended minimal automation:
  - Create a server-side job (cron) that:
    - sets `match.isLive=true` at kickoff (or pregame start)
    - sets `match.isLive=false` at matchEnd/passEnd
  - Implementation depends on hosting (Vercel cron, server cron, etc)
- If automation is not possible now:
  - UI should rely on derived phase from time instead of `isLive` alone
  - Admin dashboard should show “should be live now” warnings

---

## 6) Proposed API contract changes (recommended)
### 6.1 Extend match detail response (optional)
- Add computed fields:
  - `passStart: string` (ISO)
  - `passEnd: string` (ISO)
  - `phase: "UPCOMING"|"PREGAME"|"LIVE"|"POSTGAME"|"ENDED"`
  - `phaseEndsAt: string` (ISO) (for countdown UI)
- Where to add:
  - `GET /api/matches/[id]`

### 6.2 Extend user passes response (recommended)
- `GET /api/user/passes` currently returns pass + match kickoff/isLive
- Add:
  - `passStart` (derived)
  - `passEnd` (derived from expiresAt / program)
  - `passState` for the current user at request time

### 6.3 Add a lightweight match timing endpoint (optional)
- `GET /api/matches/[id]/window`
- Returns only:
  - kickoff
  - passStart
  - passEnd
  - phase
  - phaseEndsAt
- Benefits:
  - watch page can poll this every 30s near kickoff
  - reduces mismatch caused by caching in `/api/matches`

---

## 7) UX behavior spec (before / live / after) — what’s missing today
### 7.1 Sports list page (`/sports`)
- Must display:
  - UPCOMING matches
  - STARTING SOON (pregame 15m)
  - LIVE matches (derived from time OR isLive)
  - ENDED matches
- Must never classify “kickoff passed but match not ended” as “past/ended”.
- Must show:
  - countdown to passStart (not just kickoff) when inside UPCOMING
  - countdown to kickoff when inside PREGAME
  - countdown to passEnd when inside POSTGAME

### 7.2 Match detail page (`/sports/[id]`)
- If user not logged in:
  - show purchase CTA -> login
- If user logged in and does not own pass:
  - show purchase UI only if now < passEnd
  - show “Match ended” message if now >= passEnd
- If user owns pass:
  - If now < passStart:
    - show “Pass purchased. Available at HH:MM (15 min before kickoff).”
    - show countdown
    - show disabled watch button
  - If passStart <= now < passEnd:
    - show watch button
  - If now >= passEnd:
    - show expired badge
    - show link to browse matches

### 7.3 Watch page (`/watch/[id]`)
- If not logged in:
  - redirect to /login (already happens)
- If logged in and pass not owned:
  - show “Access denied” + purchase CTA (already happens)
- If pass owned but now < passStart:
  - show pregame waiting screen
  - do not heartbeat viewer count
  - do not track activity
  - optionally auto-refresh at passStart
- If pass owned and now within window:
  - request token
  - set viewer count channel only when video is playing
  - start activity tracking only when video is playing
- If pass expired:
  - show ended/expired screen
  - stop viewer count + tracking

---

## 8) Specific code hotspots and fix notes (by file)
### Backend
- `src/app/api/streams/token/route.ts`
  - Enforce passStart/passEnd
  - Fix TTL bug (do not exceed remaining time)
  - Optional: include `passEnd` and `now` in response for UI
- `src/app/api/payments/poll/[id]/route.ts`
  - Replace `kickoff+4h` logic with pass window logic
  - Ensure upsert sets expiresAt=passEnd
- `src/app/api/payments/webhook/route.ts`
  - Same as poll route
  - Decide behavior if match ended when payment confirms
- `src/app/api/payments/initiate/route.ts`
  - Block purchases after passEnd
  - Use passEnd for “already have access” checks
- `src/app/api/matches/route.ts`
  - Consider caching TTL adjustments
  - Optionally include computed phase in list response
- `src/app/api/matches/[id]/route.ts`
  - Optionally add computed window fields for UI
- `src/app/api/user/passes/route.ts`
  - Add computed window + pass state fields
- `src/app/api/activity/route.ts`
  - Optional server-side guard (don’t accept match watch outside window)
  - Or keep as-is and fix client tracking to be playback-based
- `src/app/api/streams/viewers/route.ts`
  - Keep as-is; fix client gating

### Frontend
- `src/app/(app)/sports/page.tsx`
  - Replace “pastMatches” logic with derived phase logic
  - Add UI filters by phase (optional)
- `src/components/match-card.tsx`
  - Add phase badge
  - Show “ENDED” for ended matches
- `src/components/sports-hero.tsx`
  - Add “Starting soon” state
- `src/app/(app)/sports/[id]/page.tsx`
  - Replace `hasPass` UI with passState-aware UI
  - Display “Available at” time
- `src/app/(app)/watch/[id]/page.tsx`
  - Add pregame/ended waiting screens
  - Gate viewer count + activity on playback
- `src/hooks/use-viewer-count.ts`
  - Option: accept `enabled` boolean
  - Option: accept `isPlaying` boolean
- `src/hooks/use-track-activity.ts`
  - Option: accept `enabled` boolean
  - Option: accept “tick only while playing”

---

## 9) Automated tests (recommended updates)
> Note: add tests only where the repo already supports them; otherwise rely on manual QA.

### Backend unit/integration tests to add/adjust
- Token route:
  - denies before passStart
  - allows within window
  - denies after passEnd
  - token TTL never exceeds remainingSeconds
- Payment confirmation:
  - sets expiresAt == passEnd (derived)
  - blocks granting after match ended (if chosen)
- Purchase initiation:
  - blocks purchase after passEnd
  - blocks purchase if pass exists and now < passEnd

### Frontend tests (optional)
- If there is no established frontend test harness:
  - skip automated UI tests and rely on manual QA list below

---

## 10) Manual QA scenarios (large checklist)
> Use these as a structured runbook across web + mobile layouts.

### Legend
- `T0 = kickoff`
- `PS = passStart = T0 - 15m`
- `PE = passEnd = matchEnd + 60m`
- `ME = matchEnd`

### Pre-match purchase flow (UPCOMING)
- QA-001: Logged out, UPCOMING match -> see kickoff + “Get Match Pass” -> login redirect.
- QA-002: Logged in, UPCOMING match, no pass -> payment UI visible.
- QA-003: Logged in, UPCOMING match, owns pass -> show “Pass purchased; available at PS”.
- QA-004: Logged in, UPCOMING match, owns pass -> “Watch Now” button disabled.
- QA-005: Logged in, UPCOMING match, owns pass -> countdown shows time until PS.
- QA-006: Logged in, UPCOMING match -> complete payment -> pass saved with expiresAt=PE.
- QA-007: Logged in, UPCOMING match -> refresh -> pass still shows owned upcoming state.
- QA-008: Logged in, UPCOMING match -> profile passes shows passStart and passEnd.
- QA-009: Logged in, UPCOMING match -> cannot repurchase (409 already have access).
- QA-010: Logged in, UPCOMING match -> matches list shows “UPCOMING” label.
- QA-011: Logged in, UPCOMING match -> verify caches don’t break UI state.

### Pregame window (PREGAME: PS to T0)
- QA-012: At PS-1s -> match detail still shows “available at PS”.
- QA-013: At PS+1s -> match detail shows watch button enabled.
- QA-014: At PS+1s -> watch page allows token request.
- QA-015: At PS+1s -> token endpoint returns 200 and streamUrl.
- QA-016: At PS+1s -> watch page shows waiting/offline message if stream not ready.
- QA-017: At PS+1s -> viewer count remains 0 until playback starts.
- QA-018: At PS+1s -> analytics does not record watchDuration if not playing.
- QA-019: At PS+1s -> match list shows “STARTING SOON” label.
- QA-020: At PS+1s -> countdown shows time until kickoff (T0).
- QA-021: At PS+10m -> watch page retries stream gracefully.
- QA-022: At PS+10m -> leave page -> viewer leave request cleans redis set.
- QA-023: At PS+10m -> return -> viewer count resumes only when playing.

### Live window (LIVE: T0 to ME)
- QA-024: At T0+1m -> match list shows LIVE (derived).
- QA-025: At T0+1m -> match.isLive false but derived LIVE still shows.
- QA-026: At T0+1m -> token endpoint allows.
- QA-027: At T0+1m -> watch page starts playback.
- QA-028: At playback start -> viewer count increments.
- QA-029: At playback pause -> activity tracking stops incrementing (if implemented).
- QA-030: At playback resume -> tracking resumes.
- QA-031: At playback error -> viewer count stops.
- QA-032: At playback error -> activity tracking stops.
- QA-033: At T0+60m -> refresh -> still live.
- QA-034: At T0+60m -> profile pass still active.
- QA-035: At T0+60m -> watch page token refresh (if needed) stays within PE.
- QA-036: At T0+120m -> if ME unknown, fallback is applied consistently.
- QA-037: At T0+140m -> ensure the match does not flip to ENDED early.

### Postgame window (POSTGAME: ME to PE)
- QA-038: At ME+1m -> match list shows POSTGAME.
- QA-039: At ME+1m -> match detail shows “Postgame access ends at PE”.
- QA-040: At ME+1m -> token endpoint allows.
- QA-041: At ME+1m -> watch page still plays if stream continues.
- QA-042: At ME+30m -> viewer count correct.
- QA-043: At ME+30m -> activity tracked only while playing.
- QA-044: At ME+59m -> match detail countdown to PE shows 1m.
- QA-045: At ME+59m -> watch page warns about expiry (optional UX).
- QA-046: At PE-10s -> token TTL does not exceed remaining.
- QA-047: At PE-1s -> playing continues until token expires (expected).
- QA-048: At PE+1s -> token endpoint denies (expired).
- QA-049: At PE+1s -> watch page shows expired screen.
- QA-050: At PE+1s -> viewer count heartbeat stops.

### Ended state (ENDED: now >= PE)
- QA-051: Match detail shows “Match ended” (no purchase).
- QA-052: `/api/payments/initiate` returns 409 ended for this match.
- QA-053: Profile pass shows expired.
- QA-054: Match list shows ENDED label.
- QA-055: Sports page past filter shows ended matches only (not “delayed”).

### Payments / polling / webhook robustness
- QA-056: Poll route completes payment -> pass window is correct.
- QA-057: Webhook completes payment -> pass window is correct.
- QA-058: Webhook repeats -> idempotent (no duplicate pass).
- QA-059: Poll after webhook -> returns completed quickly.
- QA-060: Payment confirmed after PE -> no access granted (if chosen).
- QA-061: Payment confirmed after PE -> payment marked FAILED/REFUND_REQUIRED (if chosen).
- QA-062: Existing pass check uses passEnd (not only expiresAt).
- QA-063: Buying during PREGAME works.
- QA-064: Buying during LIVE works.
- QA-065: Buying during POSTGAME works (if allowed).
- QA-066: Buying during ENDED is blocked.

### Caching edge cases
- QA-067: `/api/matches` cached response doesn’t mislabel phases catastrophically.
- QA-068: After admin toggles live, cache invalidation works.
- QA-069: At kickoff boundary, UI shifts within acceptable delay.
- QA-070: Derived phase computed client-side stays consistent.

### Admin tooling / ops
- QA-071: Admin matches page toggles live without breaking phases.
- QA-072: Admin can update kickoff; passStart derived changes.
- QA-073: Admin programs page links SPORTS program to matchId.
- QA-074: Program endTime adjusts passEnd (if program-based).
- QA-075: Verify no overlap conflicts in programs schedule.

### Analytics correctness
- QA-076: Open watch page but no playback -> no activity recorded (after fix).
- QA-077: Playback for 2 minutes -> activity recorded ~120s (rounded).
- QA-078: Pause for 2 minutes -> no additional watchDuration counted.
- QA-079: Switch tabs while playing -> activity flush happens.
- QA-080: Switch tabs while not playing -> no false flush.
- QA-081: Analytics page shows SPORTS watch time only when real playback occurred.

### Viewer count correctness
- QA-082: Open watch page pregame -> viewer count stays 0.
- QA-083: Start playback -> viewer count increments.
- QA-084: Close tab -> viewer count decrements within 30s.
- QA-085: Two users watching -> viewer count 2.
- QA-086: One user pauses -> viewer count stays if still connected (acceptable).
- QA-087: One user leaves -> viewer count updates.

### UI messaging and mobile layout
- QA-088: Mobile match detail shows pass status without overflow.
- QA-089: Mobile watch page waiting screen fits 16:9 container.
- QA-090: “Available at” times are readable on small screens.
- QA-091: “Ends at” times are readable on small screens.
- QA-092: Buttons are not clipped under sticky header.

### Error handling
- QA-093: Token endpoint returns 409 before PS -> watch page shows “Starts at …”.
- QA-094: Token endpoint returns 403 expired -> watch page shows expired.
- QA-095: Token endpoint returns 403 no pass -> watch page shows purchase CTA.
- QA-096: Stream base URL missing -> watch page shows system error.
- QA-097: Payment initiation fails -> match detail shows error state.
- QA-098: Poll times out -> match detail falls back to pass check.

### Additional scenarios (to ensure thoroughness)
- QA-099: Kickoff is rescheduled earlier -> passStart moves earlier.
- QA-100: Kickoff is rescheduled later -> passStart moves later.
- QA-101: Program endTime changed -> passEnd changes (if program-based).
- QA-102: User buys pass, then kickoff changes -> still consistent.
- QA-103: User buys pass, then program linkage removed -> fallback used.
- QA-104: Match has no program -> fallback duration applied.
- QA-105: Match has multiple SPORTS programs -> pick the one overlapping kickoff.
- QA-106: Match has SPORTS program not overlapping kickoff -> ignore or warn.
- QA-107: Match.isLive toggled true early -> UI still respects PS start.
- QA-108: Match.isLive toggled false mid-match -> derived LIVE still shows.
- QA-109: Watch page reload mid-play -> resumes within window.
- QA-110: Watch page reload after PE -> blocks immediately.

### QA expansion block (extra coverage, keep concise)
- QA-111: Sports page filter “upcoming” excludes ENDED matches.
- QA-112: Sports page filter “live” includes derived LIVE, not only isLive.
- QA-113: Sports page filter “past” becomes “ended”.
- QA-114: Sports hero banner uses derived LIVE.
- QA-115: Match card shows “ENDED” for ended.
- QA-116: Match card shows “STARTING SOON” during pregame.
- QA-117: Profile pass card shows “Starts at” and “Ends at”.
- QA-118: Profile pass card watch button disabled before PS.
- QA-119: Profile pass card watch button enabled during active window.
- QA-120: Profile pass card watch button hidden after PE.
- QA-121: Analytics peak time doesn’t inflate from idle watch pages.
- QA-122: Viewer counts do not inflate from idle watch pages.
- QA-123: Live TV page remains unaffected.

### Repeatable “time boundary” tests
- QA-124: exactly at PS -> active becomes true.
- QA-125: exactly at kickoff -> phase changes to LIVE.
- QA-126: exactly at ME -> phase changes to POSTGAME.
- QA-127: exactly at PE -> phase changes to ENDED.
- QA-128: 1ms before boundary -> still previous phase.
- QA-129: 1ms after boundary -> new phase.

### Multi-device / multi-tab
- QA-130: Two tabs watching same match -> viewer count counts one user once (Redis set uses userId).
- QA-131: Two browsers same user -> viewer count counts 1 (still userId).
- QA-132: Two different users -> viewer count increments to 2.
- QA-133: One user switches away -> leave request executes.
- QA-134: Network drop -> stale entry pruned in 30s.

### Payment provider specifics
- QA-135: EcoCash mobile flow -> poll completes -> pass window correct.
- QA-136: Paynow web redirect -> success page -> webhook sets pass window.
- QA-137: Webhook delayed -> poll fallback -> grants pass.
- QA-138: Provider returns “paid” status string -> interpreted correctly.

### Security-focused checks
- QA-139: Token TTL never exceeds remainingSeconds.
- QA-140: Token cannot be generated after PE.
- QA-141: Token cannot be generated before PS.
- QA-142: Token cannot be generated without pass.
- QA-143: Token cannot be generated while logged out.
- QA-144: Viewer count endpoint rejects unauthenticated requests.
- QA-145: Viewer count endpoint rejects invalid channel name.

### Content consistency checks
- QA-146: kickoff displayed matches the backend kickoff.
- QA-147: “available at” displayed matches computed PS.
- QA-148: “ends at” displayed matches computed PE.
- QA-149: All UI uses consistent labels for phases.

### (Optional) If introducing a new “window” endpoint
- QA-150: /api/matches/[id]/window returns valid ISO fields.
- QA-151: watch page uses /window to schedule auto-refresh.
- QA-152: watch page uses /window for countdown text.

### Large QA block to ensure comprehensive coverage
- QA-153: Upcoming match -> user purchases pass -> closes browser -> reopens -> still owned upcoming.
- QA-154: Upcoming match -> user purchases pass -> match ends later -> pass expires at PE.
- QA-155: Live match -> user purchases pass -> watch starts instantly.
- QA-156: Live match -> user purchases pass -> token allowed immediately.
- QA-157: Postgame -> user purchases pass -> allowed until PE (if allowed).
- QA-158: Ended -> purchase blocked.
- QA-159: Ended -> token blocked.
- QA-160: Ended -> pass card expired.
- QA-161: Delayed match -> kickoff passed but not live -> derived LIVE prevents “past” mislabel.
- QA-162: Delayed match -> derived LIVE ends at fallback ME/PE.
- QA-163: Extended match -> program endTime ensures correct PE.
- QA-164: Extended match -> fallback may end too early (known limitation).
- QA-165: Admin sets program endTime later -> window updates.

### (Optional) Observability checks
- QA-166: Server logs record denies before PS.
- QA-167: Server logs record denies after PE.
- QA-168: Payment logs show computed passStart/passEnd.
- QA-169: Admin dashboards show “phase” per match.

### Continue QA list (kept short per line)
- QA-170: Match detail pregame UI text is correct.
- QA-171: Match detail live UI text is correct.
- QA-172: Match detail ended UI text is correct.
- QA-173: Watch page pregame UI is correct.
- QA-174: Watch page ended UI is correct.
- QA-175: Profile pass list sorts correctly.
- QA-176: Pass list shows correct time formatting.
- QA-177: Pass list shows correct status badge.
- QA-178: Pass list CTA correct by state.
- QA-179: Sports list CTA correct by phase.
- QA-180: Sports list filter counts correct by phase.

### (Filler-free) Extra boundary cases
- QA-181: Kickoff is null (shouldn’t happen) -> safe error.
- QA-182: Program endTime < startTime -> admin prevented.
- QA-183: Program overlap check works.
- QA-184: Program missing matchId -> fallback used.
- QA-185: Program has matchId but wrong category -> ignored.
- QA-186: Program category SPORTS but no match -> blackout uses program only.

### Device/local time display
- QA-187: iPhone Safari -> time formatting OK.
- QA-188: Android Chrome -> time formatting OK.
- QA-189: Desktop Chrome -> time formatting OK.
- QA-190: Desktop Firefox -> time formatting OK.
- QA-191: User in different timezone -> displayed times reflect local (expected).

### Wrap-up QA
- QA-192: Lint passes after changes.
- QA-193: Typecheck passes after changes.
- QA-194: Build passes after changes.
- QA-195: No console errors on sports page.
- QA-196: No console errors on match detail.
- QA-197: No console errors on watch page.
- QA-198: No console errors on profile pass tab.
- QA-199: No regressions on live-tv page.
- QA-200: No regressions on analytics page.

---

## 11) Implementation checklist (granular, end-to-end)
> This is the “do it step-by-step” list for applying the changes.

### 11.1 Shared utilities (recommended)
- [ ] Add a pure helper: `computePassWindow(kickoff, programEnd?)`.
- [ ] Return `{ passStart, passEnd, matchEnd, phase, phaseEndsAt }`.
- [ ] Unit test helper with boundary timestamps.

### 11.2 Backend: payment completion
- [ ] In poll route, load match + optional linked program endTime.
- [ ] Compute passStart/passEnd.
- [ ] Set `expiresAt = passEnd`.
- [ ] Remove `fromNow` 4h logic.
- [ ] Ensure transaction remains atomic.
- [ ] Repeat same in webhook route.
- [ ] Decide and implement “payment confirmed after PE” behavior.
- [ ] Update initiate route to block purchase after PE.
- [ ] Update initiate route “already have access” check to use passEnd.

### 11.3 Backend: token route
- [ ] Load match.
- [ ] Load pass.
- [ ] Compute passStart/passEnd.
- [ ] If now < passStart -> return 409 with passStart.
- [ ] If now >= passEnd -> return 403 expired.
- [ ] Else -> issue token.
- [ ] Fix TTL to never exceed remainingSeconds.
- [ ] Consider removing “minimum 10 minutes” behavior entirely.
- [ ] Add response fields for UI (optional): `{ passEnd, expiresInSeconds }`.

### 11.4 Backend: passes listing
- [ ] Extend `/api/user/passes` to compute window and state.
- [ ] Include `passStart`, `passEnd`, `passState`, `phase`.
- [ ] Keep backward compatible fields.

### 11.5 Backend: match endpoints
- [ ] Optionally add computed fields to `/api/matches/[id]`.
- [ ] Optionally add computed phase to `/api/matches` list.
- [ ] Consider caching TTL changes (or compute phase client-side).

### 11.6 Frontend: sports list page
- [ ] Stop using “past = kickoff <= now”.
- [ ] Use computed matchEnd/passEnd to classify.
- [ ] Add phase badges on cards.
- [ ] Update filter labels: Live / Upcoming / Ended.

### 11.7 Frontend: match detail page
- [ ] Replace `hasPass` boolean with pass window state.
- [ ] Show “available at” for owned upcoming.
- [ ] Disable watch before PS.
- [ ] Hide purchase UI after PE (match ended).
- [ ] Ensure payment success state uses same window.

### 11.8 Frontend: watch page
- [ ] Fetch match + pass window (via passes API or match detail).
- [ ] If now < PS -> show waiting screen and schedule refresh at PS.
- [ ] If now within window -> request token and attempt playback.
- [ ] If now >= PE -> show expired/ended.
- [ ] Gate viewer count:
  - [ ] channel = null until playback actually starts
  - [ ] on play -> set channel
  - [ ] on pause/ended/error -> unset channel
- [ ] Gate activity tracking similarly:
  - [ ] enable only while playing
  - [ ] flush on pause/end/unmount

### 11.9 Hooks updates (if chosen)
- [ ] Update `useTrackActivity` to accept `enabled`.
- [ ] Update `useTrackActivity` to accumulate only while enabled.
- [ ] Update `useViewerCount` to accept `enabled` or set channel null.

### 11.10 Admin UX (recommended)
- [ ] On admin matches page, show derived phase (should be live soon, etc).
- [ ] Add a warning: “kickoff passed but isLive=false”.
- [ ] Encourage linking a SPORTS Program to each match for passEnd accuracy.

### 11.11 Docs
- [ ] Save this file as `updates3.md`.
- [ ] Add a short summary at top of `updates2.md` or `HOTSPOTS...` (optional).

---

## 12) Additional match lifecycle gaps (before / after) — what to implement next
### 12.1 Before match
- Missing: “starting soon” status that doesn’t depend on admin toggle.
- Missing: stream warm-up / waiting room UX.
- Missing: optional notifications/reminders.

### 12.2 During match
- Missing: auto-live switching (cron / schedule).
- Missing: stream health checks (optional).
- Missing: scoreboard/events (not in schema).

### 12.3 After match
- Missing: match “final” state and results.
- Missing: replay availability (if desired).
- Missing: automatic pass expiration aligned to real match end.

---

## 13) Notes / quick commands / line count
### 13.1 PowerShell path notes
- For files with `(...)` or `[id]` in path:
  - Use `Get-Content -LiteralPath "src/app/(app)/watch/[id]/page.tsx"`

### 13.2 Line-count check (after you save)
- PowerShell:
  - `((Get-Content .\\updates3.md).Count)`

---

## 14) Appendix: “match + pass” field map (for implementation sanity)
- Match:
  - `kickoff` (existing)
  - `isLive` (existing, manual)
  - `matchEnd` (new computed)
  - `phase` (new computed)
- Program:
  - `endTime` used as passEnd (recommended)
- Pass:
  - `passStart` computed as kickoff - 15m
  - `passEnd` computed as program.endTime (or fallback)
  - `expiresAt` stored as passEnd (compat)

---

## 15) Appendix: Explicit acceptance criteria
- AC-01: Pass can be owned before it’s active.
- AC-02: “Watch Now” is not enabled before PS.
- AC-03: Token route denies before PS with a clear message.
- AC-04: Token route denies after PE with a clear message.
- AC-05: Token TTL never exceeds remaining access time.
- AC-06: Sports list does not mislabel delayed matches as “past”.
- AC-07: Watch page does not inflate viewers/analytics when stream isn’t playing.
- AC-08: Purchase is blocked after PE.
- AC-09: Profile pass list shows correct states and times.
- AC-10: Lint + typecheck + build pass after applying changes.

---
# End of updates3.md
