# ZimCast hotspots & bugs

Last updated: 2026-04-02

This is a living list of high-risk areas ("hotspots") and confirmed/potential bugs found during a code walk of this workspace.

## Fix-first shortlist (highest impact)

1. ✅ Fixed (2026-04-02): Streaming auth hook now binds stream tokens to the requested stream path (prevents cross-stream token replay).
2. ✅ Fixed (2026-04-02): MediaMTX `authHTTPAddress` now targets the `app` service for Docker Compose networking (instead of `127.0.0.1`).
3. ✅ Fixed (2026-04-02): Frontend now consumes `GET /api/user/passes` as an array (Pass[]), matching the API + tests.
4. Admin Matches UI expects `streamKey` but loads from public `GET /api/matches` which omits `streamKey`.
5. `Payment.transactionRef` is never set, so admin payment records have no gateway reference.

## Critical security / access control

### Streaming access-control bypass (MediaMTX auth hook)

- Evidence
  - `src/app/api/streams/auth-hook/route.ts`
  - `src/lib/tokens.ts`
- Status
  - ✅ Fixed (2026-04-02): Stream tokens now encode the **MediaMTX path** (`payload.path`) and the auth hook requires `payload.path === path` for `match_*` streams.

### Stream token secret has a dangerous fallback

- Evidence
- Status
  - ✅ Fixed (2026-04-02): Removed the `"change-me"` fallback and now fail fast when `STREAM_TOKEN_SECRET` is missing.
- Impact
  - If `STREAM_TOKEN_SECRET` is missing in any environment, tokens become forgeable by anyone who knows/guesses the fallback.
- Suggested fix
  - Remove the fallback and fail fast at startup (or at first token generation/verification).

### Deactivated users are not blocked from signing in / using APIs

- Evidence
  - User deactivation exists (`User.isActive` in `prisma/schema.prisma`; admin toggles in `src/app/api/admin/users/[id]/route.ts`).
  - Credentials auth (`src/lib/auth.ts`) does not check `isActive`.
  - Most routes only check `session?.user?.id` or admin role.
- Impact
  - “Deactivated” is mostly a UI label; accounts can still authenticate and use the product.
- Suggested fix
  - Enforce `isActive` in `src/lib/auth.ts` (block authorization) and optionally in a shared helper for API routes.

### Seed creates a well-known admin credential

- Evidence
  - `prisma/seed.ts` sets admin email `admin@zimcast.tv` with password `"admin12345"`.
- Impact
  - If seeding is used in any shared/staging/prod environment without immediately rotating credentials, it’s an instant takeover.
- Suggested fix
  - Seed an admin **only** in dev/test, or require a `SEED_ADMIN_PASSWORD` env var, or generate a random password and print it once.

## Infrastructure / deployment hotspots

### MediaMTX auth hook address likely wrong in Docker Compose

- Evidence
  - ✅ Fixed (2026-04-02): `mediamtx/mediamtx.yml` now sets `authHTTPAddress: http://app:3000/api/streams/auth-hook`.
  - In `docker-compose.yml`, `mediamtx` and `app` are separate containers on a Compose network.
- Impact
  - Inside the `mediamtx` container, `127.0.0.1:3000` points back to `mediamtx`, not to the Next.js app; auth will fail (or hit nothing).
- Suggested fix
  - ✅ Done: Use `http://app:3000/api/streams/auth-hook` for the Compose network.
  - If running MediaMTX outside Compose, point this to your Next.js host instead.

### HLS base URL defaults to a path that is not proxied by Next.js

- Evidence
  - ✅ Fixed (2026-04-02): Frontend now uses the `streamUrl` returned by:
    - `POST /api/streams/token`
    - `GET /api/streams/ztv/token`
  - These endpoints build URLs from `NEXT_PUBLIC_STREAM_BASE_URL` (preferred) or `STREAM_BASE_URL` (fallback).
  - `docker-compose.yml` now sets `NEXT_PUBLIC_STREAM_BASE_URL` by default to a browser-reachable value.
- Impact
  - Ensure `NEXT_PUBLIC_STREAM_BASE_URL` is set to a URL that the **browser** can reach (not an internal Docker hostname like `http://mediamtx:8888`).

## API contract mismatches (confirmed functional bugs)

### `GET /api/user/passes` response shape mismatch (breaks UI)

- Status
  - ✅ Fixed (2026-04-02): Updated the UIs to treat the response as `Pass[]`, matching the API and `tests/api/user.test.ts`.

## Frontend routing / UI bugs

### Live TV "Up Next" match link points to a non-existent route

- Evidence
  - `src/components/up-next.tsx` linked to `/matches/[id]` but match detail pages are under `/sports/[id]`.
- Status
  - ✅ Fixed (2026-04-02): Updated link to `/sports/[id]`.

### Match watch viewer-count channel name double-prefixes `match_`

- Evidence
  - `src/app/(app)/watch/[id]/page.tsx` built `channel = match_${match.streamKey}` while `streamKey` already includes `match_` (seeded examples: `match_dynamos_caps`).
- Status
  - ✅ Fixed (2026-04-02): Viewer-count `channel` now uses `match.streamKey` directly.

### Admin Matches: list endpoint omits `streamKey` but UI expects it

- Evidence
  - Admin Matches UI loads matches from `GET /api/matches`: `src/app/(admin)/admin/matches/page.tsx`.
  - Public `GET /api/matches` selects no `streamKey`: `src/app/api/matches/route.ts`.
  - `streamKey` only exists in detail endpoint: `src/app/api/matches/[id]/route.ts`.
- Symptoms
  - Edit form wants `m.streamKey`, but list payload doesn’t include it, so it will be `undefined` at runtime.
- Suggested fix (options)
  - Make admin page call a dedicated admin list endpoint that includes `streamKey`, or
  - Extend `GET /api/matches` to include `streamKey` (but consider whether that leaks internal stream naming).

## Payment flow hotspots

### `Payment.transactionRef` never populated

- Evidence
  - `Payment` model includes `transactionRef` (`prisma/schema.prisma`).
  - Admin payments table displays it (`src/app/(admin)/admin/payments/page.tsx`).
  - Initiation/poll/webhook handlers do not set it:
    - `src/app/api/payments/initiate/route.ts`
    - `src/app/api/payments/poll/[id]/route.ts`
    - `src/app/api/payments/webhook/route.ts`
- Impact
  - Hard to reconcile payments with Paynow/EcoCash references; support/admin auditing suffers.
- Suggested fix
  - Store Paynow reference / gateway transaction id when available (webhook payload and/or poll response).

### Paynow webhook signature verification: confirm assumptions

- Evidence
  - Webhook route relies on `parsePaynowWebhook` throwing for invalid signature (`src/app/api/payments/webhook/route.ts`).
  - Wrapper calls `paynow.parseStatusUpdate(rawBody)` and does not explicitly call `verifyHash` (`src/lib/paynow.ts`).
- Risk
  - If the SDK parse method does not enforce HMAC verification, webhooks could be spoofed.
- Suggested next step
  - Confirm Paynow SDK behaviour; if it does not verify, explicitly call `verifyHash` on parsed values and reject when false.

### Env var naming drift for public URLs (email + Paynow)

- Evidence
  - Verification/reset emails use `NEXT_PUBLIC_APP_URL` (`src/lib/mail.ts`).
- Status
  - ✅ Fixed (2026-04-02): Paynow return URL builder now uses `NEXT_PUBLIC_APP_URL` (fallback `NEXTAUTH_URL`) to match email links.
- Impact
  - Misconfigured environments lead to broken email links or broken payment return flows.
- Suggested fix
  - ✅ Done: Standardized on `NEXT_PUBLIC_APP_URL` (with `NEXTAUTH_URL` fallback on the server).

## EPG / programs hotspots

### Overlap detection exists only on create, not on update

- Evidence
  - Overlap check in `POST` only: `src/app/api/admin/programs/route.ts`.
  - `PATCH` in `src/app/api/admin/programs/[id]/route.ts` allows changing times without re-checking overlaps.
- Impact
  - Admin can introduce overlapping programs on the same channel, which can break “now playing” logic and blackout checks.
- Suggested fix
  - Re-run overlap checks on update (excluding the current program id).

### Date filtering likely has timezone pitfalls

- Evidence
  - Admin programs filter uses `new Date(date)` where `date` is from an `<input type="date">` string (`YYYY-MM-DD`) in `src/app/api/admin/programs/route.ts`.
  - Public programs endpoint does similar parsing in `src/app/api/programs/route.ts`.
- Risk
  - `new Date("YYYY-MM-DD")` is parsed as UTC per spec; then `setHours()` uses local time. This can shift boundaries and cause off-by-one-day filtering depending on timezone.
- Suggested fix
  - Parse date-only strings explicitly in local time (or explicitly in UTC) and be consistent with how you store/interpret `DateTime` in Postgres.

## Redis / caching hotspots

### Cache invalidation uses `redis.keys("matches:*")`

- Evidence
  - Admin match create/update/delete calls `redis.keys("matches:*")` then `del(...)`:
    - `src/app/api/admin/matches/route.ts`
    - `src/app/api/admin/matches/[id]/route.ts`
- Risk
  - `KEYS` is O(N) and can hurt Redis in production.
- Suggested fix
  - Use a versioned cache key (e.g. `matches:v{n}:...`) or store known keys in a set.

## TypeScript / build hotspots

### Builds ignore TypeScript errors

- Evidence
  - `next.config.ts` sets `typescript.ignoreBuildErrors: true`.
- Impact
  - Type issues can ship to production unnoticed; runtime errors become more likely.
- Suggested fix
  - Turn this off once the project is stable, and enforce `tsc --noEmit` in CI.

## Notes / hygiene

- `.env` is correctly gitignored (`.gitignore`), but ensure secrets are not duplicated elsewhere.
- Some API routes return a `streamUrl` that clients ignore (clients rebuild HLS URL themselves):
  - `src/app/api/streams/token/route.ts`
  - `src/app/api/streams/ztv/token/route.ts`

## Suggested fix order (pragmatic)

1. Fix streaming auth hook token-path binding + remove token secret fallback.
2. Fix MediaMTX auth hook addressing for Docker Compose.
3. Fix `/api/user/passes` contract (and adjust callers).
4. Fix admin matches list to include `streamKey` (or add admin list endpoint).
5. Persist `transactionRef` and tighten Paynow webhook verification.
