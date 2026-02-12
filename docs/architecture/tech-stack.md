# ⚡ Technology Stack

> **Complete technology reference for the Nezuko platform**

This document provides a comprehensive overview of all technologies, frameworks, and tools used in the Nezuko Telegram Bot platform.

---

## 📋 Overview

| Layer | Primary Technologies |
|-------|---------------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4 |
| **Backend** | **InsForge Platform** (BaaS) |
| **Bot Engine** | python-telegram-bot v22.6, AsyncIO |
| **Database** | PostgreSQL (Managed by InsForge) |
| **Infrastructure** | Docker, Vercel (Frontend), InsForge (Backend) |

---

## 🟢 Frontend Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.4 | React meta-framework with App Router |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **@insforge/sdk** | Latest | Backend integration SDK |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.1.x | Utility-first CSS framework |
| **shadcn/ui** | Latest | Accessible component library |
| **Lucide React** | 0.563+ | Icon library |

---

## ☁️ Backend & Infrastructure (InsForge)

Nezuko relies on **InsForge** for all backend services. We do not maintain a separate API server.

| Service | Technology | Purpose |
|---------|------------|---------|
| **Database** | PostgreSQL | Primary data store |
| **Auth** | InsForge Auth | User authentication (Email, OAuth) |
| **Storage** | S3-compatible | File and media storage |
| **Realtime** | WebSockets | Live database subscriptions |
| **Functions** | Serverless | Custom backend logic (if needed) |

---

## 🤖 Bot Engine Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.13+ | Programming language |
| **python-telegram-bot** | 22.6+ | Telegram Bot API wrapper |
| **InsForge SDK** | Latest | Database/Auth integration |

### Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **AIOHTTP** | 3.13+ | Async HTTP client |
| **APScheduler** | Via PTB | Job scheduling |

---

## 🛠️ Development Tools

| Technology | Purpose |
|------------|---------|
| **Bun** | Frontend package manager & runtime |
| **Pip** | Python package manager |
| **Ruff** | Python linting & formatting |
| **Prettier** | Code formatting |
| **Docker** | Containerization for Bot |

---

## 🔒 Security Standards

### Authentication

- **Frontend**: JWTs managed by InsForge SDK.
- **Bot**: API Keys / Service Roles for database access.

### Data Protection

- **RLS**: Row Level Security policies enforce data isolation per user/tenant.
- **Encryption**: Data encrypted at rest and in transit.

---

*Last Updated: 2026-02-12*
