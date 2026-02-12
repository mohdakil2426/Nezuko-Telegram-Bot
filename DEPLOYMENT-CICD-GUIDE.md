# 🚀 Nezuko Platform — CI/CD Deployment Guide
## Vercel (Web Dashboard) + Koyeb (Bot Service)

> **Stack:** Vercel (free) + Koyeb (free) + GitHub auto-deploy  
> **Cost:** $0/month — everything on free tiers  
> **Difficulty:** 🟢 Super Easy — No SSH, no CLI, no VMs  
> **Date:** 2026-02-13

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Part A: Koyeb — Bot Service Deployment](#2-part-a-koyeb--bot-service)
3. [Part B: Vercel — Web Dashboard Deployment](#3-part-b-vercel--web-dashboard)
4. [Part C: CI/CD — Automatic Deployments](#4-part-c-cicd--automatic-deployments)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Monitoring & Debugging](#6-monitoring--debugging)
7. [CI Workflow File (GitHub Actions)](#7-ci-workflow-file)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Repository                           │
│                  (mohdakil2426/Nezuko-Telegram-Bot)             │
│                                                                  │
│  Push to main ───┬──────────────────────────────┐               │
│                  │                              │               │
│                  ▼                              ▼               │
│     ┌──────────────────────┐    ┌──────────────────────────┐    │
│     │  Koyeb (Automatic)   │    │  Vercel (Automatic)      │    │
│     │                      │    │                          │    │
│     │  1. Detects push     │    │  1. Detects push         │    │
│     │  2. Builds Docker    │    │  2. Builds Next.js       │    │
│     │  3. Deploys bot      │    │  3. Deploys dashboard    │    │
│     │                      │    │                          │    │
│     │  ⚡ ~5-8 minutes     │    │  ⚡ ~30-60 seconds       │    │
│     │  NO GitHub Actions!  │    │  NO GitHub Actions!      │    │
│     └──────────────────────┘    └──────────────────────────┘    │
│                                                                  │
│  Both platforms have built-in CI/CD — no workflow files needed!  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Stack?

| Component | Platform | Cost | CI/CD |
|-----------|----------|------|-------|
| **Bot Service** | **Koyeb** | **$0** forever | ✅ Built-in (GitHub auto-deploy) |
| **Dashboard** | **Vercel** | **$0** forever | ✅ Built-in (GitHub auto-deploy) |
| **Database** | **InsForge** | **$0** (500MB) | N/A |
| **Quality Checks** | **GitHub Actions** | **$0** (free for public repos) | Optional CI |

---

## 2. Part A: Koyeb — Bot Service

### What is Koyeb?

Koyeb is a serverless container platform. You connect your GitHub repo, point to a Dockerfile, and it runs your app. No SSH, no VMs, no CLI needed. **Free forever** with no credit card.

### Step 1: Create Account (1 min)

1. Go to [koyeb.com](https://koyeb.com)
2. Click **"Get started for free"**
3. Sign up with **GitHub** (recommended for easy repo access)

### Step 2: Create New Service (2 min)

1. Click **"Create Service"** (or **"Create App"** if first time)
2. Select **"GitHub"** as deployment source
3. If prompted, **authorize Koyeb** to access your GitHub account
4. Grant access to the **`mohdakil2426/Nezuko-Telegram-Bot`** repository

### Step 3: Select Repository (1 min)

| Setting | Value |
|---------|-------|
| **Repository** | `mohdakil2426/Nezuko-Telegram-Bot` |
| **Branch** | `main` |

### Step 4: Configure Build (2 min)

| Setting | Value |
|---------|-------|
| **Builder** | **Dockerfile** |
| **Dockerfile path** | `config/docker/Dockerfile.monorepo` |
| **Work directory** | _(leave empty — defaults to root)_ |

### Step 5: Configure Service (2 min)

| Setting | Value |
|---------|-------|
| **Service type** | Web Service |
| **Service name** | `nezuko-bot` |
| **Region** | Frankfurt or Singapore (closest) |
| **Instance type** | **Free** (nano — 0.1 vCPU, 512 MB) |
| **Port** | `8000` |

### Step 6: Add Environment Variables ⚠️ CRITICAL

Find the **"Environment Variables"** section. Add each one:

| Name | Value |
|------|-------|
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:<PASSWORD>@db.u4ckbciy.us-west.insforge.app:5432/insforge?sslmode=require` |
| `INSFORGE_DATABASE_URL` | `postgresql://postgres:<PASSWORD>@db.u4ckbciy.us-west.insforge.app:5432/insforge?sslmode=require` |
| `ENCRYPTION_KEY` | Your Fernet encryption key |
| `LOG_FILE` | `storage/logs/bot.log` |
| `LOG_LEVEL` | `INFO` |

> ⚠️ **Do NOT add `BOT_TOKEN`** — leaving it empty runs Dashboard Mode (bots loaded from database)

### Step 7: Health Check (1 min)

If there's a health check section:

| Setting | Value |
|---------|-------|
| **Path** | `/health` |
| **Port** | `8000` |
| **Protocol** | HTTP |

### Step 8: Click Deploy! 🚀

Click **"Deploy"** — Koyeb will:

1. ✅ Pull code from GitHub
2. ✅ Build Docker image from `config/docker/Dockerfile.monorepo`
3. ✅ Start the container
4. ✅ Begin health checks

**First build takes ~5-8 minutes.** Watch the build logs in the Koyeb dashboard.

### Step 9: Verify

1. Wait for status to show **"Healthy"** ✅
2. Click **"Logs"** tab
3. You should see:
   ```
   Nezuko Bot Manager - Dashboard Mode
   Loading bots from database...
   ```

---

## 3. Part B: Vercel — Web Dashboard

### Step 1: Create Account (1 min)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Select the **Hobby** plan (free)

### Step 2: Import Project (2 min)

1. Click **"Add New..."** → **"Project"**
2. Find and select **`mohdakil2426/Nezuko-Telegram-Bot`**
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | Click **"Edit"** → set to `apps/web` |
| **Framework Preset** | Auto-detects **Next.js** |
| **Build Command** | `bun run build` (or `npm run build`) |
| **Install Command** | `bun install` (or `npm install`) |

### Step 3: Add Environment Variables (3 min)

Add in **Settings** → **Environment Variables**:

```env
# InsForge Connection
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<your-anon-key>

# Authentication
NEXT_PUBLIC_LOGIN_BOT_USERNAME=<your-login-bot-username>
LOGIN_BOT_TOKEN=<your-login-bot-token>
BOT_OWNER_TELEGRAM_ID=<your-telegram-id>
AUTH_SECRET=<generate-random-secret>

# Bot Service URL (fill after Koyeb deployment)
NEXT_PUBLIC_BOT_API_URL=https://nezuko-bot-<your-id>.koyeb.app
```

### Step 4: Deploy (1 min)

Click **"Deploy"** — your dashboard goes live at:  
`https://nezuko-telegram-bot.vercel.app`

---

## 4. Part C: CI/CD — Automatic Deployments

### The Best Part: Both Platforms Auto-Deploy!

Neither Koyeb nor Vercel need GitHub Actions for deployment:

```
You write code locally
       │
       ▼
git push origin main
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│  Koyeb (Automatic)      │    │  Vercel (Automatic)          │
│                         │    │                              │
│  Detects push to main   │    │  Detects push to main        │
│  → Builds Docker image  │    │  → Builds Next.js app        │
│  → Deploys bot          │    │  → Deploys dashboard         │
│  → ~5-8 minutes         │    │  → ~30-60 seconds            │
│  → Live! ✅              │    │  → Live! ✅                  │
└─────────────────────────┘    └──────────────────────────────┘
```

### Optional: GitHub Actions for Quality Checks

You can **optionally** add a GitHub Actions workflow for linting/testing on PRs. This doesn't deploy anything — just checks code quality:

See [Section 7](#7-ci-workflow-file) for the workflow file.

---

## 5. Environment Variables Reference

### Koyeb (Bot Service)

| Variable | Value | Secret? |
|----------|-------|---------|
| `ENVIRONMENT` | `production` | No |
| `DATABASE_URL` | `postgresql+asyncpg://...` | ✅ Yes |
| `INSFORGE_DATABASE_URL` | `postgresql://...` | ✅ Yes |
| `ENCRYPTION_KEY` | Fernet key | ✅ Yes |
| `LOG_FILE` | `storage/logs/bot.log` | No |
| `LOG_LEVEL` | `INFO` | No |

> **NO `BOT_TOKEN`** — Dashboard Mode loads bots from database

### Vercel (Web Dashboard)

| Variable | Value | Secret? |
|----------|-------|---------|
| `NEXT_PUBLIC_INSFORGE_BASE_URL` | `https://u4ckbciy.us-west.insforge.app` | No |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Anon key | No |
| `NEXT_PUBLIC_LOGIN_BOT_USERNAME` | Login bot username | No |
| `NEXT_PUBLIC_BOT_API_URL` | Koyeb URL | No |
| `LOGIN_BOT_TOKEN` | Bot token | ✅ Yes |
| `BOT_OWNER_TELEGRAM_ID` | Your Telegram ID | ✅ Yes |
| `AUTH_SECRET` | Random secret | ✅ Yes |

---

## 6. Monitoring & Debugging

### View Bot Logs (Koyeb)

1. Go to [app.koyeb.com](https://app.koyeb.com)
2. Click on your `nezuko-bot` service
3. Click the **"Logs"** tab
4. Logs stream in real-time — no SSH needed!

### View Dashboard Logs (Vercel)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Click **"Logs"** tab

### Restart Bot (Koyeb)

1. Go to service → Click **"Redeploy"**
2. Or push an empty commit: `git commit --allow-empty -m "redeploy" && git push`

### Rollback (Koyeb)

1. Go to service → **"Deployments"** tab
2. Click on a previous deployment
3. Click **"Rollback"**

### Rollback (Vercel)

1. Go to project → **"Deployments"** tab
2. Click **"..."** on a previous deployment
3. Click **"Promote to Production"**

---

## 7. CI Workflow File

### `.github/workflows/ci.yml` (Optional — Quality Checks Only)

This runs on PRs for code quality. Koyeb + Vercel handle deployment automatically.

```yaml
name: "✅ CI — Lint & Test"

on:
  pull_request:
    branches: [main]

jobs:
  python-checks:
    name: "🐍 Python Checks"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.13"
          cache: "pip"

      - name: Install deps
        run: |
          pip install -r requirements/prod-bot.txt
          pip install -r requirements/dev.txt

      - name: Lint
        run: ruff check apps/bot/

      - name: Format check
        run: ruff format --check apps/bot/

      - name: Test
        run: pytest tests/bot/ -v --tb=short
        continue-on-error: true

  web-checks:
    name: "🌐 Web Checks"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install & Build
        run: |
          cd apps/web
          bun install
          bun run lint
          bun run build
```

---

## 📌 Quick Reference

### First-Time Setup Checklist

```
KOYEB (Bot):
  □ 1. Go to koyeb.com → sign up with GitHub
  □ 2. Create Service → connect GitHub repo
  □ 3. Set Dockerfile: config/docker/Dockerfile.monorepo
  □ 4. Add environment variables
  □ 5. Deploy → wait for "Healthy" status
  □ 6. Check logs → bot running in dashboard mode!

VERCEL (Dashboard):
  □ 7. Go to vercel.com → sign up with GitHub
  □ 8. Import repo → root dir = apps/web
  □ 9. Add environment variables
  □ 10. Deploy → dashboard live!

TEST:
  □ 11. Open dashboard → login
  □ 12. Add bot → see it start on Koyeb!
  □ 13. 🎉 DONE — zero SSH, zero CLI, $0/month!
```

### Day-to-Day Workflow

```
1. Write code locally
2. git add . && git commit -m "feat: new feature"
3. git push origin main
4. Both Koyeb (bot) and Vercel (dashboard) auto-deploy ✅
5. That's it!
```

---

*Generated 2026-02-13 — Stack: Vercel + Koyeb + InsForge (all free)*
