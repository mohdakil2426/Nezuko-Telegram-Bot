# Project Brief: Nezuko Telegram Bot Platform

## Overview

Nezuko is a **production-ready Telegram bot platform** for automated channel membership enforcement. It enables community managers to automatically require users to join specified channels before participating in groups.

## Core Purpose

Convert group participants into channel subscribers through automated verification, providing:

- Join-request-first verification preference with mute-on-join fallback
- Instant membership enforcement on group join
- Multi-channel subscription requirements
- Real-time verification with inline buttons
- Administrative dashboard for monitoring

---

## Active Tech Stack

> **The canonical bot runtime is `apps/grammy/` (TypeScript + grammY). The Python PTB bot (`apps/bot/`) is archived and no longer maintained as of Phase 96.**

| Layer              | Technologies                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **Bot (grammY)**   | TypeScript 5.9, grammY v1.41.1, Bun, Node 22, Vitest                       |
| **Web**            | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui                   |
| **Backend (BaaS)** | InsForge (managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions) |
| **Database**       | InsForge Managed PostgreSQL (cloud)                                        |
| **Auth**           | InsForge Auth (email/password + OAuth), RLS on all tables                  |
| **Infrastructure** | Docker (bot), Caddy, Vercel (web)                                          |

> **Architecture**: 2-tier (Web → InsForge BaaS + Bot → InsForge REST API). No custom API server.

---

## Workspace Structure

```
nezuko/
├── apps/
│   ├── grammy/       # ✅ ACTIVE — Telegram Bot (TypeScript / grammY)
│   │   └── src/      # Active source tree: core, composers, middleware, services, database, utils
│   ├── bot/          # 🗄️ ARCHIVED — Python PTB bot (unmaintained since Phase 96)
│   └── web/          # ✅ ACTIVE — Next.js Dashboard (~120 TypeScript files)
├── insforge/
│   ├── migrations/   # SQL migration files (001-023; 023_fresh_grammy_schema.sql is canonical)
│   └── functions/    # Edge Functions (manage-bot, test-webhook)
├── tests/
│   ├── grammy/       # ✅ ACTIVE — grammY bot tests (127 tests passing)
│   └── bot/          # 🗄️ ARCHIVED — Python PTB tests (retained for historical reference only)
├── scripts/          # Development & utility scripts
├── memory-bank/      # Project documentation
└── docs/             # Technical documentation
```

---

## Key Features

### Bot Core (grammY — Active)

- Instant mute on group join until verified
- Multi-channel enforcement (AND logic)
- Leave detection with immediate revocation
- Interactive inline verification buttons
- Verification contract read with RPC-first, direct-table fallback
- Idempotent verification/join-request handling via Redis locks
- Channel membership cache invalidation from channel-side updates
- Message-path revalidation for stale verified users
- Verification logging directly to InsForge PostgreSQL
- Status writer (heartbeat via DB UPSERT every 30s)
- Command worker (polls admin_commands table; realtime via Socket.IO)
- Security Vault (AES-256-GCM encryption key management via nezuko_secrets)
- Member/subscriber count sync every 15min
- Link counter maintenance (linked_channels_count / linked_groups_count)
- Redis L1 cache (`nezuko:v2:` key prefix — avoids conflict with legacy Python keys)
- Multi-bot dashboard mode via BotManager + BotLifecycleManager + BotRegistry
- **DB log transport** (`db-log-transport.ts`): WARN+ pino logs streamed to `admin_logs` table in real-time
- **API call telemetry** (`apiLogTransformer`): every Telegram API call logged to `api_call_log` with latency
- Owner auto-upsert before group create (FK-safe `upsertOwner()` in `owner.repo.ts`)

### Web Dashboard

- 10 pages (dashboard, analytics, groups, channels, bots, logs, settings)
- 70+ React components (shadcn/ui based)
- TanStack Query for data fetching
- Real-time updates via InsForge WebSocket
- Dark/Light mode theming
- Direct InsForge SDK queries
- Responsive charts (shadcn/ui ChartContainer + Recharts)

### InsForge Backend

- 12 database tables with proper indexes
- 15 PostgreSQL RPC functions for analytics/charts
- 5 realtime triggers (verification, bot_status, commands, logs, bot_instances)
- 2 storage buckets (bot-exports private, bot-assets public)
- Edge Functions for bot token management (AES-256-GCM) and webhook testing
- Canonical migration: `023_fresh_grammy_schema.sql`

---

## Legacy: Python PTB Bot (`apps/bot/`)

> **Status: ARCHIVED — no longer maintained or developed.**
> The codebase is preserved for historical reference. Do NOT use it as the basis for new bot work.

The original Python bot used `python-telegram-bot v22.6` with asyncio. It was fully replaced by the grammY TypeScript bot in **Phase 96** (2026). The InsForge backend (DB schema, tables, RLS policies) is shared and has been migrated to `023_fresh_grammy_schema.sql` as the single source of truth for both bots' era.

---

## Quality Standards

| Tool          | Target       | App          |
| ------------- | ------------ | ------------ |
| ESLint        | 0 warnings   | grammy + web |
| TypeScript    | 0 errors     | grammy + web |
| Prettier      | All clean    | grammy + web |
| Vitest        | 139/139 pass | grammy       |
| Next.js Build | 0 errors     | web          |

---

_Last Updated: 2026-03-07 (Phase 110 — live verification recovery documented)_
