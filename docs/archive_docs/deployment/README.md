# 🚀 Deployment Guide

> **Complete guide for deploying Nezuko to production**

This document covers deploying the Nezuko frontend and bot. Since the backend is managed by InsForge, deployment is significantly simplified.

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Deploying Web Dashboard](#deploying-web-dashboard)
3. [Deploying Bot](#deploying-bot)
4. [Environment Variables](#environment-variables)

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Web (Vercel)│◄────►│   InsForge   │◄────►│ Bot (Docker) │
└──────────────┘      │  (Backend)   │      └──────────────┘
                      └──────────────┘
```

- **Web**: Deploys as a static/SSR site (Vercel, Netlify, InsForge Hosting).
- **Backend**: Managed by InsForge (Database, Auth, etc.).
- **Bot**: Deploys as a long-running process (Docker, VPS, Railway, Fly.io).

---

## Deploying Web Dashboard

### Option 1: Vercel (Recommended)

1. Push your code to GitHub.
2. Import project into Vercel.
3. Set Environment Variables:
   - `NEXT_PUBLIC_INSFORGE_URL`
   - `NEXT_PUBLIC_INSFORGE_ANON_KEY`
4. Deploy.

### Option 2: InsForge Hosting

Use the InsForge CLI or MCP tool to deploy directly.

```bash
mcp-cli call insforge/create-deployment ...
```

---

## Deploying Bot

The bot requires a long-running environment.

### Docker

1. **Build Image**:
   ```bash
   docker build -f apps/bot/Dockerfile -t nezuko-bot .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --env-file apps/bot/.env \
     --name nezuko-bot \
     nezuko-bot
   ```

### Hosting Providers (Railway/Fly.io)

1. Connect your GitHub repo.
2. Point the service to `apps/bot`.
3. Set environment variables.
4. Deploy.

---

## Environment Variables

| Variable | Description | Component |
|----------|-------------|-----------|
| `NEXT_PUBLIC_INSFORGE_URL` | API URL | Web |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Public Key | Web |
| `BOT_TOKEN` | Telegram Bot Token | Bot |
| `INSFORGE_URL` | API URL | Bot |
| `INSFORGE_SERVICE_KEY` | Admin Key | Bot |

---
