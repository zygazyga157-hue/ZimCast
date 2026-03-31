# ZimCast — Live Streaming Platform for Zimbabwe

ZimCast is a **pay-per-view live sports streaming** and **live TV** platform built for
the Zimbabwean market. It delivers ZBC Television (ZTV) and Zimbabwe Premier Soccer
League (PSL) match streams to viewers' browsers via low-latency HLS, with payments
processed through **EcoCash** (mobile money) and **Paynow** (web/card) — the two
dominant payment gateways in Zimbabwe.

The platform is developed by **Zimbit Solutions**, a Zimbabwean technology company.
It is designed to receive live SRT feeds from the **Zimbabwe Broadcasting Corporation
(ZBC)**, transcode them into adaptive-bitrate HLS, and serve them to authenticated,
paying viewers through a modern progressive web application.

---

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Architecture](#architecture)
3.  [Tech Stack](#tech-stack)
4.  [Directory Structure](#directory-structure)
5.  [Getting Started](#getting-started)
6.  [Environment Variables](#environment-variables)
7.  [Database](#database)
8.  [Authentication](#authentication)
9.  [Payment Gateway — EcoCash & Paynow](#payment-gateway--ecocash--paynow)
10. [Streaming Infrastructure](#streaming-infrastructure)
11. [Information Required from ZBC](#information-required-from-zbc)
12. [Information Required from Zimbit Solutions](#information-required-from-zimbit-solutions)
13. [Information Required from Paynow / EcoCash](#information-required-from-paynow--ecocash)
14. [Admin Dashboard](#admin-dashboard)
15. [EPG (Electronic Programme Guide)](#epg-electronic-programme-guide)
16. [API Reference](#api-reference)
17. [Testing](#testing)
18. [Docker Deployment](#docker-deployment)
19. [Scripts & Tooling](#scripts--tooling)
20. [Security](#security)
21. [Contributing](#contributing)
22. [License](#license)

---

## Project Overview

| Feature               | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| **Live TV (ZTV)**     | Free-to-air ZBC Television restreamed via HLS                     |
| **Sports PPV**        | Pay-per-match Zimbabwe PSL football streams                       |
| **EcoCash Payments**  | USSD-based mobile money via Paynow `sendMobile()` API             |
| **Paynow Web**        | Browser-redirect card/wallet payments via Paynow `send()` API     |
| **Admin Dashboard**   | Full CRUD for matches, programs (EPG), users, payments, KPIs      |
| **Real-time Viewers** | Redis sorted-set heartbeat counter showing live viewer counts     |
| **Adaptive Bitrate**  | 1080p / 720p / 480p / 360p HLS variants via FFmpeg transcoding    |
| **Low-Latency HLS**   | Sub-2-second latency using MediaMTX LL-HLS with 1s segments       |
| **Auth System**       | Email/password with email verification, forgot/reset password     |
| **Profile System**    | User profiles with avatar, phone, interests, notification prefs   |
| **EPG**               | Electronic Programme Guide with category icons and live indicators|
| **PWA Ready**         | Responsive dark-theme UI optimised for mobile-first Zimbabwe users|

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ZBC Broadcasting                             │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  ZTV Live Feed   │   │  Match Camera 1  │   │  Match Camera N │  │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬────────┘  │
│           │ SRT                   │ SRT                   │ SRT      │
└───────────┼───────────────────────┼───────────────────────┼──────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     MediaMTX (v1.17.0)                               │
│                                                                      │
│  • SRT Ingest   (:9000)  — receives live feeds from ZBC encoders     │
│  • HLS Output   (:8888)  — serves .m3u8 playlists to viewers        │
│  • Control API  (:9997)  — dynamic path management                   │
│  • Auth Hook    → POST /api/streams/auth-hook (token validation)     │
│                                                                      │
│  Transcoding: FFmpeg adaptive bitrate (1080p/720p/480p/360p)         │
│  HLS Config:  lowLatency variant, 1s segments, 7 segment count       │
└──────────────────────────────────────────────────────────────────────┘
            │ HLS
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   ZimCast App (Next.js 16)                           │
│                                                                      │
│  Frontend (React 19 + Framer Motion + shadcn/ui + video.js)          │
│  ├── Landing Page        — Marketing + live match preview            │
│  ├── Live TV (/live-tv)  — ZTV stream + EPG + viewer count           │
│  ├── Sports (/sports)    — Match listings + hero + filters           │
│  ├── Match Detail        — Payment flow (EcoCash / Paynow)           │
│  ├── Watch Page          — HLS player + stream controls              │
│  ├── Profile             — User settings + viewing history           │
│  └── Admin (/admin)      — Dashboard + CRUD for all entities         │
│                                                                      │
│  Backend API (Next.js Route Handlers)                                │
│  ├── /api/auth/*         — NextAuth.js credentials provider          │
│  ├── /api/matches/*      — Match CRUD + Redis caching                │
│  ├── /api/payments/*     — Paynow initiate, poll, webhook            │
│  ├── /api/streams/*      — Token generation + auth hook              │
│  ├── /api/programs/*     — EPG CRUD                                  │
│  ├── /api/user/*         — Profile, passes, analytics                │
│  └── /api/admin/*        — Stats, users, payments (admin only)       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│   PostgreSQL 16     │     │        Redis 7              │
│                     │     │                             │
│ • Users             │     │ • API response cache (60s)  │
│ • Matches           │     │ • Viewer count sorted sets  │
│ • MatchPasses       │     │ • Session rate limiting     │
│ • Payments          │     │                             │
│ • Programs (EPG)    │     │                             │
│ • ViewingActivity   │     │                             │
└─────────────────────┘     └─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│           Paynow Payment Gateway                │
│                                                 │
│  EcoCash (sendMobile) ←→ USSD prompt on phone   │
│  Paynow Web (send)    ←→ Browser redirect       │
│  Webhook              → POST /api/payments/webhook│
│  Return URL           → /payment/success         │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology                    | Version   | Purpose                                   |
| -------------- | ----------------------------- | --------- | ----------------------------------------- |
| **Framework**  | Next.js (App Router)          | 16.2.1    | Full-stack React framework                |
| **Runtime**    | React                         | 19.2.4    | UI rendering                              |
| **Language**   | TypeScript                    | 5.x       | Type safety throughout                    |
| **Database**   | PostgreSQL                    | 16        | Primary data store                        |
| **ORM**        | Prisma                        | 7.6.0     | Schema-first database access              |
| **Cache**      | Redis (ioredis)               | 7 / 5.10  | API caching + viewer counters             |
| **Auth**       | NextAuth.js v5 (beta)         | 5.0.0-β30 | JWT credentials authentication            |
| **Payments**   | Paynow SDK                    | 2.2.2     | EcoCash + web payments                    |
| **Streaming**  | MediaMTX                      | 1.17.0    | SRT ingest → HLS delivery                 |
| **Player**     | video.js                      | 8.23.7    | HLS playback in browser                   |
| **UI**         | shadcn/ui + Tailwind CSS 4    | Latest    | Component library + utility CSS           |
| **Animations** | Framer Motion                 | 12.38.0   | Page transitions + micro-animations       |
| **Icons**      | Lucide React                  | 1.7.0     | Consistent icon system                    |
| **Email**      | Nodemailer                    | 7.0.13    | Verification + password reset emails      |
| **Toasts**     | Sonner                        | 2.0.7     | User notifications                        |
| **Testing**    | Vitest + Testcontainers       | 4.1.2     | Unit + integration testing                |
| **Container**  | Docker + Docker Compose       | —         | Production deployment                     |
| **Transcoding**| FFmpeg                        | —         | Adaptive bitrate encoding                 |

---

## Directory Structure

```
ZimCast/
├── docker-compose.yml          # Full stack: app + db + redis + mediamtx
├── Dockerfile                  # Multi-stage Next.js production build
├── docker/
│   └── Dockerfile.mediamtx     # MediaMTX + FFmpeg image
├── mediamtx/
│   └── mediamtx.yml            # MediaMTX configuration (SRT→HLS, auth hook)
├── prisma/
│   ├── schema.prisma           # Database schema (6 models, 6 enums)
│   └── seed.ts                 # Admin user + sample matches
├── scripts/
│   └── transcode.sh            # FFmpeg ABR transcoding (4 quality levels)
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind + custom CSS variables + keyframes
│   │   ├── layout.tsx          # Root layout with SessionProvider + Toaster
│   │   ├── page.tsx            # Landing page (7 sections)
│   │   │
│   │   ├── (app)/              # Public route group (Navbar + Footer)
│   │   │   ├── live-tv/        # ZTV live stream + EPG
│   │   │   ├── sports/         # Match listings with hero + filters
│   │   │   │   └── [id]/       # Match detail + payment flow
│   │   │   ├── watch/
│   │   │   │   └── [id]/       # Stream viewer (post-payment)
│   │   │   ├── payment/
│   │   │   │   └── success/    # Paynow return page
│   │   │   └── profile/        # User settings + viewing history
│   │   │
│   │   ├── (admin)/            # Admin route group (separate layout)
│   │   │   └── admin/
│   │   │       ├── page.tsx    # Overview: KPIs + recent payments
│   │   │       ├── matches/    # Match CRUD
│   │   │       ├── programs/   # EPG CRUD
│   │   │       ├── users/      # User management
│   │   │       └── payments/   # Payment log
│   │   │
│   │   ├── (auth)/             # Auth route group (split-screen layout)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   │
│   │   └── api/                # Backend API routes
│   │       ├── auth/           # NextAuth + register + verify + reset
│   │       ├── matches/        # Public match data (cached 60s)
│   │       ├── payments/       # Initiate, poll, webhook
│   │       ├── streams/        # Token gen + auth hook + viewers
│   │       ├── programs/       # EPG data
│   │       ├── user/           # Profile, passes, analytics
│   │       ├── admin/          # Stats, users, payments (admin-only)
│   │       └── health/         # Health check endpoint
│   │
│   ├── components/             # Reusable React components
│   │   ├── ui/                 # shadcn/ui primitives (button, card, etc.)
│   │   ├── video-player.tsx    # video.js HLS player wrapper
│   │   ├── stream-controls.tsx # Viewer count + quality + share
│   │   ├── sports-hero.tsx     # Featured match hero banner
│   │   ├── match-card.tsx      # VS-style match card
│   │   ├── match-filters.tsx   # Animated filter tabs
│   │   ├── empty-matches.tsx   # Filter-aware empty states
│   │   ├── navbar.tsx          # App navigation bar
│   │   ├── admin-tabs.tsx      # Admin dashboard tabs
│   │   └── ...                 # EPG, off-air, recommendations, etc.
│   │
│   ├── hooks/
│   │   └── use-viewer-count.ts # Heartbeat-based viewer counter
│   │
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── paynow.ts           # Paynow SDK wrapper (typed)
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── redis.ts            # Redis client singleton
│   │   ├── tokens.ts           # HMAC stream token generation
│   │   ├── api.ts              # Client-side fetch wrapper
│   │   └── errors.ts           # Server-side error handler
│   │
│   └── types/
│       └── next-auth.d.ts      # NextAuth type augmentation
│
└── tests/
    ├── setup.ts                # Vitest global setup
    ├── api/                    # Integration tests (Testcontainers)
    │   ├── matches.test.ts
    │   ├── payments.test.ts
    │   ├── register.test.ts
    │   ├── streams.test.ts
    │   └── user.test.ts
    ├── db/
    │   └── constraints.test.ts # Database constraint tests
    ├── helpers/
    │   ├── containers.ts       # PostgreSQL Testcontainer setup
    │   ├── factories.ts        # Test data factories
    │   ├── request.ts          # Test HTTP helpers
    │   └── server.ts           # Test server bootstrap
    └── unit/
        ├── prisma.test.ts      # Prisma client tests
        └── tokens.test.ts      # Stream token tests
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **PostgreSQL** 16.x (local or Docker)
- **Redis** 7.x (local or Docker)
- **npm** ≥ 10.x

### Quick Start (Development)

```bash
# 1. Clone the repository
git clone https://github.com/zimbit-solutions/zimcast.git
cd zimcast

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values (see Environment Variables section)
cp .env.example .env

# 4. Start PostgreSQL and Redis (Docker option)
docker compose up db redis -d

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed the database (creates admin user + sample matches)
npx prisma db seed

# 7. Start the development server
npm run dev
```

The app will be running at **http://localhost:3000**.

### Quick Start (Docker — Full Stack)

```bash
# Start everything: app + db + redis + mediamtx
docker compose up --build -d

# Run migrations inside the container
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

### Default Admin Credentials

| Field    | Value                 |
| -------- | --------------------- |
| Email    | `admin@zimcast.tv`    |
| Password | `admin12345`          |

> **Warning:** Change these credentials immediately in production.

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ─── Database ────────────────────────────────────────────────────────────────
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zimcast?schema=public"

# ─── Redis ───────────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── NextAuth ────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="<generate-a-random-32-byte-secret>"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# ─── Paynow Payment Gateway ─────────────────────────────────────────────────
# Obtain from https://developers.paynow.co.zw after registering as a merchant
PAYNOW_INTEGRATION_ID="<your-paynow-integration-id>"
PAYNOW_INTEGRATION_KEY="<your-paynow-integration-key>"
# Must match the email registered with Paynow (required in test mode)
PAYNOW_MERCHANT_EMAIL="<merchant-registered-email@example.com>"
# Server-to-server webhook (Paynow sends payment status updates here)
PAYNOW_RESULT_URL="https://yourdomain.com/api/payments/webhook"
# User is redirected here after completing Paynow web checkout
PAYNOW_RETURN_URL="https://yourdomain.com/payment/success"

# ─── Streaming ───────────────────────────────────────────────────────────────
# MediaMTX control API (internal, not exposed to public)
MEDIAMTX_API_URL="http://localhost:9997"
# Base URL for HLS stream delivery
STREAM_BASE_URL="http://localhost:8888"
# HMAC secret for stream access tokens — generate a strong random value
STREAM_TOKEN_SECRET="<generate-a-random-secret>"

# ─── SMTP (Email) ───────────────────────────────────────────────────────────
# Used for email verification, password reset, and notifications
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="<your-email@gmail.com>"
SMTP_PASS="<your-gmail-app-password>"
SMTP_FROM="<your-email@gmail.com>"

# ─── App ─────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_STREAM_BASE_URL="http://localhost:8888"
```

---

## Database

### Schema Overview (6 Models)

| Model              | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| **User**           | Registered viewers and admins                     |
| **Match**          | Football matches with stream key and pricing      |
| **MatchPass**      | Time-limited access passes (userId + matchId)     |
| **Payment**        | Payment records with provider, status, poll URL   |
| **Program**        | EPG entries (title, category, time, channel)      |
| **ViewingActivity**| Analytics: what users watch, for how long         |

### Enums

| Enum                | Values                                                |
| ------------------- | ----------------------------------------------------- |
| `Role`              | `USER`, `ADMIN`                                       |
| `PaymentProvider`   | `ECOCASH`, `PAYNOW`                                  |
| `PaymentStatus`     | `PENDING`, `COMPLETED`, `FAILED`                      |
| `ProgramCategory`   | `NEWS`, `SPORTS`, `ENTERTAINMENT`, `MUSIC`, `DOCUMENTARY`, `OTHER` |
| `ViewAction`        | `WATCH`, `SKIP`, `CLICK`, `LIKE`, `SEARCH`            |

### Commands

```bash
# Create a new migration
npx prisma migrate dev --name <migration-name>

# Push schema without migration (dev only)
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Seed the database
npx prisma db seed

# Generate Prisma client
npx prisma generate
```

---

## Authentication

ZimCast uses **NextAuth.js v5** with a **JWT-based credentials provider**.

### Flow

1. User registers at `/register` → password hashed with **bcryptjs** (12 rounds)
2. Verification email sent via SMTP with a unique token
3. User clicks link → hits `/api/auth/verify?token=xxx` → `emailVerified = true`
4. User logs in at `/login` → JWT issued with `id`, `email`, `role`, `emailVerified`
5. JWT refreshed on each request via NextAuth callbacks
6. Forgot password → `/api/auth/forgot-password` sends reset email with token
7. Reset password → `/api/auth/reset-password` validates token and updates password

### Session Shape

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: "USER" | "ADMIN";
    emailVerified: boolean;
  };
}
```

### Role-Based Access

- **Public routes:** Landing, Login, Register, Forgot/Reset Password
- **Authenticated routes:** Sports, Watch, Profile, Live TV, Payment
- **Admin routes:** `/admin/*` — guarded by `role === "ADMIN"` check in layout

---

## Payment Gateway — EcoCash & Paynow

ZimCast supports two payment methods, both processed through the
**Paynow** payment gateway (https://paynow.co.zw):

### Payment Methods

| Method         | Flow Type     | How It Works                                              |
| -------------- | ------------- | --------------------------------------------------------- |
| **EcoCash**    | Mobile USSD   | Paynow sends a USSD prompt to the user's phone; user confirms with PIN |
| **Paynow Web** | Browser Redirect | User is redirected to Paynow.co.zw to pay via card or mobile wallet |

### EcoCash Payment Flow

```
User (Match Detail Page)
  │
  ├─ 1. Selects "EcoCash", enters phone number (07XXXXXXXX)
  │
  ├─ 2. POST /api/payments/initiate
  │     Body: { matchId, provider: "ECOCASH", phone: "07..." }
  │
  │     Server:
  │     ├─ Creates Payment record (PENDING) in database
  │     ├─ Calls paynow.sendMobile(payment, phone, "ecocash")
  │     ├─ Stores pollUrl from response in Payment record
  │     └─ Returns { paymentId }
  │
  ├─ 3. Frontend begins polling: GET /api/payments/poll/{paymentId}
  │     Server:
  │     ├─ Reads pollUrl from Payment record
  │     ├─ Calls paynow.pollTransaction(pollUrl)
  │     ├─ Checks response for "paid" or "awaiting delivery" status
  │     └─ Returns { status: "PENDING" | "COMPLETED" | "FAILED" }
  │
  ├─ 4. User receives USSD prompt on phone → enters EcoCash PIN
  │
  ├─ 5. Paynow sends webhook: POST /api/payments/webhook
  │     Server:
  │     ├─ Parses and verifies HMAC hash
  │     ├─ Updates Payment status to COMPLETED
  │     └─ Creates MatchPass (24-hour access)
  │
  └─ 6. Frontend poll detects COMPLETED → redirects to /watch/{matchId}
```

### Paynow Web Payment Flow

```
User (Match Detail Page)
  │
  ├─ 1. Selects "Paynow Web"
  │
  ├─ 2. POST /api/payments/initiate
  │     Body: { matchId, provider: "PAYNOW" }
  │
  │     Server:
  │     ├─ Creates Payment record (PENDING)
  │     ├─ Calls paynow.send(payment) with returnUrl=/payment/success?ref={id}
  │     ├─ Stores pollUrl in Payment record
  │     └─ Returns { redirectUrl } (Paynow checkout page)
  │
  ├─ 3. Frontend redirects: window.location.href = redirectUrl
  │
  ├─ 4. User completes payment on Paynow.co.zw
  │
  ├─ 5. Paynow sends webhook → POST /api/payments/webhook
  │     (same as EcoCash step 5)
  │
  └─ 6. Paynow redirects user to /payment/success?ref={paymentId}
        ├─ Page polls for status
        └─ On COMPLETED → shows success + link to /watch/{matchId}
```

### Webhook Security

The webhook endpoint (`/api/payments/webhook`) verifies the **HMAC hash** sent by
Paynow using the integration key. This prevents spoofed payment confirmations.

```typescript
// Paynow SDK handles hash verification internally
const status = paynow.parseStatusUpdate(rawBody);
const isValid = paynow.verifyHash(parsedValues);
```

### Match Pass

On successful payment, a **MatchPass** is created:

- Linked to the user and match
- Expires 24 hours after creation
- Unique constraint: one pass per user per match
- Checked at stream token generation time

---

## Streaming Infrastructure

### Components

| Component   | Port  | Protocol | Purpose                                  |
| ----------- | ----- | -------- | ---------------------------------------- |
| **MediaMTX**| 9000  | SRT      | Receives live feeds from ZBC encoders    |
| **MediaMTX**| 8888  | HLS      | Serves .m3u8 playlists to viewers        |
| **MediaMTX**| 9997  | HTTP     | Control API for dynamic path management  |
| **FFmpeg**  | —     | —        | Transcodes SRT to adaptive bitrate HLS   |

### Stream Authentication

Every HLS read request is authenticated via MediaMTX's **HTTP auth hook**:

1. Viewer requests `http://mediamtx:8888/{streamKey}/index.m3u8?token=xxx`
2. MediaMTX calls `POST /api/streams/auth-hook` with `{ action, path, query }`
3. Server verifies the HMAC token contains valid `userId`, `matchId`, and `exp`
4. Returns 200 (allow) or 401 (deny)

Publish actions (from SRT sources) are allowed without tokens.

### Stream Token Generation

#### Match Streams

```
POST /api/streams/token
Body: { matchId: "clxx..." }

Server:
├─ Verifies user has a valid (non-expired) MatchPass
├─ Generates HMAC-SHA256 token: base64url(payload).base64url(signature)
│   Payload: { userId, matchId, exp: now + 3 hours }
└─ Returns { token, streamUrl }
```

#### ZTV (Free-to-Air)

```
POST /api/streams/ztv/token

Server:
├─ Any authenticated user can watch ZTV
├─ Generates token with matchId="ztv"
└─ Returns { token, streamUrl }
```

### Adaptive Bitrate Transcoding

The `scripts/transcode.sh` script uses FFmpeg to produce 4 quality levels:

| Quality | Resolution | Video Bitrate | Audio Bitrate |
| ------- | ---------- | ------------- | ------------- |
| 1080p   | 1920×1080  | 5,000 kbps    | 128 kbps      |
| 720p    | 1280×720   | 3,000 kbps    | 128 kbps      |
| 480p    | 854×480    | 1,500 kbps    | 96 kbps       |
| 360p    | 640×360    | 700 kbps      | 64 kbps       |

Usage:
```bash
./scripts/transcode.sh "srt://zbc-encoder:9000?streamid=ztv_main" /output/ztv
```

### Real-Time Viewer Count

- Uses **Redis sorted sets** with score = timestamp
- Frontend sends heartbeats every 15 seconds via `POST /api/streams/viewers`
- Stale entries (>30s old) are automatically pruned on each read
- `GET /api/streams/viewers?channel=xxx` returns current count
- `DELETE /api/streams/viewers` removes the viewer on page leave
- Handles browser visibility changes (pauses when tab is hidden)

---

## Information Required from ZBC

The following information must be obtained from the **Zimbabwe Broadcasting Corporation
(ZBC)** to connect ZimCast to their live broadcast infrastructure:

### 1. SRT Live Stream Endpoints

ZimCast receives live video via **SRT (Secure Reliable Transport)** protocol.
ZBC must provide the SRT ingest URLs for each stream source:

| Stream        | Required Information                                     |
| ------------- | -------------------------------------------------------- |
| **ZTV Main**  | SRT URL, e.g. `srt://zbc-encoder.zw:9000?streamid=ztv_main` |
| **ZTV Sports**| SRT URL for dedicated sports feed (if separate from main)|
| **Match Feeds**| Per-match SRT URLs from stadium encoders                |

**Required SRT parameters:**
- IP address or hostname of ZBC's SRT encoder(s)
- Port number (default: 9000)
- Stream ID / passphrase (if using SRT encryption)
- Latency setting (recommended: 200ms for local, 500ms for long-distance)
- Encoder output format (expected: H.264 video + AAC audio)

### 2. Electronic Programme Guide (EPG) Data

ZimCast displays ZBC's programme schedule. ZBC must provide **daily EPG data**
in one of the following formats:

| Format              | Description                                             |
| ------------------- | ------------------------------------------------------- |
| **XMLTV** (preferred) | Industry-standard XML format for TV schedules         |
| **JSON API**        | REST endpoint returning programme data                  |
| **CSV/Excel**       | Manual upload (least preferred — requires admin input)  |
| **DVBSI EPG**       | Extracted from ZBC's DVB-S2 transport stream            |

**Required EPG fields per programme:**

```
- title:       Programme title (e.g. "ZTV News at 8")
- category:    NEWS | SPORTS | ENTERTAINMENT | MUSIC | DOCUMENTARY | OTHER
- startTime:   Start time in ISO 8601 (e.g. "2026-03-31T20:00:00+02:00")
- endTime:     End time in ISO 8601
- description: Brief synopsis (optional)
- channel:     Channel identifier (e.g. "ZBCTV", "ZTV")
```

**EPG update frequency:** Daily or weekly schedule push is ideal. ZimCast's admin
dashboard also supports manual EPG entry if no automated feed is available.

### 3. Match Schedule Data

For PSL matches, ZBC or the Premier Soccer League must provide:

| Field           | Description                                              |
| --------------- | -------------------------------------------------------- |
| **Home Team**   | Full team name (e.g. "Dynamos FC")                      |
| **Away Team**   | Full team name (e.g. "CAPS United")                     |
| **Kickoff Time**| Date and time in ISO 8601 with timezone                 |
| **Venue**       | Stadium name (for display purposes)                     |
| **Stream Key**  | Unique identifier for the SRT stream (e.g. `match_dynamos_caps`) |

### 4. Branding / Content

| Item             | Required For                                             |
| ---------------- | -------------------------------------------------------- |
| ZBC/ZTV logo     | Channel info banner, EPG display                        |
| Team logos/badges | Match cards, hero banners (if available from PSL)       |
| Programme images | EPG thumbnails (if available)                           |

---

## Information Required from Zimbit Solutions

The following information is needed from **Zimbit Solutions** (the development company)
to configure the production deployment:

### 1. Company Details

| Field                  | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| **Registered Name**    | Legal entity for Paynow merchant registration         |
| **Registration Number**| Company registration (CR14/...)                       |
| **Physical Address**   | Required for Paynow & banking compliance              |
| **Contact Person**     | Primary technical contact                             |
| **Contact Email**      | Used for Paynow merchant account + SMTP `from` field  |
| **Contact Phone**      | Paynow merchant verification                         |

### 2. Domain & Infrastructure

| Field                  | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| **Production Domain**  | e.g. `zimcast.tv` — for NEXTAUTH_URL, return URLs     |
| **SSL Certificate**    | Let's Encrypt or commercial cert for HTTPS            |
| **Server IP(s)**       | VPS/cloud server for Docker deployment                |
| **DNS Provider**       | For configuring A records to server                   |
| **SMTP Credentials**   | Production email service (SendGrid, Mailgun, etc.)    |

### 3. Secrets to Generate

```bash
# NextAuth secret (JWT signing)
openssl rand -base64 32

# Stream token secret (HMAC signing for HLS access)
openssl rand -base64 32

# Database password
openssl rand -base64 24
```

---

## Information Required from Paynow / EcoCash

To process payments, the following must be obtained from **Paynow** (https://paynow.co.zw):

### 1. Paynow Merchant Account

Register at https://developers.paynow.co.zw and create an integration:

| Credential                | Where to Find                                       |
| ------------------------- | --------------------------------------------------- |
| **Integration ID**        | Paynow Dashboard → Integrations → Integration ID   |
| **Integration Key**       | Paynow Dashboard → Integrations → Integration Key  |
| **Merchant Email**        | The email used to register the Paynow account       |

### 2. Integration Configuration on Paynow Dashboard

These URLs must be configured in the Paynow integration settings:

| Setting           | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| **Result URL**    | `https://yourdomain.com/api/payments/webhook`            |
| **Return URL**    | `https://yourdomain.com/payment/success`                 |

### 3. EcoCash Mobile Money

EcoCash payments are routed through Paynow — no separate EcoCash merchant account
is needed. The Paynow SDK's `sendMobile()` method handles the USSD integration:

- **Supported phone format:** `07XXXXXXXX` (10-digit Zimbabwean mobile number)
- **Supported networks:** EcoCash (Econet), OneMoney (NetOne) — currently only
  EcoCash is enabled in ZimCast
- **Test mode:** Paynow test mode requires `authEmail` to match the merchant's
  registered email. In production, any email can be used.

### 4. Testing vs Production

| Mode          | Integration ID           | Behaviour                              |
| ------------- | ------------------------ | -------------------------------------- |
| **Test**      | Test integration ID      | No real money moves, simulated USSD    |
| **Production**| Live integration ID      | Real EcoCash/card charges              |

To switch to production:
1. Request Paynow to activate your live integration
2. Update `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` in `.env`
3. Update `PAYNOW_RESULT_URL` and `PAYNOW_RETURN_URL` to production domain
4. Verify webhook is accessible from Paynow's servers (public HTTPS)

### 5. Environment Variables for Payment

```env
PAYNOW_INTEGRATION_ID="<from-paynow-dashboard>"
PAYNOW_INTEGRATION_KEY="<from-paynow-dashboard>"
PAYNOW_MERCHANT_EMAIL="<registered-merchant-email>"
PAYNOW_RESULT_URL="https://yourdomain.com/api/payments/webhook"
PAYNOW_RETURN_URL="https://yourdomain.com/payment/success"
```

---

## Admin Dashboard

The admin dashboard is accessible at `/admin` and requires `role: "ADMIN"`.

### Tabs

| Tab          | Route              | Features                                          |
| ------------ | ------------------ | ------------------------------------------------- |
| **Overview** | `/admin`           | KPI cards (revenue, users, matches), recent payments |
| **Matches**  | `/admin/matches`   | Create, edit, toggle live, delete matches         |
| **Programs** | `/admin/programs`  | EPG management with date filter, overlap detection|
| **Users**    | `/admin/users`     | Search users, toggle active, promote/demote admin |
| **Payments** | `/admin/payments`  | Payment log with status + provider filters        |

### Admin API Routes

| Method   | Route                        | Purpose                              |
| -------- | ---------------------------- | ------------------------------------ |
| `GET`    | `/api/admin/stats`           | Dashboard KPIs + recent payments     |
| `GET`    | `/api/admin/matches`         | List all matches                     |
| `POST`   | `/api/admin/matches`         | Create new match                     |
| `PATCH`  | `/api/admin/matches/[id]`    | Update match (toggle live, edit)     |
| `DELETE` | `/api/admin/matches/[id]`    | Delete match + cascade               |
| `GET`    | `/api/admin/users`           | List users (with `?search=`)         |
| `PATCH`  | `/api/admin/users/[id]`      | Toggle role or active status         |
| `GET`    | `/api/admin/payments`        | List payments (with filters)         |

---

## EPG (Electronic Programme Guide)

### How EPG Works in ZimCast

1. **Admin creates programmes** via `/admin/programs` or API
2. Programmes have: `title`, `category`, `channel`, `startTime`, `endTime`
3. Sports programmes can be **linked to a Match** for "Watch Now" CTAs
4. The Live TV page shows:
   - **EPG Strip** — horizontal timeline of current/upcoming programmes
   - **Full Schedule** — expandable day view grouped by time
   - **Category icons** — News 📰, Sports ⚽, Entertainment 🎬, etc.
5. The Sports page shows a "Today on ZimCast" section with sports-category EPG

### EPG API

| Method   | Route                        | Purpose                              |
| -------- | ---------------------------- | ------------------------------------ |
| `GET`    | `/api/programs`              | List today's programmes              |
| `POST`   | `/api/admin/programs`        | Create programme (admin)             |
| `PATCH`  | `/api/admin/programs/[id]`   | Update programme (admin)             |
| `DELETE` | `/api/admin/programs/[id]`   | Delete programme (admin)             |

### Categories

| Category        | Icon    | Use Case                              |
| --------------- | ------- | ------------------------------------- |
| `NEWS`          | 📰      | ZTV News, current affairs             |
| `SPORTS`        | ⚽      | PSL matches, sports shows             |
| `ENTERTAINMENT` | 🎬      | Dramas, movies, reality TV            |
| `MUSIC`         | 🎵      | Music shows, concerts                 |
| `DOCUMENTARY`   | 📚      | Documentaries                         |
| `OTHER`         | 📺      | Everything else                       |

---

## API Reference

### Public API Routes

| Method | Route                          | Auth     | Description                         |
| ------ | ------------------------------ | -------- | ----------------------------------- |
| `GET`  | `/api/health`                  | None     | Health check                        |
| `POST` | `/api/auth/register`           | None     | User registration                   |
| `GET`  | `/api/auth/verify`             | None     | Email verification                  |
| `POST` | `/api/auth/forgot-password`    | None     | Send reset email                    |
| `POST` | `/api/auth/reset-password`     | None     | Reset password with token           |
| `GET`  | `/api/matches`                 | None     | List matches (cached 60s)           |
| `GET`  | `/api/matches/[id]`            | None     | Single match details                |
| `GET`  | `/api/programs`                | None     | Today's EPG                         |

### Authenticated API Routes

| Method   | Route                          | Auth     | Description                       |
| -------- | ------------------------------ | -------- | --------------------------------- |
| `POST`   | `/api/payments/initiate`       | User     | Start payment flow                |
| `GET`    | `/api/payments/poll/[id]`      | User     | Poll payment status               |
| `POST`   | `/api/payments/webhook`        | Paynow   | Webhook (HMAC verified)           |
| `POST`   | `/api/streams/token`           | User     | Generate match stream token       |
| `POST`   | `/api/streams/ztv/token`       | User     | Generate ZTV stream token         |
| `POST`   | `/api/streams/auth-hook`       | MediaMTX | Validate stream access            |
| `GET`    | `/api/streams/viewers`         | None     | Get viewer count                  |
| `POST`   | `/api/streams/viewers`         | None     | Heartbeat (viewer online)         |
| `DELETE` | `/api/streams/viewers`         | None     | Remove viewer                     |
| `GET`    | `/api/user/profile`            | User     | Get user profile                  |
| `PATCH`  | `/api/user/profile`            | User     | Update profile                    |
| `GET`    | `/api/user/passes`             | User     | List active match passes          |

---

## Testing

### Test Setup

- **Unit tests:** Pure logic tests (tokens, Prisma client)
- **Integration tests:** Full API tests using **Testcontainers** (PostgreSQL in Docker)

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only API integration tests (requires Docker)
npm run test:api

# Run only database constraint tests (requires Docker)
npm run test:db

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Results (Expected)

```
 Test Files  2 passed (unit)
      Tests  13 passed
```

Integration tests require Docker to be running for Testcontainers.

---

## Docker Deployment

### Services

| Service      | Image                          | Ports         | Purpose              |
| ------------ | ------------------------------ | ------------- | -------------------- |
| **app**      | `zimcast-app` (custom build)   | 3000          | Next.js application  |
| **db**       | `postgres:16-alpine`           | 5432          | PostgreSQL database  |
| **redis**    | `redis:7-alpine`               | 6379          | Cache + viewer count |
| **mediamtx** | Custom (MediaMTX + FFmpeg)     | 8888,9000,9997| Stream processing    |

### Production Deployment

```bash
# Build and start all services
docker compose up --build -d

# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data
docker compose exec app npx prisma db seed

# View logs
docker compose logs -f app

# Stop all services
docker compose down
```

### Volumes

| Volume        | Purpose                                |
| ------------- | -------------------------------------- |
| `pgdata`      | PostgreSQL data persistence            |
| `redisdata`   | Redis data persistence                 |
| `recordings`  | Stream recordings (future feature)     |

---

## Scripts & Tooling

### NPM Scripts

| Script           | Command                                               |
| ---------------- | ----------------------------------------------------- |
| `dev`            | Start dev server (webpack mode)                       |
| `build`          | Generate Prisma client + Next.js production build     |
| `start`          | Start production server                               |
| `lint`           | Run ESLint                                            |
| `test`           | Run Vitest test suite                                 |
| `test:watch`     | Run Vitest in watch mode                              |
| `test:coverage`  | Run tests with coverage report                        |
| `test:unit`      | Run unit tests only                                   |
| `test:api`       | Run API integration tests only                        |
| `db:migrate`     | Run Prisma migrations                                 |
| `db:push`        | Push schema without migration                         |
| `db:seed`        | Seed database with initial data                       |
| `db:studio`      | Open Prisma Studio (visual DB browser)                |
| `redis:start`    | Start local Redis server (Windows)                    |
| `redis:stop`     | Stop local Redis server                               |
| `redis:ping`     | Ping Redis to check connectivity                      |

### Transcoding Script

```bash
# Transcode an SRT stream to 4-quality adaptive HLS
./scripts/transcode.sh "srt://source:9000?streamid=stream_name" /output/path
```

Produces: `1080p/index.m3u8`, `720p/index.m3u8`, `480p/index.m3u8`, `360p/index.m3u8`
and a `master.m3u8` playlist pointing to all variants.

---

## Security

### Authentication & Authorization

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWT-based sessions (no server-side session storage)
- Role-based access control (USER, ADMIN)
- Admin routes protected by layout-level role guard
- API routes check `session.user.role` before admin operations

### Stream Security

- All HLS streams require a valid **HMAC-SHA256 token** in the query string
- Tokens are time-limited (3-hour expiry)
- Token generation requires a valid, non-expired MatchPass
- MediaMTX validates tokens via HTTP auth hook on every segment request
- **Timing-safe comparison** used for token verification (prevents timing attacks)
- Publish actions (SRT ingest) allowed without authentication

### Payment Security

- Paynow webhook verified via **HMAC hash** using integration key
- Payment status polled server-side (not trusted from client)
- Phone number validated with regex pattern: `07\d{8}`
- Match pass created only after webhook confirmation
- Unique constraint prevents duplicate passes per user per match

### General

- OWASP Top 10 considered throughout
- No raw SQL — all queries go through Prisma ORM
- Input validation on all API routes
- Error messages sanitised (no stack traces in production)
- CORS configured via Next.js middleware
- Redis connections retry up to 3 times then degrade gracefully
- Environment variables for all secrets (never hardcoded)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint with Next.js recommended rules
- Tailwind CSS for styling (utility-first)
- Prisma for all database operations (no raw SQL)
- Server components by default, `"use client"` only when needed

---

## License

This project is proprietary software developed by **Zimbit Solutions** for the
**Zimbabwe Broadcasting Corporation (ZBC)**. All rights reserved.

Unauthorised copying, distribution, or modification of this software is strictly
prohibited without prior written consent from Zimbit Solutions.

---

<p align="center">
  Built with ❤️ by <strong>Zimbit Solutions</strong> — Harare, Zimbabwe
</p>
