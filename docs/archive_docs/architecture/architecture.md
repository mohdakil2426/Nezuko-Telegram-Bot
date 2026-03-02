# Nezuko Architecture

This document describes the system architecture, design decisions, and data flows for Nezuko - The Ultimate All-In-One Bot.

---

## System Overview

Nezuko is built on the **InsForge Platform**, leveraging a serverless, event-driven architecture. This eliminates the need for a traditional backend API, as the frontend and bot communicate directly with InsForge services via SDKs.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram API                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ Updates (Webhook)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Nezuko Bot                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Handlers   │  │   Logic      │  │      InsForge SDK     │  │
│  │              │  │              │  │                       │  │
│  │  (Commands)  │  │ (Validation) │  │  (Auth, DB, Realtime) │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└───────────────┬────────────────────────────▲────────────────────┘
                │                            │
                │     ┌──────────────────────┴──────────────────────┐
                │     │                                             │
                │     │             InsForge Platform               │
                │     │                                             │
                │     │                                             │
                └────►│  ┌────────────┐  ┌────────────┐  ┌───────┐  │
                      │  │ PostgreSQL │  │    Auth    │  │ Redis │  │
                      │  └────────────┘  └────────────┘  └───────┘  │
                      │                                             │
                      │  ┌────────────┐  ┌────────────┐             │
                      │  │  Storage   │  │ Functions  │             │
                      │  └────────────┘  └────────────┘             │
                      └──────────────────────▲──────────────────────┘
                                             │
┌────────────────────────────────────────────┴────────────────────┐
│                         Web Dashboard                           │
│                      (Next.js + InsForge SDK)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. InsForge Backend (`@insforge/sdk`)

Nezuko uses InsForge as its Backend-as-a-Service (BaaS).

- **Database**: Managed PostgreSQL accessed via the SDK (PostgREST style).
- **Authentication**: Native InsForge Auth (Email/Password + OAuth).
- **Realtime**: WebSocket subscriptions for database changes (instant UI updates).
- **Storage**: Managed object storage for media.

### 2. Nezuko Bot (`apps/bot`)

The Python bot handles Telegram updates and business logic.

- **Framework**: `python-telegram-bot` v22.6+
- **Integration**: Uses `insforge-python-sdk` (or direct API calls) to interact with the database.
- **State**: Stateless design; all state resides in InsForge Database or Redis.

### 3. Web Dashboard (`apps/web`)

The Next.js admin interface allows users to manage their bots and groups.

- **Framework**: Next.js 16 (App Router)
- **Integration**: `@insforge/sdk` for direct database and auth interaction.
- **Hosting**: Vercel or similar edge platforms.

---

## Data Model

The database schema is managed within InsForge.

### Entity Relationship Diagram

```
┌─────────────────────┐
│       owners        │
│─────────────────────│
│ user_id PK BigInt   │
│ email String        │
└──────────┬──────────┘
           │ 1:N
           ▼
┌─────────────────────────┐
│    protected_groups     │
│─────────────────────────│
│ group_id PK BigInt      │
│ owner_id FK → owners    │
│ settings JSONB          │
└──────────┬──────────────┘
           │ M:N
           ▼
┌─────────────────────────┐
│    enforced_channels    │
│─────────────────────────│
│ channel_id PK BigInt    │
│ invite_link String      │
└─────────────────────────┘
```

---

## Request Flows

### 1. User Verification

1. **User Joins Group**: Bot receives `chat_member` update.
2. **Check Membership**: Bot queries InsForge DB for linked channels.
3. **Verify**: Bot checks if user is in required channels (via Telegram API).
4. **Action**: Mute/Kick if not verified; allow if verified.
5. **Log**: Result logged to InsForge DB.

### 2. Admin Configuration

1. **Web Dashboard**: Owner logs in via InsForge Auth.
2. **Update Settings**: Owner changes settings in Dashboard.
3. **Realtime Update**: Dashboard pushes change to InsForge DB.
4. **Bot Sync**: Bot receives Realtime event or fetches new config on next request.

---

## Scalability & Security

- **Serverless**: No backend servers to manage.
- **Security**: Row Level Security (RLS) policies in PostgreSQL ensure users only access their own data.
- **Performance**: Edge caching and global CDN via InsForge/Vercel.
