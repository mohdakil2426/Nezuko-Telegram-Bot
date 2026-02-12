# 🚀 Nezuko Platform — Cloud Deployment & Dashboard Management Report

> **Date:** 2026-02-13  
> **Goal:** Deploy entire Nezuko platform to the cloud with full dashboard-managed bot lifecycle — zero local setup required.  
> **Stack:** Vercel (dashboard) + Koyeb (bot) + InsForge (database)  
> **Cost:** $0/month — everything on free tiers

---

## 📋 Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Recommended Stack](#3-recommended-stack)
4. [Bot Lifecycle: Dashboard → Cloud Activation Flow](#4-bot-lifecycle-flow)
5. [InsForge Capabilities](#5-insforge-capabilities)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Architecture Diagrams](#7-architecture-diagrams)
8. [Cost Analysis](#8-cost-analysis)

---

## 1. Current Architecture Analysis

### What Exists Today

| Component | Technology | Status | Location |
|-----------|-----------|--------|----------|
| **Web Dashboard** | Next.js 16 + React 19 + shadcn/ui | ✅ Built | `apps/web/` |
| **Python Bot** | python-telegram-bot v22.6 | ✅ Built | `apps/bot/` |
| **REST API** | FastAPI + SQLAlchemy | ✅ Built | `apps/api/` |
| **Database** | InsForge PostgreSQL | ✅ Configured | `db.u4ckbciy.us-west.insforge.app` |
| **Edge Functions** | InsForge (Deno) | ⚠️ Partially working | `insforge/functions/` |
| **Docker** | Multi-stage Dockerfile | ✅ Ready | `config/docker/Dockerfile.monorepo` |

### What Already Works

1. **`BotManager` class** (`apps/bot/core/bot_manager.py`):
   - Loading active bots from `bot_instances` database table
   - Starting/stopping individual bot instances
   - Health monitoring with auto-restart (3 retries)
   - Database sync every 30 seconds (detects new/removed bots)
   - Webhook AND polling modes

2. **Dashboard "Bots" page** (`apps/web/src/app/dashboard/bots/page.tsx`):
   - Listing, adding, activating/deactivating, deleting bots

3. **`manage-bot` Edge Function** (`insforge/functions/manage-bot.js`):
   - Token verification via Telegram API
   - Bot insertion into `bot_instances` table

### Current Blockers

| Blocker | Severity |
|---------|----------|
| Bot runs **locally** only — no 24/7 uptime | 🔴 Critical |
| Port 5432 blocked locally — can't reach InsForge DB | 🔴 Critical |
| `manage-bot` edge function returns 500 | 🟡 Medium |
| Token encryption is just base64 | 🟡 Medium |

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Browser)                           │
│                                                              │
│  1. Open dashboard URL                                       │
│  2. Click "Add Bot" → paste token → verify → save            │
│  3. Bot automatically starts in the cloud (~30 seconds)      │
│  4. Monitor health, logs, stats from dashboard               │
│  5. Toggle active/inactive from dashboard                    │
│  6. Everything works — NO LOCAL SETUP NEEDED                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Recommended Stack

```
┌─────────────────────────────────────────────────┐
│  VERCEL (Free)         │  KOYEB (Free)           │
│  ─────────────         │  ──────────             │
│  Next.js Dashboard     │  Python Bot Service     │
│  Telegram Login Auth   │  BotManager (polling)   │
│  Bot management UI     │  Health monitoring      │
│  Real-time updates     │  Auto-restart           │
│                        │  DB sync every 30s      │
│  ZERO CONFIG CI/CD!    │  GITHUB AUTO-DEPLOY!    │
└────────┬───────────────┴──────────┬─────────────┘
         │                          │
         ▼                          ▼
    ┌─────────────────────────────────────┐
    │  INSFORGE (Free 500MB)              │
    │  ───────────────────                │
    │  PostgreSQL Database                │
    │  Edge Functions (manage-bot)        │
    │  Realtime WebSockets                │
    └─────────────────────────────────────┘
```

### Why This Stack?

| Component | Platform | Why | Cost |
|-----------|----------|-----|------|
| **Web Dashboard** | **Vercel** | Native Next.js 16, auto CI/CD, global CDN | **$0** |
| **Bot Service** | **Koyeb** | Free forever, Docker, GitHub auto-deploy, no SSH | **$0** |
| **Database** | **InsForge** | Already configured, PostgREST, Edge Functions | **$0** |

### Why Koyeb?

- ✅ **Truly free** — no trial, no expiry, no credit card needed
- ✅ **Runs 24/7** — doesn't sleep like Render
- ✅ **Docker support** — uses your existing `Dockerfile.monorepo`
- ✅ **GitHub integration** — connects to your repo, auto-deploys on push
- ✅ **No SSH, no CLI** — everything via web dashboard
- ✅ **512 MB RAM + 0.1 vCPU** — enough for the bot
- ✅ **Built-in CI/CD** — push to GitHub = auto-redeploy
- ✅ **Health checks** — auto-restarts unhealthy containers
- ✅ **Logs in browser** — no SSH needed to debug

### Why NOT Other Platforms

| Platform | Why Skipped |
|----------|-------------|
| **Oracle Cloud** | Complex VM setup, SSH key pairs, too hard for beginners |
| **Google Cloud Run** | Account ban risk, requires CLI, costs money |
| **Fly.io** | No free tier for new users, requires credit card |
| **Render** | Sleeps after 15 minutes of inactivity |
| **InsForge Functions** | Deno/JS only — can't run Python bot |

---

## 4. Bot Lifecycle Flow

### Add Bot from Dashboard → Bot Starts in Cloud

```
Step 1: User opens dashboard → clicks "Add Bot" → enters BOT_TOKEN
         │
         ▼
Step 2: InsForge Edge Function `manage-bot`
        → Verifies token via Telegram API
        → Encrypts token
        → Inserts into bot_instances table (is_active: true)
         │
         ▼
Step 3: BotManager on Koyeb detects new bot (~30 second sync)
        → Decrypts token → creates Application → starts polling
         │
         ▼
Step 4: Bot is LIVE! 🟢
```

### Deactivate Bot

```
Dashboard toggles is_active = false
         │
         ▼
BotManager._sync_bots() detects change (~30 sec)
         │
         ▼
BotManager.stop_bot() → graceful shutdown
         │
         ▼
Bot is STOPPED 🔴 (stays in DB for reactivation)
```

---

## 5. InsForge Capabilities

### ✅ What InsForge CAN Do

| Feature | How We Use It | Status |
|---------|-------------|--------|
| **PostgreSQL Database** | bot_instances, groups, verifications, logs | ✅ Tables exist |
| **PostgREST API** | Dashboard reads/writes data via SDK | ✅ Working |
| **Edge Functions** | manage-bot for token verify + insert | ⚠️ Needs fixing |
| **Realtime WebSockets** | Push bot status updates to dashboard | 🚧 To configure |
| **Storage Buckets** | Bot avatars, backup logs | 🚧 To set up |

### ❌ What InsForge CANNOT Do

| Feature | Why Not | Alternative |
|---------|---------|-------------|
| Run Python bot | Edge Functions = Deno/JS only | Koyeb |
| Long-running processes | Serverless has execution limits | Koyeb |

---

## 6. Implementation Roadmap

### Phase 1: Deploy Bot to Koyeb (15 min)

1. Connect GitHub repo to Koyeb
2. Set Dockerfile path: `config/docker/Dockerfile.monorepo`
3. Add environment variables
4. Deploy → bot running in dashboard mode

### Phase 2: Deploy Dashboard to Vercel (10 min)

1. Import repo to Vercel, root dir = `apps/web`
2. Add env vars
3. Deploy → dashboard live

### Phase 3: Fix Current Issues (1-2 days)

| Task | Priority | Effort |
|------|----------|--------|
| Fix `manage-bot` edge function 500 error | 🔴 High | 1 hour |
| Upgrade token encryption (base64 → AES-256) | 🔴 High | 2 hours |
| Configure InsForge Realtime channels | 🟡 Medium | 1 hour |

### Phase 4: End-to-End Testing (1 day)

- Add bot from deployed dashboard
- Verify bot starts on Koyeb within 30s
- Test bot commands, toggle active/inactive
- Test health monitoring and auto-restart

---

## 7. Architecture Diagrams

### Full Cloud Architecture

```
                        ┌──────────────────────┐
                        │   User's Browser     │
                        │   (No Local Setup!)   │
                        └──────────┬───────────┘
                                   │ HTTPS
                                   ▼
                ┌──────────────────────────────────┐
                │          VERCEL (Free)            │
                │     ┌──────────────────────┐     │
                │     │  Next.js Dashboard   │     │
                │     │  • Login (Telegram)   │     │
                │     │  • Bot Management     │     │
                │     │  • Analytics          │     │
                │     └──────────┬───────────┘     │
                └────────────────┼─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
              ▼                  ▼                   ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐
   │  InsForge DB    │ │ InsForge Edge   │ │  InsForge    │
   │  (PostgreSQL)   │ │ Functions       │ │  Realtime    │
   │                 │ │                 │ │  (WebSocket) │
   │ • bot_instances │ │ • manage-bot    │ │              │
   │ • groups        │ │ • bot-health    │ │ • bot_mgmt   │
   │ • verifications │ │                 │ │              │
   └────────┬────────┘ └─────────────────┘ └──────────────┘
            │
            │  Port 5432 (works from Koyeb!)
            ▼
   ┌──────────────────────────────────────────────┐
   │          KOYEB (Free Forever)                │
   │    ┌──────────────────────────────────┐      │
   │    │  Python Bot Container            │      │
   │    │  ┌────────────────────────────┐  │      │
   │    │  │ BotManager                 │  │      │
   │    │  │ • Load bots from DB        │  │      │
   │    │  │ • Start/stop instances     │  │      │
   │    │  │ • Health monitoring        │  │      │
   │    │  │ • Auto-restart (3 tries)   │  │      │
   │    │  │ • DB sync every 30s        │  │      │
   │    │  └────────────────────────────┘  │      │
   │    │  ┌────────────────────────────┐  │      │
   │    │  │ Bot @bot1 │ Bot @bot2     │  │      │
   │    │  └────────────────────────────┘  │      │
   │    └──────────────────────────────────┘      │
   │    0.1 vCPU │ 512 MB RAM │ Free forever      │
   └──────────────────────────────────────────────┘
                         │
                         │ Polling
                         ▼
                ┌─────────────────┐
                │  Telegram API   │
                └─────────────────┘
```

---

## 8. Cost Analysis

| Service | Platform | Monthly Cost |
|---------|----------|-------------|
| Dashboard | Vercel | **$0** (free) |
| Bot Service | Koyeb | **$0** (free) |
| Database | InsForge | **$0** (free 500MB) |
| CI/CD | Built into Vercel + Koyeb | **$0** |
| **Total** | | **$0/month forever** |

### Koyeb Free Tier Limits

| Resource | Free Amount | Our Usage |
|----------|-------------|-----------|
| Web services | 1 | 1 (bot) |
| vCPU | 0.1 | 0.1 |
| RAM | 512 MB | ~200-300 MB |
| Bandwidth | 100 GB/month | ~1-2 GB |
| Storage | 50 GB | ~500 MB |

### When You'd Need to Pay

| Trigger | Action |
|---------|--------|
| >1 service needed | Koyeb Starter ($5.50/mo) |
| Heavy dashboard traffic | Vercel Pro ($20/mo) |
| Database > 500 MB | InsForge paid plan |

---

## Summary

### What You Need To Do

| Step | Time | What |
|------|------|------|
| 1 | 5 min | Connect GitHub to Koyeb → deploy bot |
| 2 | 5 min | Import repo to Vercel → deploy dashboard |
| 3 | 5 min | Add env vars on both platforms |
| **Total** | **~15 min** | **Everything deployed, $0/month!** |

### What You Get

- ✅ **Zero local setup** — everything in the cloud
- ✅ **No SSH, no VMs, no CLI** — everything via web UI
- ✅ **No credit card** — Koyeb is genuinely free
- ✅ **Add bots from dashboard** — paste token, bot starts in ~30s
- ✅ **Auto-deploy** — push to GitHub → both platforms auto-redeploy
- ✅ **Health monitoring** — Koyeb checks `/health`, auto-restarts
- ✅ **Logs in browser** — no SSH needed

### What's Built vs What Needs Work

| Feature | Status | Effort |
|---------|--------|--------|
| Dashboard UI | ✅ 100% | Deploy only |
| BotManager | ✅ 100% | Deploy only |
| Database | ✅ Ready | None |
| Docker image | ✅ Fixed | None |
| manage-bot edge function | ⚠️ 80% | Fix 500 error |
| Token encryption | ⚠️ Base64 | Upgrade to AES-256 |
| Realtime events | 🚧 Not configured | Create SQL triggers |

---

*Generated 2026-02-13 — Stack: Vercel + Koyeb + InsForge*
