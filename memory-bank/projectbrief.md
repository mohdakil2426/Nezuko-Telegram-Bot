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
| **Auth**           | InsForge Auth (email/password + OAuth), RLS on all tables |
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
- Security Vault (automated AES-256-GCM encryption key management)
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
- Edge Functions for bot token management (AES-256-GCM) and webhook testing
- 11 SQL migrations (001-011)

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

**Phase**: 80 — WEB_AUDIT_REPORT_V2 Fixes (In Progress)
**Last Updated**: 2026-02-28

- Phase 70 (Frontend Audit & Performance Optimization): Complete
- Phase 71 (Secure Vault & Automated Key Management): Complete
- Phase 72 (Security Audit Fixes v5 — RLS, Auth, Bot): Complete
- Phase 73–74 (Security Vault RLS Fix + Login Auth Fix): Complete
- Phase 75 (Telegram Auth Removal — InsForge sole auth): Complete
- Phase 76 (Auth System Hardening — pages, proxy, cleanup): Complete
- Phase 77 (Comprehensive UI/UX Audit Fix — 104 findings resolved): Complete
- Phase 78 (Responsiveness Audit v1 Fixes — 20 items): Complete
- Phase 79 (Deep Web Standards Audit v2 — 34 findings in WEB_AUDIT_REPORT_V2.md): Complete
- Phase 80 (WEB_AUDIT_REPORT_V2 Fixes — ~20/34 complete): **In Progress**

---

_This document is the foundation for all project context._
