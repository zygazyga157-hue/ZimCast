Phase 1: Project Scaffold & Database
Initialize Next.js project with TypeScript, App Router, Tailwind, npm
Set up Prisma ORM with PostgreSQL provider
Define database schema — User, Match, MatchPass, Payment tables per the architecture doc (with role enum on User for admin access)
Configure .env.example with all required variables
Prisma client singleton to prevent multiple instances in dev
Phase 2: Authentication
Install and configure NextAuth.js (v5) with Credentials provider, bcrypt password hashing, JWT session strategy
Auth API route — /api/auth/[...nextauth]
Registration endpoint — POST /api/auth/register
Auth middleware to protect private API routes
Phase 3: Core API Routes
Matches — GET /api/matches, GET /api/matches/[id], POST /api/admin/matches, PATCH /api/admin/matches/[id]
Stream access — POST /api/streams/token (signed HLS token with userId, matchId, expiration using HMAC-SHA256); GET /api/streams/ztv/token for free channel
Payments — POST /api/payments/initiate (Paynow/EcoCash/PayPal), POST /api/payments/webhook (creates MatchPass on success)
User — GET /api/user/profile, PATCH /api/user/profile, GET /api/user/passes
Phase 4: Redis Caching
ioredis client singleton
Cache match listings (TTL 60s), stream tokens for validation, rate limiting on token endpoints
Phase 5: Streaming Infrastructure
MediaMTX config (mediamtx.yml) — SRT ingest paths for ZTV + sports, HLS output, recording to /recordings/{stream}/{date}.mp4, API enabled
FFmpeg transcoding — adaptive bitrate ladder (1080p/720p/480p/360p)
MediaMTX external auth hook — validates stream tokens before allowing playback
Admin endpoint to dynamically add/remove match streams via MediaMTX API
Phase 6: Docker Compose
Multi-stage Dockerfile for Next.js
Dockerfile.mediamtx for MediaMTX + FFmpeg
docker-compose.yml — 4 services: app, db (PostgreSQL 16), redis (Redis 7), mediamtx
Init script for Prisma migrations on first boot
Key files (25 files to create): project config, Prisma schema, auth/API routes under src/app/api/, lib singletons, middleware, MediaMTX config, Docker files, transcoding script.

Verification: docker compose up boots cleanly → Prisma migrations apply → register/login works → match CRUD works → stream tokens are issued/rejected correctly → MediaMTX accepts SRT and serves HLS → auth hook blocks unauthorized playback.

Decisions made: App Router, JWT sessions, Paynow as primary aggregator, simple role field for admin, no frontend in this phase, MediaMTX external auth for stream protection.

Further considerations:

TLS — add Nginx/Caddy reverse proxy in a later deployment phase
Admin seed — recommend a Prisma seed script to create the first admin user
Health checks — add /api/health endpoint now or defer?
Want me to adjust anything, or shall we proceed to implementation?
