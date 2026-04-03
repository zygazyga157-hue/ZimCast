# Updates4 — Today-Only Match Filtering & Auto-Program Linking

## Summary

Two features implemented:
1. **Date-scoped match filtering** — the matches API and sports UI now show only today's matches plus any match still in an active window (PREGAME / LIVE / POSTGAME from the previous day).
2. **Auto-program creation** — creating a match in the admin dashboard automatically creates a linked SPORTS program in the EPG, eliminating the manual two-step process. Updating a match's kickoff syncs the linked program's times.

---

## Changes

### 1. Date-Filtered Matches API (`src/app/api/matches/route.ts`)

- Added `date` query parameter (YYYY-MM-DD, defaults to today).
- Computes `dayStart` / `dayEnd` from the target date.
- Includes a 24-hour lookback window to capture matches from the previous day that may still have an active pass window (PREGAME / LIVE / POSTGAME).
- After phase enrichment, filters out lookback matches that have reached ENDED phase — only genuinely active older matches appear.
- Cache key updated to `matches:{dateKey}:{status}` so date-scoped results are cached independently.

### 2. Sports Page Date Param (`src/app/(app)/sports/page.tsx`)

- `loadData` now passes `?date=YYYY-MM-DD` (today) to `/api/matches`, ensuring only today's matches are fetched for the UI.

### 3. Auto-Program Helper (`src/lib/match-program.ts`) — NEW FILE

- `createMatchProgram(matchId, homeTeam, awayTeam, kickoff, channel)`:
  - Creates a SPORTS program from `kickoff - 15min` to `kickoff + 195min` (3.5h total coverage).
  - Checks for channel overlap before creating; returns a warning string if overlap exists.
- `updateMatchProgram(matchId, homeTeam, awayTeam, newKickoff, channel)`:
  - Finds the existing linked SPORTS program and updates its times when kickoff changes.
  - If no linked program exists, creates one via `createMatchProgram`.
  - Overlap check excludes the current program to avoid self-conflict.

### 4. Admin Match POST (`src/app/api/admin/matches/route.ts`)

- After `prisma.match.create()`, calls `createMatchProgram()` to auto-create the linked SPORTS program.
- Response now includes `programId` and optional `programWarning`.

### 5. Admin Match PATCH (`src/app/api/admin/matches/[id]/route.ts`)

- When `homeTeam`, `awayTeam`, or `kickoff` changes, calls `updateMatchProgram()` to sync the linked program.
- Response includes optional `programWarning`.

### 6. Admin UI Feedback (`src/app/(admin)/admin/matches/page.tsx`)

- On match create: shows `"Match created — program auto-linked"` success toast.
- On match update: shows `"Match updated"` success toast.
- If a program warning is returned (channel overlap), shows `toast.warning()` with the overlap details.

---

## Coverage Constants

| Constant              | Value     | Description                                    |
| --------------------- | --------- | ---------------------------------------------- |
| `PREGAME_BUFFER_MS`   | 15 min    | Time before kickoff program starts             |
| `COVERAGE_DURATION_MS`| 210 min   | Total program duration (pregame + match + post) |
| Lookback window       | 24 hours  | How far back to search for active-window matches |

## End-to-End Flow

1. Admin creates a match → POST `/api/admin/matches` → match row created → `createMatchProgram()` auto-creates SPORTS program linked via `matchId`.
2. User visits `/sports` → GET `/api/matches?date=2025-07-18` → returns today's matches + any active-window matches from yesterday.
3. `computePassWindow(kickoff, programEndTime)` uses the linked program's `endTime` for accurate phase computation.
4. Pass purchase window, playback gating, and ENDED phase all derive from the auto-linked program — no manual linking needed.
5. Admin changes kickoff → PATCH `/api/admin/matches/:id` → `updateMatchProgram()` syncs program times.

## Build Status

- 49/49 pages generated successfully.
- No TypeScript errors.
