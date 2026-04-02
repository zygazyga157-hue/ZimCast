# Updates 1 (2026-04-02)

## ✅ Build fixes + status

- Updated the production build to use Webpack on Windows: `next build --webpack` (prevents Turbopack “native bindings not available” build failure).
  - File: `package.json`
- Production build now completes successfully via `npm run build`.
- Note: Prisma may download engine binaries the first time you run `npx prisma generate` (requires network access).

## Streaming (backend ↔ frontend alignment)

- Frontend now uses the `streamUrl` returned by the server token endpoints (instead of reconstructing URLs client-side).
  - Files: `src/app/(app)/live-tv/page.tsx`, `src/app/(app)/watch/[id]/page.tsx`
- Stream token endpoints now build URLs from `NEXT_PUBLIC_STREAM_BASE_URL` (preferred) or `STREAM_BASE_URL` (fallback).
  - Files: `src/app/api/streams/token/route.ts`, `src/app/api/streams/ztv/token/route.ts`
- Docker Compose now sets `NEXT_PUBLIC_STREAM_BASE_URL` by default for browser-reachable HLS.
  - File: `docker-compose.yml`
- MediaMTX auth hook now targets the Compose service name (`app`) instead of `127.0.0.1`.
  - File: `mediamtx/mediamtx.yml`

## Payments

- Standardized Paynow return URL base to `NEXT_PUBLIC_APP_URL` (fallback `NEXTAUTH_URL`) to match email links.
  - File: `src/app/api/payments/initiate/route.ts`

## UI / Mobile polish

- Improved mobile-safe bottom padding so content doesn’t sit behind the bottom nav.
  - File: `src/app/(app)/layout.tsx`
- Added/updated analytics UI and navigation entry.
  - Files: `src/app/(app)/analytics/page.tsx`, `src/components/navbar.tsx`, `src/components/bottom-nav.tsx`
- Fixed match links under Live TV (Up Next / Recommendations) to use the existing sports routes.
  - Files: `src/components/up-next.tsx`, `src/components/recommendations.tsx`

## Docs

- Created/updated `HOTSPOTS_AND_BUGS.md` with confirmed fixes + remaining high-risk areas.

## Commands run

- `npm run lint`
- `npx tsc -p tsconfig.json --noEmit`
- `npm run build`

