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
11. [Real-Time WebSocket System](#real-time-websocket-system)
12. [ZPLS — Zimbabwe Premier Soccer League Data](#zpls--zimbabwe-premier-soccer-league-data)
13. [Analytics & Personalisation](#analytics--personalisation)
14. [Information Required from ZBC](#information-required-from-zbc)
15. [Information Required from Zimbit Solutions](#information-required-from-zimbit-solutions)
16. [Information Required from Paynow / EcoCash](#information-required-from-paynow--ecocash)
17. [Information Required from LiveScore API (ZPLS)](#information-required-from-livescore-api-zpls)
18. [Admin Dashboard](#admin-dashboard)
19. [EPG (Electronic Programme Guide)](#epg-electronic-programme-guide)
20. [API Reference](#api-reference)
21. [Testing](#testing)
22. [Docker Deployment](#docker-deployment)
23. [Scripts & Tooling](#scripts--tooling)
24. [Security](#security)
25. [Redis Cache Reference](#redis-cache-reference)
26. [Contributing](#contributing)
27. [License](#license)

---

## Project Overview

| Feature               | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| **Live TV (ZTV)**     | Free-to-air ZBC Television restreamed via HLS                     |
| **Sports PPV**        | Pay-per-match Zimbabwe PSL football streams                       |
| **EcoCash Payments**  | USSD-based mobile money via Paynow `sendMobile()` API             |
| **Paynow Web**        | Browser-redirect card/wallet payments via Paynow `send()` API     |
| **Admin Dashboard**   | Full CRUD for matches, programs (EPG), users, payments, analytics ||
| **Real-time Viewers** | Redis sorted-set heartbeat counter showing live viewer counts     |
| **Adaptive Bitrate**  | 1080p / 720p / 480p / 360p HLS variants via FFmpeg transcoding    |
| **Low-Latency HLS**   | Sub-2-second latency using MediaMTX LL-HLS with 1s segments       |
| **Auth System**       | Email/password with email verification, forgot/reset password     |
| **Profile System**    | User profiles with avatar, phone, interests, notification prefs   |
| **EPG**               | Electronic Programme Guide with category icons and live indicators|
| **WebSockets**        | Real-time EPG + match updates via Redis Pub/Sub + WS broadcast    |
| **ZPLS Integration**  | Live scores, fixtures, standings from LiveScore API               |
| **Analytics**         | Viewing heatmaps, category breakdowns, personalised insights      |
| **Program Templates** | Recurring schedule templates with bulk program generation         |
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
│  ├── /api/zpls/*         — ZPLS live scores, fixtures, standings     │
│  ├── /api/user/*         — Profile, passes, analytics, insights      │
│  ├── /api/activity       — Viewing activity tracking                 │
│  └── /api/admin/*        — Stats, analytics, users, payments (admin) │
│                                                                      │
│  Custom Server (server.ts via tsx)                                    │
│  ├── WebSocket (/ws)     — Real-time EPG + match push via Redis PubSub│
│  └── EPG Scheduler       — Program-boundary timer for auto-push      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│   PostgreSQL 16     │     │        Redis 7              │
│                     │     │                             │
│ • Users             │     │ • API response cache (60s)  │
│ • Matches           │     │ • Viewer count sorted sets  │
│ • MatchPasses       │     │ • Pub/Sub (EPG + matches)   │
│ • Payments          │     │ • ZPLS data cache           │
│ • Programs (EPG)    │     │ • User insight cache        │
│ • ProgramTemplates  │     │ • Team logo validation      │
│ • ViewingActivity   │     │                             │
└─────────────────────┘     └─────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────┐
│           Paynow Payment Gateway                │
│                                                 │
│  EcoCash (sendMobile) ←→ USSD prompt on phone   │
│  Paynow Web (send)    ←→ Browser redirect       │
│  Webhook              → POST /api/payments/webhook│
│  Return URL           → /payment/success         │
└─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│        LiveScore API (livescore-api.com)         │
│                                                 │
│  Fixtures   → ZPLS match schedule               │
│  Live Scores → In-play match data               │
│  History    → Completed match results           │
│  Standings  → League table (W/D/L/Pts)          │
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
| **Cache**      | Redis (ioredis)               | 7 / 5.10  | API caching + viewer counters + Pub/Sub   |
| **WebSocket**  | ws                            | 8.20.0    | Real-time server push to browsers         |
| **Auth**       | NextAuth.js v5 (beta)         | 5.0.0-β30 | JWT credentials authentication            |
| **Payments**   | Paynow SDK                    | 2.2.2     | EcoCash + web payments                    |
| **Sports Data**| LiveScore API                 | —         | ZPLS fixtures, live scores, standings     |
| **Streaming**  | MediaMTX                      | 1.17.0    | SRT ingest → HLS delivery                 |
| **Player**     | video.js                      | 8.23.7    | HLS playback in browser                   |
| **UI**         | shadcn/ui + Tailwind CSS 4    | Latest    | Component library + utility CSS           |
| **Charts**     | Chart.js + react-chartjs-2    | 4.5 / 5.3 | Doughnut, area, radar analytics charts    |
| **Animations** | Framer Motion                 | 12.38.0   | Page transitions + micro-animations       |
| **Icons**      | Lucide React                  | 1.7.0     | Consistent icon system                    |
| **Email**      | Nodemailer                    | 7.0.13    | Verification + password reset emails      |
| **Toasts**     | Sonner                        | 2.0.7     | User notifications                        |
| **Testing**    | Vitest + Testcontainers       | 4.1.2     | Unit + integration testing                |
| **Container**  | Docker + Docker Compose       | —         | Production deployment                     |
| **Transcoding**| FFmpeg                        | —         | Adaptive bitrate encoding                 |
| **Entry**      | tsx + cross-env               | 4.21 / 10 | Custom server runner + env portability     |

---

## Directory Structure

```
ZimCast/
├── server.ts                   # Custom HTTP + WebSocket entry point (tsx)
├── docker-compose.yml          # Full stack: app + db + redis + mediamtx
├── Dockerfile                  # Multi-stage Next.js production build
├── docker/
│   └── Dockerfile.mediamtx     # MediaMTX + FFmpeg image
├── mediamtx/
│   └── mediamtx.yml            # MediaMTX configuration (SRT→HLS, auth hook)
├── prisma/
│   ├── schema.prisma           # Database schema (7 models, 5 enums)
│   └── seed.ts                 # Admin user + sample matches
├── scripts/
│   └── transcode.sh            # FFmpeg ABR transcoding (4 quality levels)
├── src/
│   ├── proxy.ts                # Next.js auth middleware (route protection)
│   ├── app/
│   │   ├── globals.css         # Tailwind + custom CSS variables + keyframes
│   │   ├── layout.tsx          # Root layout with SessionProvider + Toaster
│   │   │
│   │   ├── (app)/              # Public route group (Navbar + Footer)
│   │   │   ├── page.tsx        # Landing page (hero, features, how-it-works, match sim)
│   │   │   ├── live-tv/        # ZTV live stream + EPG
│   │   │   ├── sports/         # Match listings + ZPLS fixtures + standings
│   │   │   │   └── [id]/       # Match detail + payment flow + live score
│   │   │   ├── watch/
│   │   │   │   └── [id]/       # Stream viewer (post-payment)
│   │   │   ├── payment/
│   │   │   │   └── success/    # Paynow return page
│   │   │   ├── profile/        # User settings + analytics + viewing history
│   │   │   └── analytics/      # Full viewing analytics dashboard
│   │   │
│   │   ├── (admin)/            # Admin route group (separate layout)
│   │   │   └── admin/
│   │   │       ├── page.tsx    # Overview: KPIs + recent payments
│   │   │       ├── analytics/  # Admin analytics with demographic filters
│   │   │       ├── matches/    # Match CRUD (with ZPLS fixture import)
│   │   │       ├── programs/   # EPG CRUD
│   │   │       ├── templates/  # Recurring schedule templates
│   │   │       ├── users/      # User management
│   │   │       └── payments/   # Payment log with filters
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
│   │       ├── streams/        # Token gen + auth hook + viewers + ZTV
│   │       ├── programs/       # EPG data
│   │       ├── epg/            # EPG summary (WebSocket-published)
│   │       ├── zpls/           # ZPLS fixtures, live, history, standings
│   │       ├── activity/       # Viewing activity tracking
│   │       ├── user/           # Profile, passes, analytics, insights
│   │       ├── admin/          # Stats, analytics, users, payments, templates
│   │       └── health/         # Health check endpoint
│   │
│   ├── components/             # Reusable React components
│   │   ├── ui/                 # shadcn/ui primitives (button, card, etc.)
│   │   ├── analytics/          # Stats cards, heatmap, category chart
│   │   ├── charts/             # Doughnut, area, radar chart wrappers
│   │   ├── video-player.tsx    # video.js HLS player wrapper
│   │   ├── match-simulation.tsx# Interactive SVG pitch animation (1992 AFCON)
│   │   ├── stream-controls.tsx # Viewer count + quality + share
│   │   ├── sports-hero.tsx     # Featured match hero banner
│   │   ├── match-card.tsx      # VS-style match card
│   │   ├── match-filters.tsx   # Animated filter tabs
│   │   ├── empty-matches.tsx   # Filter-aware empty states
│   │   ├── navbar.tsx          # App nav bar (WebSocket EPG updates)
│   │   ├── epg-strip.tsx       # Horizontal EPG timeline
│   │   ├── epg-full-schedule.tsx # Accordion EPG day view
│   │   ├── blackout-countdown.tsx # ZTV blackout timer
│   │   ├── now-playing.tsx     # Current programme display
│   │   ├── up-next.tsx         # Upcoming programme card
│   │   ├── off-air-screen.tsx  # Off-air state component
│   │   ├── recommendations.tsx # Personalised content suggestions
│   │   ├── admin-tabs.tsx      # Admin dashboard tabs
│   │   └── ...                 # Footer, team logos, profile avatar, etc.
│   │
│   ├── hooks/
│   │   ├── use-zimcast-socket.ts # WebSocket client hook (singleton)
│   │   ├── use-viewer-count.ts   # Heartbeat-based viewer counter
│   │   └── use-track-activity.ts # Viewing activity tracker
│   │
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── paynow.ts           # Paynow SDK wrapper (typed)
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── redis.ts            # Redis client singleton
│   │   ├── redis-pubsub.ts     # Dedicated Pub/Sub ioredis clients
│   │   ├── ws-server.ts        # WebSocket server (broadcast + keepalive)
│   │   ├── epg-scheduler.ts    # Program-boundary timer (auto-push EPG)
│   │   ├── zpls.ts             # LiveScore API client (ZPLS data)
│   │   ├── insights.ts         # Personalised viewing insight generator
│   │   ├── tokens.ts           # HMAC stream token generation
│   │   ├── api.ts              # Client-side fetch wrapper
│   │   ├── avatar.ts           # Avatar generation from user data
│   │   ├── mail.ts             # SMTP email helpers
│   │   ├── match-program.ts    # Match ↔ Program linking
│   │   ├── match-window.ts     # Match lifecycle phase logic
│   │   ├── utils.ts            # General utilities
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
        ├── avatar.test.ts      # Avatar generation tests
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

### Schema Overview (7 Models)

| Model              | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| **User**           | Registered viewers and admins                     |
| **Match**          | Football matches with stream key and pricing      |
| **MatchPass**      | Time-limited access passes (userId + matchId)     |
| **Payment**        | Payment records with provider, status, poll URL   |
| **Program**        | EPG entries (title, category, time, channel)      |
| **ProgramTemplate**| Recurring schedule templates for bulk generation  |
| **ViewingActivity**| Analytics: what users watch, for how long         |

### Enums

| Enum                | Values                                                |
| ------------------- | ----------------------------------------------------- |
| `Role`              | `USER`, `ADMIN`                                       |
| `PaymentProvider`   | `ECOCASH`, `PAYNOW`                                  |
| `PaymentStatus`     | `PENDING`, `COMPLETED`, `FAILED`                      |
| `ProgramCategory`   | `NEWS`, `SPORTS`, `ENTERTAINMENT`, `MUSIC`, `DOCUMENTARY`, `GAMING`, `TRAVEL`, `FOOD`, `TECH`, `FASHION`, `FITNESS`, `ART` |
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

## Real-Time WebSocket System

ZimCast uses a **custom HTTP + WebSocket server** (`server.ts`) to push real-time
updates to all connected browsers without polling.

### Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌────────────────────┐
│  Admin Mutation   │     │  EPG Scheduler  │     │  Next.js API Route │
│  (POST/PATCH/DEL) │     │  (setTimeout)   │     │  (/api/epg/summary)│
└────────┬─────────┘     └────────┬────────┘     └────────┬───────────┘
         │                        │                       │
         ▼                        ▼                       ▼
    redisPub.publish("zimcast:epg" | "zimcast:matches", JSON)
                        │
                        ▼
              ┌──────────────────┐
              │   redisSub       │
              │   (subscriber)   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   ws-server.ts   │──── broadcast to all OPEN clients
              │   (/ws endpoint) │
              └──────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Browser 1    Browser 2    Browser N
      (navbar)     (sports)     (live-tv)
```

### Components

| File                  | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `server.ts`           | Custom Node HTTP server, attaches WS + starts EPG scheduler  |
| `src/lib/ws-server.ts`| WebSocket manager — upgrade handler, broadcast, keepalive    |
| `src/lib/redis-pubsub.ts` | Dedicated publish/subscribe ioredis clients             |
| `src/lib/epg-scheduler.ts`| Program-boundary timer — pushes EPG at exact transitions|
| `src/hooks/use-zimcast-socket.ts` | Client-side singleton WS hook with topic routing |

### Message Types

| Redis Channel      | Message Type   | Data Payload               | Consumers               |
| ------------------ | -------------- | -------------------------- | ------------------------ |
| `zimcast:epg`      | `epg:update`   | Full EPG summary object    | Navbar, Live TV page     |
| `zimcast:matches`  | `match:update`  | `{}` (client re-fetches)  | Sports page              |

### How It Works

1. **Custom server** (`server.ts`) creates an HTTP server, passes it to Next.js for
   request handling, then attaches a WebSocket upgrade handler on `/ws`
2. **EPG Scheduler** queries the database for the current and next programme,
   computes the exact time until the next programme boundary, and sets a
   `setTimeout` for that moment + 500 ms buffer
3. At each boundary, the scheduler builds a summary, writes it to Redis cache,
   and publishes to `zimcast:epg` — the WS server broadcasts it to all clients
4. **Admin mutations** (creating/editing/deleting matches or programmes) publish
   update messages so all viewers see changes within milliseconds
5. **Client hook** (`useZimcastSocket`) maintains a module-level singleton WebSocket
   with exponential-backoff reconnection (1 s → 30 s cap) and topic-based routing

### Connection Health

- **Ping/pong keepalive:** Server pings every 30 s, terminates clients that fail
  to respond within 5 s
- **HMR compatibility:** Upgrade handler passes through all non-`/ws` upgrades
  (e.g. `/_next/webpack-hmr`) so Next.js hot-reload continues to work in dev

### Running the Server

```bash
# Development (with hot-reload)
npm run dev

# Production (serves pre-built .next/)
npm run build
npm start
```

Both commands run `tsx --env-file=.env server.ts`. The `start` script adds
`cross-env NODE_ENV=production` to enable production mode.

---

## ZPLS — Zimbabwe Premier Soccer League Data

ZimCast integrates with the **LiveScore API** (`livescore-api.com`) to provide
real-time ZPLS data including fixtures, live scores, match history, and league standings.

### Data Sources

| Function          | External Endpoint                | Cache Key              | Cache TTL  |
| ----------------- | -------------------------------- | ---------------------- | ---------- |
| `getFixtures()`   | `fixtures/list.json`             | `zpls:fixtures:{page}` | 5 minutes  |
| `getLiveMatches()` | `scores/live.json`              | `zpls:live`            | 30 seconds |
| `getHistory()`    | `scores/history.json`            | `zpls:history:{page}`  | 5 minutes  |
| `getStandings()`  | `leagues/table.json`             | `zpls:standings`       | 15 minutes |

### Features

- **Team logo validation** — HEAD-requests logo URLs to verify they are valid images,
  caches results in Redis hash `zpls:team-logos` (24-hour TTL). Detects CDN 404
  placeholders where a PNG URL returns SVG content-type.
- **Fixture score lookup** — `getFixtureScore(fixtureId)` tries live scores first,
  falls back to history for completed matches.
- **Admin match import** — When creating matches in the admin dashboard, fixtures
  from the ZPLS API can be imported directly, pre-filling team names, kickoff times,
  and linking `zplsFixtureId` for live score display on the match detail page.
- **Debug endpoint** — `/api/zpls/debug` probes all 4 LiveScore endpoints with
  timing information and credential validation.

### Procurement Note

Zimbit Solutions must procure a **LiveScore API subscription** from
https://livescore-api.com with access to:
- Competition ID `85` (Zimbabwe Premier Soccer League)
- Endpoints: `fixtures/list`, `scores/live`, `scores/history`, `leagues/table`

---

## Analytics & Personalisation

### Viewing Activity Tracking

The client-side hook `use-track-activity.ts` accumulates watch time in 1-second
ticks and flushes to the server every 30 seconds. The minimum threshold is 5 seconds
to avoid recording incidental views.

### User Analytics (`/api/user/analytics`)

Returns a full viewing profile for the authenticated user:

| Metric               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `totalWatchTime`     | Total seconds watched across all content                 |
| `favoriteCategory`   | Most-watched programme category                          |
| `categoryBreakdown`  | Category → seconds mapping                               |
| `topPrograms`        | Top 5 programmes by watch time                           |
| `engagementScore`    | 0–100 score (target: 20 hours/month = 100)               |
| `weeklyHeatmap`      | 7×24 matrix of viewing minutes (day × hour)              |
| `peakTime`           | Hour with most viewing activity                          |
| `totalMatches`       | Unique live matches watched                              |
| `recentActivity`     | Last 10 distinct programmes/matches with durations       |
| `insights`           | Human-readable insight strings (see below)               |

### Personalised Insights

The `insights.ts` module generates contextual messages such as:

- *"You watch mostly sports content (62%)"*
- *"Your peak viewing time is 20:00 — you're an evening viewer"*
- *"You've watched 5 live matches this month"*
- *"Try documentary — expand your viewing horizons!"*

The navbar ticker (`/api/user/insight`) shows time-of-day personalised messages:
*"You usually watch Sports at this time."* — cached per user per hour (10-minute TTL).

### Admin Analytics (`/api/admin/analytics`)

Platform-wide analytics with demographic filters (category, interest, city, gender,
date range):

- Category breakdown + weekly heatmap + peak hour
- User growth timeline (daily, last 30 days)
- Revenue timeline (daily, last 30 days)
- Active viewers (unique in last 7 days)
- Interest distribution + demographic breakdown (by city, by gender)
- Top 10 programmes by watch time
- Average session duration

### Chart Components

| Component        | Library   | Used For                                  |
| ---------------- | --------- | ----------------------------------------- |
| Doughnut chart   | Chart.js  | Category breakdown with interactive legend|
| Area chart       | Chart.js  | User growth and revenue timelines         |
| Radar chart      | Chart.js  | Interest distribution                     |
| Heatmap          | Custom    | 7×24 viewing intensity grid               |
| Stats card       | Custom    | Animated count-up KPI cards               |

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

## Information Required from LiveScore API (ZPLS)

ZimCast requires a **LiveScore API** subscription to display real-time Zimbabwe
Premier Soccer League data. This is a **paid third-party service** that Zimbit
Solutions must procure before launch.

### 1. API Subscription

Register at https://livescore-api.com and purchase a plan that includes:

| Requirement              | Details                                              |
| ------------------------ | ---------------------------------------------------- |
| **Competition coverage** | Competition ID `85` — Zimbabwe Premier Soccer League |
| **Endpoints needed**     | `fixtures/list`, `scores/live`, `scores/history`, `leagues/table` |
| **Rate limits**          | Sufficient for ~1 request/30 seconds during live matches |
| **Data format**          | JSON REST API                                        |

### 2. Credentials

| Credential              | Where to Find                                      |
| ------------------------ | -------------------------------------------------- |
| **API Key**              | LiveScore Dashboard → API Settings                 |
| **API Secret**           | LiveScore Dashboard → API Settings                 |

### 3. Environment Variables

```env
LIVESCORE_API_KEY="<from-livescore-dashboard>"
LIVESCORE_API_SECRET="<from-livescore-dashboard>"
```

### 4. What ZimCast Uses This Data For

| Feature               | Data Source              | User Impact                        |
| --------------------- | ------------------------ | ---------------------------------- |
| Fixture schedule      | `fixtures/list`          | Upcoming match listings on Sports  |
| Live match scores     | `scores/live`            | Real-time score on match detail    |
| Match history         | `scores/history`         | Past results on Sports page        |
| League standings      | `leagues/table`          | Full league table (W/D/L/Pts)      |
| Team logos            | CDN URLs in API response | Team badges on match cards         |
| Admin match import    | `fixtures/list`          | Pre-fill match form from fixture   |

### 5. Fallback Behaviour

If the LiveScore API is unavailable or credentials are not configured:
- ZPLS sections on the Sports page display empty states
- Match detail pages show team names without live scores
- Admin match creation works normally (manual entry instead of import)
- Core functionality (streaming, payments, EPG) is unaffected

---

## Admin Dashboard

The admin dashboard is accessible at `/admin` and requires `role: "ADMIN"`.

### Tabs

| Tab           | Route              | Features                                          |
| ------------- | ------------------ | ------------------------------------------------- |
| **Overview**  | `/admin`           | KPI cards (revenue, users, matches, programmes, blackouts, templates), category breakdown, pending payments alert, recent payments |
| **Analytics** | `/admin/analytics` | Viewing heatmap, category chart, user growth, revenue timeline, interest radar, demographics, top programmes — with filters (category, city, gender, interest, date range) |
| **Matches**   | `/admin/matches`   | Create, edit, toggle live, delete matches. ZPLS fixture import. Phase badges (upcoming/pregame/live/postgame/ended) |
| **Programs**  | `/admin/programs`  | EPG management with date filter, blackout toggle, match linking, overlap detection |
| **Templates** | `/admin/templates` | Recurring schedule templates with day-of-week picker, start time, duration. Generate programmes from template for a date range (max 60 days) |
| **Users**     | `/admin/users`     | Paginated user list with search. Detail view with passes, payments, watch stats. Toggle active/deactivate. Role management |
| **Payments**  | `/admin/payments`  | Paginated payment log with filters (status, provider, city, gender, date range). Summary stats (revenue, avg payment, provider split) |

### Admin API Routes

| Method   | Route                               | Purpose                              |
| -------- | ----------------------------------- | ------------------------------------ |
| `GET`    | `/api/admin/stats`                  | Dashboard KPIs + recent payments     |
| `GET`    | `/api/admin/analytics`              | Full analytics with demographic filters |
| `GET`    | `/api/admin/matches`                | List all matches                     |
| `POST`   | `/api/admin/matches`                | Create match (auto-creates linked SPORTS programme) |
| `PATCH`  | `/api/admin/matches/[id]`           | Update match (syncs linked programme)|
| `DELETE` | `/api/admin/matches/[id]`           | Delete match + cascade               |
| `GET`    | `/api/admin/programs`               | List programmes (with date filter)   |
| `POST`   | `/api/admin/programs`               | Create programme (with overlap check)|
| `PATCH`  | `/api/admin/programs/[id]`          | Update programme                     |
| `DELETE` | `/api/admin/programs/[id]`          | Delete programme                     |
| `POST`   | `/api/admin/programs/bulk`          | Bulk programme creation              |
| `POST`   | `/api/admin/programs/import`        | Import programmes                    |
| `GET`    | `/api/admin/templates`              | List programme templates             |
| `POST`   | `/api/admin/templates`              | Create template                      |
| `PATCH`  | `/api/admin/templates/[id]`         | Update template                      |
| `DELETE` | `/api/admin/templates/[id]`         | Delete template                      |
| `POST`   | `/api/admin/templates/[id]/generate`| Generate programmes for date range   |
| `GET`    | `/api/admin/users`                  | List users (with search + filters)   |
| `PATCH`  | `/api/admin/users/[id]`             | Toggle role or active status         |
| `GET`    | `/api/admin/payments`               | List payments (with filters + summary)|

---

## EPG (Electronic Programme Guide)

### How EPG Works in ZimCast

1. **Admin creates programmes** via `/admin/programs`, templates, or API
2. Programmes have: `title`, `category`, `channel`, `startTime`, `endTime`, `blackout`
3. Sports programmes can be **linked to a Match** for "Watch Now" CTAs
4. **Blackout programmes** disable the ZTV stream during that time window (e.g. for
   exclusive broadcast rights) — the Live TV page shows a countdown instead
5. The **EPG Scheduler** (`epg-scheduler.ts`) pushes updates to all browsers via
   WebSocket at exact programme boundaries — no polling required
6. The Live TV page shows:
   - **EPG Strip** — horizontal timeline of current/upcoming programmes
   - **Full Schedule** — expandable accordion day view grouped by time
   - **Category icons** — 12 categories with unique icons + colour coding
7. The Sports page shows a "Today on ZimCast" section with sports-category EPG

### Programme Templates

Admins can create **recurring templates** (e.g. "ZTV News at 8" every weekday)
and generate programmes in bulk for a date range (up to 60 days). Templates store:

- `name`, `title`, `category`, `channel`
- `startHour` (0–23), `startMinute`, `durationMin`
- `daysOfWeek[]` (0=Sun, 1=Mon, ... 6=Sat)
- `blackout` flag, `isActive` toggle

### EPG API

| Method   | Route                        | Purpose                              |
| -------- | ---------------------------- | ------------------------------------ |
| `GET`    | `/api/programs`              | List today's programmes              |
| `GET`    | `/api/epg/summary`           | Current/next programme + blackout status (WebSocket-published) |
| `POST`   | `/api/admin/programs`        | Create programme (admin)             |
| `PATCH`  | `/api/admin/programs/[id]`   | Update programme (admin)             |
| `DELETE` | `/api/admin/programs/[id]`   | Delete programme (admin)             |
| `POST`   | `/api/admin/programs/bulk`   | Bulk create programmes (admin)       |

### Categories (12)

| Category        | Icon    | Use Case                              |
| --------------- | ------- | ------------------------------------- |
| `NEWS`          | 📰      | ZTV News, current affairs             |
| `SPORTS`        | ⚽      | PSL matches, sports shows             |
| `ENTERTAINMENT` | 🎬      | Dramas, movies, reality TV            |
| `MUSIC`         | 🎵      | Music shows, concerts                 |
| `DOCUMENTARY`   | 📚      | Documentaries                         |
| `GAMING`        | 🎮      | Gaming content                        |
| `TRAVEL`        | ✈️      | Travel shows                          |
| `FOOD`          | 🍳      | Cooking, food shows                   |
| `TECH`          | 💻      | Technology content                    |
| `FASHION`       | 👗      | Fashion, lifestyle                    |
| `FITNESS`       | 🏋️      | Fitness, wellness                     |
| `ART`           | 🎨      | Arts, culture                         |

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
| `GET`  | `/api/matches`                 | None     | List matches (`?date=&status=`)     |
| `GET`  | `/api/matches/[id]`            | None     | Single match details                |
| `GET`  | `/api/programs`                | None     | Today's EPG (`?date=`)              |
| `GET`  | `/api/epg/summary`             | None     | Current/next programme + blackout   |
| `GET`  | `/api/zpls/fixtures`           | None     | ZPLS fixtures (`?page=N`)           |
| `GET`  | `/api/zpls/live`               | None     | ZPLS live match scores              |
| `GET`  | `/api/zpls/history`            | None     | ZPLS match history (`?page=N`)      |
| `GET`  | `/api/zpls/standings`          | None     | ZPLS league table                   |
| `GET`  | `/api/zpls/debug`              | None     | ZPLS API diagnostics                |
| `GET`  | `/api/streams/ztv/status`      | None     | ZTV stream availability             |

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
| `GET`    | `/api/user/analytics`          | User     | Viewing analytics dashboard data  |
| `GET`    | `/api/user/insight`            | User     | Personalised time-of-day insight  |
| `POST`   | `/api/activity`                | User     | Record viewing activity           |

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

| Script           | Command                                                      |
| ---------------- | ------------------------------------------------------------ |
| `dev`            | `tsx --env-file=.env server.ts` — dev server with HMR         |
| `build`          | `prisma generate && next build --webpack` — production build  |
| `start`          | `cross-env NODE_ENV=production tsx --env-file=.env server.ts` |
| `lint`           | Run ESLint                                                   |
| `test`           | Run Vitest test suite                                        |
| `test:watch`     | Run Vitest in watch mode                                     |
| `test:coverage`  | Run tests with coverage report                               |
| `db:migrate`     | Run Prisma migrations                                        |
| `db:push`        | Push schema without migration                                |
| `db:seed`        | Seed database with initial data                              |
| `db:studio`      | Open Prisma Studio (visual DB browser)                       |
| `redis:start`    | Start local Redis server (Windows)                           |
| `redis:stop`     | Stop local Redis server                                      |
| `redis:ping`     | Ping Redis to check connectivity                             |

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

## Redis Cache Reference

| Key Pattern                   | TTL         | Source                               |
| ----------------------------- | ----------- | ------------------------------------ |
| `epg:summary:ZBCTV`           | 30 s        | EPG scheduler + `/api/epg/summary`   |
| `programs:{YYYY-MM-DD}`       | 60 s        | `/api/programs`                      |
| `matches:{date}:{status}`     | 30 s        | `/api/matches`                       |
| `viewers:{channel}`           | 90 s        | Sorted set (auto-expire)             |
| `zpls:fixtures:{page}`        | 5 min       | `/api/zpls/fixtures`                 |
| `zpls:live`                   | 30 s        | `/api/zpls/live`                     |
| `zpls:history:{page}`         | 5 min       | `/api/zpls/history`                  |
| `zpls:standings`              | 15 min      | `/api/zpls/standings`                |
| `zpls:team-logos`             | 24 h        | Redis hash — validated logo URLs     |
| `user:{id}:insight:{hour}`    | 10 min      | `/api/user/insight`                  |

### Pub/Sub Channels

| Channel            | Message Type   | Published By                          |
| ------------------ | -------------- | ------------------------------------- |
| `zimcast:epg`      | `epg:update`   | EPG scheduler, EPG summary route, admin programme mutations |
| `zimcast:matches`  | `match:update` | Admin match mutations                 |

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
