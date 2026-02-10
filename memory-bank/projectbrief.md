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

| Layer | Technologies |
|-------|-------------|
| **Bot** | Python 3.13, python-telegram-bot v22.6, AsyncIO |
| **API** | FastAPI, SQLAlchemy 2.0, Pydantic V2 |
| **Web** | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Database** | PostgreSQL (production), SQLite (development) |
| **Auth** | Telegram Login Widget (owner-only) |
| **Infrastructure** | Docker, Turborepo, Caddy |

---

## Monorepo Structure

```
nezuko-monorepo/
├── apps/
│   ├── api/          # FastAPI REST Backend (~50 Python files)
│   ├── bot/          # Telegram Bot (~25 Python files)
│   └── web/          # Next.js Dashboard (~120 TypeScript files)
├── packages/         # Shared packages (@nezuko/types, config)
├── config/           # Docker, Caddy, deployment configs
├── requirements/     # Python deps (base, api, bot, dev)
├── tests/            # Centralized test suite
├── scripts/          # Development & utility scripts
├── storage/          # Runtime files (gitignored)
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
- Prometheus metrics and structured logging

### Admin API
- RESTful endpoints with Pydantic validation
- Telegram Login Widget authentication
- Session-based auth with HTTP-only cookies
- Audit logging for all admin actions
- Real-time SSE event streaming

### Web Dashboard
- 13 routes (dashboard, analytics, groups, channels, bots, logs, settings)
- 70+ React components (shadcn/ui based)
- TanStack Query for data fetching
- Real-time updates via SSE
- Dark/Light mode theming

---

## Quality Standards

| Tool | Target |
|------|--------|
| Ruff Check | 0 errors |
| Pylint | 10.00/10 |
| Pyrefly | 0 errors |
| ESLint | 0 warnings |
| TypeScript | 0 errors |

---

## Current Status

**Phase**: Production Ready (Phase 50+)
**Last Updated**: 2026-02-07

- Bot Core: Functional with verification logging
- Admin API: All endpoints working
- Dashboard: All 13 pages functional
- Authentication: Telegram Login integrated
- Database: PostgreSQL with migrations applied

---

_This document is the foundation for all project context._
