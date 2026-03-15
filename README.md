# Nezuko

[![Web CI](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/web-ci.yml/badge.svg)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/web-ci.yml)
[![Bot CI](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/grammy-ci.yml/badge.svg)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/grammy-ci.yml)
[![CodeQL](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready Telegram membership enforcement platform built with `grammY`, `Next.js`, and `InsForge`.

Nezuko turns Telegram groups into controlled entry points for channel growth. It verifies required channel membership, restricts unverified users, supports join-request-first onboarding, and gives operators a real-time dashboard for bots, groups, channels, logs, and analytics.

## Highlights

- `grammY` bot runtime in TypeScript with standalone and multi-bot dashboard modes
- Join-request-first verification with mute-on-join fallback
- Required-channel enforcement across groups
- Re-verification and access revocation when users leave required channels
- Redis-backed caching, idempotency locks, and message-path recovery checks
- Next.js dashboard for operations, analytics, logs, bot management, and settings
- InsForge backend with PostgreSQL, realtime channels, storage, and edge functions

## Architecture

```text
                      +----------------------+
                      |   Next.js Dashboard  |
                      |      apps/web        |
                      +----------+-----------+
                                 |
                                 | @insforge/sdk
                                 v
 +----------------------+   +----+-------------------------------+
 |  grammY Bot Runtime  |   |             InsForge               |
 |    apps/grammy       |-->|  PostgreSQL + Realtime + Storage   |
 |  long polling        |   |  REST API + Socket.IO channels     |
 +----------+-----------+   +----+-------------------------------+
            |                    ^
            | Redis cache        |
            v                    |
   +-------------------+         |
   |       Redis       |---------+
   | membership/cache  |
   | idempotency/locks |
   +-------------------+
```

## Verification Flow

```text
User joins protected group
        |
        v
Bot resolves group verification contract
        |
        +--> join-request preferred?
        |       |
        |       +--> yes: verify before approval
        |       +--> no: mute on join and prompt verification
        |
        v
User joins required channel(s)
        |
        v
User taps Verify
        |
        v
Fresh membership checks run
        |
        +--> all required channels joined
        |       |
        |       +--> unmute / approve join request
        |
        +--> any channel missing
                |
                +--> keep restricted and show prompt
```

The bot also re-checks stale verified users on group messages. If Telegram misses a channel leave event, the next message still triggers revalidation and re-restriction.

## What You Get

### Bot Runtime

- Multi-channel membership verification
- Join-request approval and decline flow
- Inline verification buttons
- Channel leave detection and access revocation
- Redis membership cache with short negative TTLs
- Redis NX idempotency locks for verify, join, and enforcement paths
- Process lock protection against duplicate pollers
- Health endpoint and structured logging
- API telemetry and verification analytics persisted to InsForge

### Dashboard

- Overview and analytics
- Groups and enforced channels management
- Bot instance management
- Realtime logs
- Security and operational settings

### Backend

- InsForge PostgreSQL as the source of truth
- Realtime channels for verification, status, logs, commands, and bot instances
- Edge functions for operational workflows
- RLS-backed tables and bot-safe anon policies

## Tech Stack

### Bot

- TypeScript 5.9
- grammY 1.41
- Bun
- Node 22
- ioredis
- pino
- zod
- Socket.IO client

### Web

- Next.js 16
- React 19
- Tailwind CSS v4
- shadcn/ui
- TanStack Query v5
- Recharts
- Motion

### Backend / Infra

- InsForge
- PostgreSQL
- Redis
- Docker
- Vercel

## Project Structure

```text
nezuko/
├── apps/
│   ├── grammy/       # Telegram bot runtime
│   └── web/          # Next.js dashboard
├── insforge/
│   ├── migrations/   # SQL migrations
│   └── functions/    # Edge functions
├── tests/
│   └── grammy/       # Bot tests
├── docs/
├── memory-bank/
└── scripts/
```

## Deployment Model

Nezuko is a 2-tier system with no custom API server:

- `apps/web` deploys as the admin dashboard
- `apps/grammy` runs as the Telegram bot process
- InsForge provides database, realtime, storage, and functions
- Redis handles cache and idempotency

Typical production setup:

1. Deploy `apps/web`
2. Provision Redis
3. Apply InsForge migrations
4. Run `apps/grammy` in dashboard mode for multi-bot management, or standalone mode for a single bot

## Quick Start

### Prerequisites

- Node.js `22+` for the bot runtime
- Bun `1+`
- Docker for local Redis
- An InsForge project
- A Telegram bot token from `@BotFather`

### 1. Install dependencies

```bash
cd apps/grammy && bun install
cd ../web && bun install
```

### 2. Start Redis

```bash
docker compose -f docker-compose.local.yml up -d
```

### 3. Configure environment

Bot env: `apps/grammy/.env`

```bash
DASHBOARD_MODE=true
BOT_TOKEN=<telegram-bot-token>
INSFORGE_BASE_URL=<your-insforge-base-url>
INSFORGE_ANON_KEY=<your-insforge-anon-key>
INSFORGE_REQUEST_TIMEOUT_MS=5000
REDIS_URL=redis://localhost:6379
HEALTH_PORT=8081
LOG_LEVEL=info
```

Web env: `apps/web/.env.local`

```bash
NEXT_PUBLIC_INSFORGE_BASE_URL=<your-insforge-base-url>
NEXT_PUBLIC_INSFORGE_ANON_KEY=<your-insforge-anon-key>
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DEV_LOGIN=false
```

### 4. Apply backend schema

Use the migrations in `insforge/migrations/`.

If your live backend has not yet applied `024_verification_contract_hardening.sql`, the bot still works because it now falls back to direct table reads, but the migration should still be applied to align the backend with the preferred contract path.

### 5. Run locally

Bot:

```bash
cd apps/grammy
bun run dev
```

Web:

```bash
cd apps/web
bun dev
```

## Operating Modes

### Standalone Mode

Use one bot token directly from env.

```bash
DASHBOARD_MODE=false
BOT_TOKEN=<telegram-bot-token>
```

### Dashboard Mode

Use InsForge-managed bot instances and run multi-bot orchestration.

```bash
DASHBOARD_MODE=true
```

This mode reads active bot instances from the backend, starts them dynamically, and keeps them synced.

## Core Commands

| Command             | Context         | Purpose                        |
| ------------------- | --------------- | ------------------------------ |
| `/start`            | Private / Group | Basic entry and setup guidance |
| `/help`             | Any             | Command reference              |
| `/protect @channel` | Group admin     | Link a required channel        |
| `/unprotect`        | Group admin     | Disable protection             |
| `/status`           | Group admin     | Show protection status         |
| `/settings`         | Group admin     | View configuration             |
| `/channels`         | Group           | List linked channels           |
| `/verify`           | Group           | Manual verification helper     |
| `/stats`            | Group           | Group/channel stats            |

## Quality Gates

### Bot

```bash
cd apps/grammy
bun run type-check
bun run lint
bun run test
bun run build
```

### Web

```bash
cd apps/web
bun run type-check
bun run lint
bun run build
```

## Operational Notes

- Redis is required for best performance and duplicate-work suppression
- The bot uses process locking to prevent duplicate long-polling instances on the same machine
- The health endpoint is exposed by the bot runtime
- Verification state is enforced through both channel membership updates and message-path recovery checks
- Live backend analytics RPC `get_user_growth` still needs a backend-side fix if you rely on that chart/query

## Documentation

- [docs](docs)
- [memory-bank](memory-bank)
- [InsForge migrations](insforge/migrations)

## License

[MIT](LICENSE)
