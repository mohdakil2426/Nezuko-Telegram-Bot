# 🚀 Getting Started

> **Everything you need to get Nezuko running in minutes**

This guide will walk you through setting up the Nezuko platform using InsForge.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Running the Services](#running-the-services)

---

## Prerequisites

- **Node.js 20+** (Bun 1.2+ recommended)
- **Python 3.13+**
- **uv**: Python package manager ([Install uv](https://docs.astral.sh/uv/getting-started/installation/))
- **InsForge Account**: [Create one here](https://insforge.app)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot
```

### 2. Setup InsForge

1. Use the MCP tool `download-template` (if available) or create a new project in the InsForge dashboard.
2. Get your **Project URL** and **Anon Key**.

### 3. Automated Setup
The easiest way to set up everything is using the Nezuko CLI:

```bash
# Windows
.\nezuko.bat setup

# Linux/macOS
./nezuko.sh setup
```

This will automatically check prerequisites, sync Python dependencies with `uv`, and install frontend dependencies with `bun`.

---

## Configuration

### Web Configuration (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_INSFORGE_URL=https://your-app.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```

### Bot Configuration (`apps/bot/.env`)

```bash
BOT_TOKEN=your_telegram_bot_token
INSFORGE_URL=https://your-app.region.insforge.app
INSFORGE_SERVICE_KEY=your-service-role-key  # For admin access
```

---

### 1. Using the CLI
```bash
# Windows
.\nezuko.bat start

# Linux/macOS
./nezuko.sh start
```

### 2. Manual Run
```bash
# Web Dashboard
cd apps/web && bun dev

# Telegram Bot
uv run python -m apps.bot.main
```

---

## Next Steps

- [**Architecture Overview**](../architecture/README.md)
- [**Web Dashboard Guide**](../web/README.md)
