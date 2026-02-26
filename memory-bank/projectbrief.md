# Project Brief: Nezuko Telegram Bot Platform

## Overview

Nezuko is a **production-ready Telegram bot platform** for automated channel membership enforcement. It enables community managers to automatically require users to join specified channels before participating in groups.

## Core Purpose

Convert group participants into channel subscribers through automated verification, providing:

- Instant membership enforcement on group join
- Multi-channel subscription requirements
- Real-time verification with inline buttons
- Administrative dashboard for monitoring

---

## Tech Stack

| Layer              | Technologies                                             |
| ------------------ | -------------------------------------------------------- |
| **Bot**            | Python 3.13, python-telegram-bot v22.6, AsyncIO          |
| **Web**            | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Backend (BaaS)** | InsForge (managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions) |
| **Database**       | InsForge Managed PostgreSQL (cloud)                      |
| **Auth**           | None (development mode, direct access)                   |
| **Infrastructure** | Docker (bot only), Caddy                                 |

> **Architecture**: 2-tier (Web → InsForge BaaS + Bot → InsForge PostgreSQL). The `apps/api/` layer has been fully removed.

---

## Workspace Structure

```
nezuko/
├── apps/
│   ├── bot/          # Telegram Bot (~25 Python files)
│   └── web/          # Next.js Dashboard (~120 TypeScript files)
├── insforge/         # InsForge migration files & Edge Functions
│   ├── migrations/   # SQL migration files (001-010)
│   └── functions/    # Edge Functions (manage-bot, test-webhook)
├── config/           # Docker, Caddy, deployment configs
├── tests/            # Centralized test suite
├── scripts/          # Development & utility scripts
├── apps/bot/logs/    # Bot instance logs (gitignored)
├── memory-bank/      # Project documentation
└── docs/             # Technical documentation
```

---

## Key Features

### Bot Core

- Instant mute on group join until verified
- Multi-channel enforcement (AND logic)
- Leave detection with immediate revocation
- Interactive inline verification buttons
- Verification logging directly to InsForge PostgreSQL
- Status writer (heartbeat via DB UPSERT)
- Command worker (polls admin_commands table)
- Member/subscriber count sync every 15min (PTB JobQueue)
- Link counter maintenance (linked_channels_count / linked_groups_count)

### Web Dashboard

- 10 pages (dashboard, analytics, groups, channels, bots, logs, settings)
- 70+ React components (shadcn/ui based)
- TanStack Query for data fetching
- Real-time updates via InsForge WebSocket
- Dark/Light mode theming
- Direct InsForge SDK queries
- Responsive charts (shadcn/ui ChartContainer + Recharts)

### InsForge Backend

- 11 database tables with proper indexes
- 14 PostgreSQL RPC functions for analytics/charts
- 4 realtime triggers (verification, bot_status, commands, logs)
- 2 storage buckets (bot-exports private, bot-assets public)
- Edge Functions for bot token management and webhook testing
- 10 SQL migrations (001-010)

---

## Quality Standards

| Tool       | Target     |
| ---------- | ---------- |
| Ruff Check | 0 errors   |
| Pylint     | 10.00/10   |
| Pyrefly    | 0 errors   |
| ESLint     | 0 warnings |
| TypeScript | 0 errors   |

---

## Current Status

**Phase**: 69 — Chart Responsiveness & Groups/Channels Data Fix (Complete)
**Last Updated**: 2026-02-26

- Phase 68 (Comprehensive Audit, Bug Fixes & Redis Setup): Complete
- Phase 69 (Chart Responsiveness & Groups/Channels Data Fix): Complete — 9 charts fixed, 3 data pipeline issues resolved

---

_This document is the foundation for all project context._
