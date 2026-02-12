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

- **Node.js 20+**
- **Python 3.13+**
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

### 3. Install Dependencies

```bash
# Frontend
cd apps/web
npm install

# Bot
cd ../bot
pip install -r requirements.txt
```

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

## Running the Services

### 1. Run Web Dashboard

```bash
cd apps/web
npm run dev
# Access at http://localhost:3000
```

### 2. Run Bot

```bash
cd apps/bot
python -m main
```

---

## Next Steps

- [**Architecture Overview**](../architecture/README.md)
- [**Web Dashboard Guide**](../web/README.md)
