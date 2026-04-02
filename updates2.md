# Updates 2 (2026-04-02)

## Smart Header v2 (Live EPG + Insight)

- Added a second, sticky context bar under the navbar that shows:
  - **Now playing** (ZTV — current program / match)
  - **Next** program (truncated on small screens)
  - **Blackout** state during SPORTS programs + **Resumes** time
  - A desktop-only personalization line: “You usually watch … at this time.”

## New APIs (cached, header-friendly)

- `GET /api/epg/summary`
  - Lightweight now/next payload for channel `ZBCTV`
  - Redis cache: `epg:summary:ZBCTV` (TTL 30s)
- `GET /api/user/insight` (auth required)
  - Computes time-of-day viewing habit from last 30 days (WATCH + watchDuration)
  - Redis cache: `user:<id>:insight:<hour>` (TTL 10 min)

## UI behavior

- Smart title mapping (desktop only): `/` → “Recommended for You”, `/live-tv` → “Live Now”, `/analytics` → “Your Insights”.
- Insight line shows only when signed in and when the pattern is meaningful (≥15min total at that hour, top category ≥40%).

## Files

- Header UI: `src/components/navbar.tsx`
- EPG summary API: `src/app/api/epg/summary/route.ts`
- Insight API: `src/app/api/user/insight/route.ts`
- Spec doc updated: `zimcast_header_system.md`

