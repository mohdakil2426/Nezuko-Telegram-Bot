# 🎛️ Nezuko Admin Panel

> **A Modern, Scalable Web Dashboard for Bot Owners**

<div align="center">

![Status](https://img.shields.io/badge/Status-Planning-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1.0--alpha-orange?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20Next.js-green?style=for-the-badge)

</div>

---

## 📋 Table of Contents

| Document                                                   | Description                              |
| ---------------------------------------------------------- | ---------------------------------------- |
| [**01-REQUIREMENTS.md**](./01-REQUIREMENTS.md)             | Functional & non-functional requirements |
| [**02-ARCHITECTURE.md**](./02-ARCHITECTURE.md)             | System architecture & design decisions   |
| [**02a-FOLDER-STRUCTURE.md**](./02a-FOLDER-STRUCTURE.md)   | Folder structure & naming conventions    |
| [**03-TECH-STACK.md**](./03-TECH-STACK.md)                 | Technology choices & justifications      |
| [**04-API-DESIGN.md**](./04-API-DESIGN.md)                 | REST API specification                   |
| [**05-UI-WIREFRAMES.md**](./05-UI-WIREFRAMES.md)           | Design system, colors, animations        |
| [**05a-PAGE-WIREFRAMES.md**](./05a-PAGE-WIREFRAMES.md)     | Detailed page layouts & components       |
| [**06-IMPLEMENTATION.md**](./06-IMPLEMENTATION.md)         | Implementation roadmap & phases          |
| [**07-SECURITY.md**](./07-SECURITY.md)                     | Core security framework & authentication |
| [**07a-SECURITY-ADVANCED.md**](./07a-SECURITY-ADVANCED.md) | Infrastructure security & Zero Trust     |
| [**08-DEPLOYMENT.md**](./08-DEPLOYMENT.md)                 | Deployment strategy & hosting            |

---

## 🎯 Project Vision

The Nezuko Admin Panel is a **web-based dashboard** that empowers bot owners to:

- **🔧 Manage Everything**: Control all bot services, groups, and channels from one place
- **📊 Monitor in Real-time**: View live logs, metrics, and performance data
- **⚙️ Configure Easily**: No more manual `.env` editing or SSH access needed
- **🔌 Extend Infinitely**: Plugin-ready architecture for unlimited future features
- **🔒 Stay Secure**: Enterprise-grade authentication and audit logging

---

## 🚀 Quick Overview

### What Problem Does This Solve?

| Before (Manual)               | After (Admin Panel)            |
| ----------------------------- | ------------------------------ |
| SSH into server to check logs | View real-time logs in browser |
| Edit `.env` files manually    | Visual configuration editor    |
| Run SQL queries for stats     | Beautiful analytics dashboard  |
| Restart services via terminal | One-click service management   |
| No visibility into issues     | Proactive alerts & monitoring  |

### Key Features (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Dashboard          Real-time bot status & quick stats   │
│  👥 Groups             Manage protected groups & settings   │
│  📺 Channels           Configure enforced channels          │
│  ⚙️ Configuration      Environment & bot settings           │
│  📝 Logs               Real-time log streaming              │
│  🗃️ Database           Browse & manage data                 │
│  📈 Analytics          Usage trends & insights              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                    (Admin Dashboard)                             │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY (Caddy)                         │
│              Auto-SSL, Routing, Rate Limiting                    │
└─────────────────────────┬────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  NEXT.JS    │   │  FASTAPI    │   │  TELEGRAM   │
│   (Web)     │   │   (API)     │   │    BOT      │
│  :3000      │   │   :8080     │   │   :8000     │
└─────────────┘   └─────────────┘   └─────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
       ┌───────────┐           ┌───────────┐
       │ POSTGRES  │           │   REDIS   │
       │   :5432   │           │   :6379   │
       └───────────┘           └───────────┘
```

---

## 📊 Technology Stack Summary (January 2026)

| Layer             | Technology              | Version          | Status   |
| ----------------- | ----------------------- | ---------------- | -------- |
| **Frontend**      | Next.js + React         | 16.1.4 / 19.2.3  | ✅ Latest |
| **UI Components** | shadcn/ui + Tailwind    | 3.7.0 / 4.1.18   | ✅ Latest |
| **Backend API**   | FastAPI + Pydantic      | 0.124.4 / 2.12.5 | ✅ Latest |
| **Database**      | PostgreSQL + SQLAlchemy | 18.1 / 2.0.46    | ✅ Latest |
| **Cache**         | Redis                   | 8.0              | ✅ Latest |
| **Auth**          | JWT (python-jose)       | 3.5.0            | ✅ Latest |
| **Monorepo**      | Turborepo               | 2.7.0            | ✅ Latest |

> See [03-TECH-STACK.md](./03-TECH-STACK.md) for detailed justifications.

---

## 📅 Implementation Phases

| Phase       | Focus                       | Duration  | Status     |
| ----------- | --------------------------- | --------- | ---------- |
| **Phase 1** | Auth + Dashboard + CRUD     | 3-4 weeks | 📋 Planning |
| **Phase 2** | Logs + Database + Analytics | 2-3 weeks | ⏳ Pending  |
| **Phase 3** | Plugins + Multi-Admin       | 3-4 weeks | ⏳ Pending  |
| **Phase 4** | Advanced Features           | Ongoing   | ⏳ Pending  |

> See [06-IMPLEMENTATION.md](./06-IMPLEMENTATION.md) for detailed roadmap.

---

## 💰 Cost Analysis (GitHub Student Pack)

| Resource                   | Normal Cost | With Student Pack     |
| -------------------------- | ----------- | --------------------- |
| DigitalOcean Droplet (2GB) | $12/month   | **FREE** (16+ months) |
| Domain (.me)               | $15/year    | **FREE** (1 year)     |
| SSL Certificate            | $0-100/year | **FREE** (Caddy)      |
| **Total Year 1**           | ~$159       | **$0**                |

---

## 🤝 Contributing

This documentation is part of the Nezuko project. See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the Nezuko Community**

[Back to Main Docs](../) • [Back to Project Root](../../)

</div>
