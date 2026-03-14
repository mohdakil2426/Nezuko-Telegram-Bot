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

| Layer              | Technologies                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **Bot (grammY)**   | TypeScript 5.9, grammY v1.41.1, Bun, Node 22, bun test                     |
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
│   └── web/          # ✅ ACTIVE — Next.js Dashboard (~120 TypeScript files)
├── insforge/
│   ├── migrations/   # SQL migration files (001-025; 023_fresh_grammy_schema.sql is canonical)
│   └── functions/    # Edge Functions (manage-bot, test-webhook)
├── tests/
│   └── grammy/       # ✅ ACTIVE — grammY bot tests (163 tests passing)
├── scripts/          # Development & utility scripts
├── memory-bank/      # Project documentation
└── docs/             # Technical documentation
```

---

## Key Features

### Bot Core (grammY)

- Instant mute on group join until verified
- Multi-channel enforcement (AND logic)
- Leave detection with immediate revocation
- Interactive inline verification buttons
- Verification contract read with RPC-first, direct-table fallback
- Idempotent verification/join-request handling via Redis locks
- Channel membership cache invalidation from channel-side updates
- Message-path revalidation for stale verified users
- Delayed verification prompts: required-channel leave is silent, first blocked message prompts
- Prompt dedupe per `(groupId, userId)` to avoid repeated group spam
- Lock-loser blocked-message deletion so burst spam updates are still removed while one enforcement pass is running
- Required-channel leave now only invalidates verified state and seeds a short-lived enforcement-block cache; the first blocked message performs the visible delete/mute/prompt flow
- Single-subscription dashboard realtime coordinator with cache patching for logs/activity/bots and centralized aggregate invalidation
- Verification logging directly to InsForge PostgreSQL
- Status writer (heartbeat via DB UPSERT every 30s)
- Command worker (polls admin_commands table; realtime via Socket.IO)
- Security Vault (AES-256-GCM encryption key management via nezuko_secrets)
- Member/subscriber count sync every 15min
- Link counter maintenance (linked_channels_count / linked_groups_count)
- Redis L1 cache (`nezuko:v2:` key prefix)
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

## Quality Standards

| Tool          | Target       | App                        |
| ------------- | ------------ | -------------------------- |
| ESLint        | 0 warnings   | grammy + web               |
| TypeScript    | 0 errors     | grammy + web               |
| Prettier      | All clean    | grammy + web               |
| bun test      | 163/163 pass | grammy                     |
| Next.js Build | 0 errors     | web (PPR + React Compiler) |

---

_Last Updated: 2026-03-11 (Phase 126 — PTB bot fully removed; grammY is the sole runtime)_
