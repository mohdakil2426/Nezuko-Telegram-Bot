# 🔍 grammY Bot Migration — Comprehensive Audit & Plan

> **Date**: 2026-03-03  
> **Scope**: New `apps/grammy/` bot engine — TypeScript (grammY) port of the Python (python-telegram-bot) bot  
> **Goal**: Feature-parity bot that integrates with existing InsForge BaaS + Next.js Dashboard, designed for seamless switchover

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [grammY Framework Analysis](#3-grammy-framework-analysis)
4. [Feature Mapping: Python → grammY](#4-feature-mapping-python--grammy)
5. [Proposed Architecture](#5-proposed-architecture)
6. [Module-by-Module Plan](#6-module-by-module-plan)
7. [InsForge Integration Strategy](#7-insforge-integration-strategy)
8. [Dashboard Compatibility Matrix](#8-dashboard-compatibility-matrix)
9. [Plugin Selection & Justification](#9-plugin-selection--justification)
10. [Quality & Testing Strategy](#10-quality--testing-strategy)
11. [Risk Assessment](#11-risk-assessment)
12. [Migration Switchover Plan](#12-migration-switchover-plan)
13. [Implementation Phases](#13-implementation-phases)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

The Nezuko platform's bot engine currently runs on **Python 3.13 + python-telegram-bot v22.6** (PTB). This plan details building an **equivalent grammY (TypeScript)** bot in `apps/grammy/` that:

- **Mirrors all 25+ Python files** across core, handlers, services, database, and utils
- **Shares the same InsForge BaaS** backend (PostgreSQL, Realtime, Storage)
- **Produces identical database writes** so the Next.js dashboard works unchanged
- **Runs alongside the Python bot** during development, with a clean switchover path
- **Leverages TypeScript** for type-safety and code sharing with the Next.js dashboard

### Key Advantages of grammY Migration

| Dimension           | Python (PTB)                                            | grammY (TypeScript)                               |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| **Language**        | Python 3.13                                             | TypeScript 5.9+                                   |
| **Framework**       | python-telegram-bot v22.6                               | grammY v1.x                                       |
| **Type Safety**     | Pyrefly (external)                                      | TSC strict (native)                               |
| **Package Manager** | uv                                                      | bun (same as web)                                 |
| **InsForge Client** | httpx REST (custom `insforge_client.py`)                | `@insforge/sdk` (shared with web)                 |
| **Code Sharing**    | None (separate language)                                | Shared types, utilities, InsForge client with web |
| **Runtime**         | Python asyncio                                          | Node.js event loop                                |
| **Concurrency**     | Single-threaded asyncio                                 | `@grammyjs/runner` (multi-threaded workers)       |
| **Middleware**      | PTB handler groups                                      | grammY middleware stack (Koa-style)               |
| **Bot API**         | `context.bot.send_message()`                            | `ctx.reply()` / `ctx.api.sendMessage()`           |
| **Filter System**   | `filters.TEXT`, `filters.StatusUpdate.NEW_CHAT_MEMBERS` | `"message:text"`, `"message:new_chat_members"`    |
| **Deployment**      | Docker + `python -m apps.bot.main`                      | Docker/Node + `bun run apps/grammy/src/main.ts`   |

---

## 2. Current Architecture Analysis

### 2.1 Python Bot File Inventory (25 files)

```
apps/bot/
├── main.py                      # Entry point (285 lines) — mode detection, PTB Application builder
├── config.py                    # Pydantic settings (8.6 KB)
├── core/
│   ├── bot_manager.py           # Coordinator (200 lines) — delegates to registry/lifecycle/health
│   ├── bot_registry.py          # BotConfig/BotInstance/BotStatus dataclasses + thread-safe registry
│   ├── cache.py                 # Redis wrapper with reconnection (5.7 KB)
│   ├── constants.py             # Shared constants — AUTO_DELETE_DELAY, ADMIN_STATUSES, etc.
│   ├── encryption.py            # AES-256-GCM decrypt_token (4.8 KB)
│   ├── insforge_client.py       # httpx REST client (20 KB) — all DB operations
│   ├── loader.py                # PTB handler registration (8 KB)
│   ├── rate_limiter.py          # Simple sliding window (0.9 KB)
│   ├── realtime_client.py       # Socket.IO subscriber (12.9 KB)
│   └── uptime.py                # Uptime tracking (2.4 KB)
├── handlers/
│   ├── admin/
│   │   ├── help.py              # /help command (12.6 KB)
│   │   ├── settings.py          # /settings command (10.2 KB)
│   │   └── setup.py             # /protect, /unprotect commands (8.2 KB)
│   ├── events/
│   │   ├── join.py              # ChatMemberHandler — new member mutes (3.7 KB)
│   │   ├── join_request.py      # Join request handling (5.6 KB)
│   │   ├── leave.py             # Member leave — permission revocation (5.8 KB)
│   │   └── message.py           # Message filter for unverified users (5.3 KB)
│   ├── error.py                 # Global error handler (2.9 KB)
│   └── verify.py                # "I have joined" callback button (4.9 KB)
├── services/
│   ├── batch_verification.py    # Batch verify multiple users (8.1 KB)
│   ├── bot_health_monitor.py    # Health checks + auto-restart (3.9 KB)
│   ├── bot_lifecycle.py         # Start/stop/restart instances (9.4 KB)
│   ├── command_worker.py        # Dashboard→Bot command polling (10 KB)
│   ├── member_sync.py           # 15min member/subscriber count sync (7.7 KB)
│   ├── protection.py            # Mute/unmute/restrict users (8.6 KB)
│   ├── status_writer.py         # 60s heartbeat UPSERT (5 KB)
│   └── verification.py          # Core membership check + cache (10.5 KB)
├── database/
│   ├── verification_logger.py   # Fire-and-forget verification logs
│   ├── api_call_logger.py       # Fire-and-forget API call logs
│   └── insforge_log_handler.py  # Python logging.Handler → InsForge admin_logs
└── utils/
    ├── auto_delete.py           # Auto-delete messages after delay
    ├── health.py                # /health, /metrics, /ready HTTP server
    ├── logging.py               # Logging configuration
    ├── metrics.py               # Prometheus counter wrappers
    ├── resilience.py            # Retry/backoff utilities
    ├── sentry.py                # Sentry integration
    ├── tasks.py                 # fire_and_forget() utility
    └── ui.py                    # Message formatting helpers
```

### 2.2 Core Business Logic Summary

| Feature                | Python Implementation        | Key Behavior                                                                     |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| **Join Mute**          | `handlers/events/join.py`    | New member → instant `restrict_chat_member()` → send inline keyboard             |
| **Verify Button**      | `handlers/verify.py`         | Callback query → invalidate cache → `check_multi_membership()` → `unmute_user()` |
| **Channel Membership** | `services/verification.py`   | Redis cache → `getChatMember` API → cache result with TTL jitter                 |
| **Protection Setup**   | `handlers/admin/setup.py`    | `/protect @channel` → `insforge_client.link_group_channel()`                     |
| **Status Heartbeat**   | `services/status_writer.py`  | PATCH-then-POST UPSERT every 60s → `bot_status` table                            |
| **Command Worker**     | `services/command_worker.py` | WS-driven + 30s polling fallback → `admin_commands` table                        |
| **Member Sync**        | `services/member_sync.py`    | PTB JobQueue every 15min → `getChatMemberCount()` → update counts                |
| **Leave Detection**    | `handlers/events/leave.py`   | Member left → revoke permissions, invalidate cache                               |
| **Message Filter**     | `handlers/events/message.py` | Delete unverified users' messages                                                |
| **Multi-Bot Mode**     | `core/bot_manager.py`        | `DASHBOARD_MODE=true` → load tokens from `bot_instances` table                   |

### 2.3 InsForge Tables Written by Bot

| Table               | Writer                    | Method                              | What                               |
| ------------------- | ------------------------- | ----------------------------------- | ---------------------------------- |
| `verification_log`  | `verification_logger.py`  | `post_records()`                    | Verification analytics             |
| `api_call_log`      | `api_call_logger.py`      | `post_records()`                    | API call analytics                 |
| `bot_status`        | `status_writer.py`        | PATCH-then-POST                     | Heartbeat (60s)                    |
| `admin_logs`        | `insforge_log_handler.py` | `post_records()`                    | WARNING+ logs                      |
| `admin_commands`    | `command_worker.py`       | `get_records()` + `patch_records()` | Command polling                    |
| `protected_groups`  | `member_sync.py`          | `patch_records()`                   | `member_count`, `last_sync_at`     |
| `enforced_channels` | `member_sync.py`          | `patch_records()`                   | `subscriber_count`, `last_sync_at` |
| `protected_groups`  | `insforge_client.py`      | `patch_records()`                   | `linked_channels_count`            |
| `enforced_channels` | `insforge_client.py`      | `patch_records()`                   | `linked_groups_count`              |
| `bot_instances`     | `bot_manager.py`          | `get_records()`                     | Load active bots                   |
| `nezuko_secrets`    | `encryption.py`           | `get_records()`                     | Master key fetch                   |

---

## 3. grammY Framework Analysis

### 3.1 Core Concepts Mapped

| Concept              | PTB (Python)                                           | grammY (TypeScript)                                |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Bot instance         | `Application.builder().token(t).build()`               | `new Bot<MyContext>(token)`                        |
| Handler registration | `app.add_handler(CommandHandler("start", fn))`         | `bot.command("start", fn)`                         |
| Callback queries     | `CallbackQueryHandler(fn, pattern="verify")`           | `bot.callbackQuery("verify", fn)`                  |
| Event filters        | `ChatMemberHandler(fn, ChatMemberHandler.CHAT_MEMBER)` | `bot.on("chat_member", fn)`                        |
| New members          | `filters.StatusUpdate.NEW_CHAT_MEMBERS`                | `bot.on("message:new_chat_members", fn)`           |
| Left member          | `filters.StatusUpdate.LEFT_CHAT_MEMBER`                | `bot.on("message:left_chat_member", fn)`           |
| Message text         | `filters.TEXT & ~filters.COMMAND`                      | `bot.on("message:text", fn)` then check no command |
| Context type         | `ContextTypes.DEFAULT_TYPE`                            | Custom context `MyContext` with flavors            |
| Error handler        | `app.add_error_handler(fn)`                            | `bot.catch(fn)`                                    |
| JobQueue             | `app.job_queue.run_repeating(fn, interval)`            | `setInterval()` / `@grammyjs/runner` tasks         |
| Middleware           | Handler groups with `group=N`                          | `bot.use(middleware)` stack order                  |
| API calls            | `context.bot.restrict_chat_member(...)`                | `ctx.api.restrictChatMember(...)`                  |
| Reply                | `await update.message.reply_text(...)`                 | `await ctx.reply(...)`                             |
| Inline keyboard      | `InlineKeyboardMarkup([[InlineKeyboardButton(...)]])`  | `new InlineKeyboard().text("label", "data")`       |

### 3.2 grammY Plugin Ecosystem (Relevant)

| Plugin           | npm Package              | Use Case in Nezuko                              |
| ---------------- | ------------------------ | ----------------------------------------------- |
| **Runner**       | `@grammyjs/runner`       | Concurrent update processing for multi-bot mode |
| **Auto-Retry**   | `@grammyjs/auto-retry`   | Handle Telegram rate limits (429)               |
| **Hydrate**      | `@grammyjs/hydrate`      | Enrich API response objects with methods        |
| **Parse Mode**   | `@grammyjs/parse-mode`   | Default HTML formatting                         |
| **Chat Members** | `@grammyjs/chat-members` | Track member status changes                     |
| **Router**       | `@grammyjs/router`       | Route updates to specialized handler modules    |
| **Commands**     | `@grammyjs/commands`     | Advanced command handling                       |
| **Session**      | Built-in `session()`     | State per chat (if needed)                      |

### 3.3 grammY Context Flavor Architecture

```typescript
// Custom context type combining all necessary flavors
import { Context, SessionFlavor } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";
import { ParseModeFlavor } from "@grammyjs/parse-mode";
import { ChatMembersFlavor } from "@grammyjs/chat-members";

// Our custom context properties
interface NezukoContextFlavor {
  insforge: InsForgeClient; // Shared InsForge SDK client
  botId: number; // Current bot instance ID
  botInstanceId: number; // Database bot_instances.id
}

// Session data (minimal — most state is in InsForge DB)
interface SessionData {
  // Empty or minimal — Nezuko uses DB-first architecture
}

// Combined context type
type NezukoContext = ParseModeFlavor<
  HydrateFlavor<
    Context &
      SessionFlavor<SessionData> &
      ChatMembersFlavor &
      NezukoContextFlavor
  >
>;
```

---

## 4. Feature Mapping: Python → grammY

### 4.1 Handler Mapping

| Python Handler      | File                     | grammY Equivalent                                  | Priority |
| ------------------- | ------------------------ | -------------------------------------------------- | -------- |
| `/start`            | `admin/help.py`          | `bot.command("start", startHandler)`               | P0       |
| `/help`             | `admin/help.py`          | `bot.command("help", helpHandler)`                 | P0       |
| `/protect @channel` | `admin/setup.py`         | `bot.command("protect", protectHandler)`           | P0       |
| `/unprotect`        | `admin/setup.py`         | `bot.command("unprotect", unprotectHandler)`       | P0       |
| `/settings`         | `admin/settings.py`      | `bot.command("settings", settingsHandler)`         | P1       |
| New member join     | `events/join.py`         | `bot.on("message:new_chat_members", joinHandler)`  | P0       |
| Member left         | `events/leave.py`        | `bot.on("message:left_chat_member", leaveHandler)` | P0       |
| Join request        | `events/join_request.py` | `bot.on("chat_join_request", joinRequestHandler)`  | P1       |
| Unverified message  | `events/message.py`      | `bot.on("message:text", messageFilter)`            | P0       |
| Verify button       | `verify.py`              | `bot.callbackQuery(/^verify/, verifyHandler)`      | P0       |
| Global error        | `error.py`               | `bot.catch(errorHandler)`                          | P0       |

### 4.2 Service Mapping

| Python Service                   | grammY Equivalent                | Notes                                                |
| -------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `verification.py` (344 lines)    | `services/verification.ts`       | Use same Redis cache pattern, `@insforge/sdk` for DB |
| `protection.py` (8.6 KB)         | `services/protection.ts`         | `ctx.api.restrictChatMember()` — identical API       |
| `status_writer.py` (5 KB)        | `services/status-writer.ts`      | `setInterval()` with PATCH-then-POST UPSERT          |
| `command_worker.py` (10 KB)      | `services/command-worker.ts`     | Socket.IO + fallback polling (same pattern)          |
| `member_sync.py` (7.7 KB)        | `services/member-sync.ts`        | `setInterval()` (15min) — replaces PTB JobQueue      |
| `bot_lifecycle.py` (9.4 KB)      | `services/bot-lifecycle.ts`      | Start/stop grammY `Bot` instances                    |
| `bot_health_monitor.py` (3.9 KB) | `services/bot-health-monitor.ts` | Health checks + auto-restart                         |
| `batch_verification.py` (8.1 KB) | `services/batch-verification.ts` | Batch verify multiple users                          |

### 4.3 Core Module Mapping

| Python Core                    | grammY Equivalent                  | Notes                                               |
| ------------------------------ | ---------------------------------- | --------------------------------------------------- |
| `insforge_client.py` (20 KB)   | `core/insforge-client.ts`          | **Use `@insforge/sdk` directly** — shared with web! |
| `bot_manager.py`               | `core/bot-manager.ts`              | Coordinator — delegates to services                 |
| `bot_registry.py`              | `core/bot-registry.ts`             | `Map<number, BotInstance>` with types               |
| `cache.py` (5.7 KB)            | `core/cache.ts`                    | `ioredis` package — same Redis patterns             |
| `encryption.py` (4.8 KB)       | `core/encryption.ts`               | Node.js `crypto` — AES-256-GCM                      |
| `loader.py` (8 KB)             | `core/loader.ts`                   | Register all handlers on a `Composer`               |
| `realtime_client.py` (12.9 KB) | `core/realtime-client.ts`          | **Use `@insforge/sdk` realtime** — shared with web! |
| `constants.py`                 | `core/constants.ts`                | Shared constants                                    |
| `rate_limiter.py`              | Replaced by `@grammyjs/auto-retry` | Framework plugin                                    |
| `uptime.py`                    | `core/uptime.ts`                   | Simple timestamp tracking                           |

---

## 5. Proposed Architecture

### 5.1 Directory Structure

```
apps/grammy/
├── src/
│   ├── main.ts                      # Entry point — mode detection, bot startup
│   ├── config.ts                    # Env config (dotenv + zod validation)
│   ├── types.ts                     # NezukoContext, shared types
│   ├── core/
│   │   ├── bot-manager.ts           # Multi-bot coordinator
│   │   ├── bot-registry.ts          # Bot instance storage + types
│   │   ├── cache.ts                 # Redis client (ioredis)
│   │   ├── constants.ts             # Shared constants
│   │   ├── encryption.ts            # AES-256-GCM token decryption
│   │   ├── insforge-client.ts       # InsForge SDK wrapper (shared types with web)
│   │   ├── loader.ts                # Handler registration (Composer)
│   │   ├── realtime-client.ts       # InsForge SDK realtime subscriber
│   │   └── uptime.ts                # Uptime tracker
│   ├── handlers/
│   │   ├── admin/
│   │   │   ├── help.ts              # /start, /help commands
│   │   │   ├── settings.ts          # /settings command
│   │   │   └── setup.ts             # /protect, /unprotect commands
│   │   ├── events/
│   │   │   ├── join.ts              # New member join → mute
│   │   │   ├── join-request.ts      # Join request approval
│   │   │   ├── leave.ts             # Member left → revoke
│   │   │   └── message.ts           # Unverified user message filter
│   │   ├── error.ts                 # bot.catch() handler
│   │   └── verify.ts                # "I have joined" callback query
│   ├── services/
│   │   ├── verification.ts          # Membership check with Redis cache
│   │   ├── protection.ts            # Mute/unmute/restrict
│   │   ├── batch-verification.ts    # Batch verify
│   │   ├── status-writer.ts         # Heartbeat UPSERT (60s)
│   │   ├── command-worker.ts        # Dashboard command processing
│   │   ├── member-sync.ts           # Count sync (15min)
│   │   ├── bot-lifecycle.ts         # Start/stop bot instances
│   │   └── bot-health-monitor.ts    # Health monitoring
│   ├── database/
│   │   ├── verification-logger.ts   # Fire-and-forget verify logs
│   │   ├── api-call-logger.ts       # Fire-and-forget API call logs
│   │   └── log-handler.ts           # Console → InsForge admin_logs
│   └── utils/
│       ├── auto-delete.ts           # Auto-delete messages
│       ├── health.ts                # HTTP health server (Hono/express)
│       ├── logger.ts                # Structured logging (pino)
│       ├── metrics.ts               # Prometheus metrics (prom-client)
│       └── ui.ts                    # Message formatting helpers
├── package.json
├── tsconfig.json
├── .env                             # Bot env (same vars as Python bot)
└── .env.example
```

### 5.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     apps/grammy/ (TypeScript)                       │
│                                                                     │
│  main.ts ─────► BotManager ─────► BotLifecycleManager             │
│     │                │                    │                         │
│     │           BotRegistry          grammY Bot                     │
│     │                │            (per instance)                    │
│     │           BotHealthMonitor      │                             │
│     │                                 ├── Middleware Stack           │
│     │                                 │   ├── auto-retry            │
│     │                                 │   ├── hydrate               │
│     │                                 │   ├── parse-mode            │
│     │                                 │   ├── rate-limiter          │
│     │                                 │   └── context enricher      │
│     │                                 │                             │
│     │                                 ├── Handlers (Composer)       │
│     │                                 │   ├── admin/ (commands)     │
│     │                                 │   ├── events/ (joins/leave) │
│     │                                 │   ├── verify (callback)     │
│     │                                 │   └── error (bot.catch)     │
│     │                                 │                             │
│     │                                 └── Services                  │
│     │                                     ├── verification.ts       │
│     │                                     ├── protection.ts         │
│     │                                     ├── status-writer.ts      │
│     │                                     ├── command-worker.ts     │
│     │                                     └── member-sync.ts        │
│     │                                                               │
│     ├── InsForge SDK ──────────────► InsForge BaaS (PostgreSQL)    │
│     │   (@insforge/sdk)              Same backend as web!          │
│     │                                                               │
│     ├── Redis (ioredis) ──────────► Same Redis as Python bot       │
│     │                                                               │
│     └── Socket.IO ─────────────────► InsForge Realtime WS          │
│         (@insforge/sdk realtime)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Module-by-Module Plan

### 6.1 `core/insforge-client.ts` — **CRITICAL: Shared SDK**

**Python approach**: Custom `httpx` REST client (20 KB, 600+ lines)  
**grammY approach**: Use `@insforge/sdk` directly — **same SDK the web dashboard uses**

```typescript
// Shared SDK — no custom REST client needed!
import { insforge } from "./insforge";

// Typed wrapper functions (mirror Python's insforge_client.py API)
export async function getGroupChannels(groupId: number) {
  const { data, error } = await insforge.database
    .from("group_channel_links")
    .select("*")
    .eq("group_id", groupId);
  if (error) throw error;
  // ... join with enforced_channels
}

export async function getProtectedGroup(groupId: number) { ... }
export async function createOwner(userId: number, username: string) { ... }
export async function linkGroupChannel(groupId: number, channelId: number) { ... }
```

**Benefits**:

- ~80% code reduction vs Python's hand-rolled httpx client
- Type-safe database queries via SDK
- Shared types with web dashboard
- No URL construction, no manual headers

### 6.2 `core/encryption.ts`

Port AES-256-GCM decryption using Node.js `crypto`:

```typescript
import { createDecipheriv } from "node:crypto";

export function decryptToken(encrypted: string, masterKey: string): string {
  if (!encrypted.startsWith("v2:")) {
    throw new EncryptionError("Only v2 encrypted tokens supported");
  }
  const payload = Buffer.from(encrypted.slice(3), "hex");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(-16);
  const ciphertext = payload.subarray(12, -16);
  const key = Buffer.from(masterKey, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return (
    decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8")
  );
}
```

### 6.3 `core/cache.ts`

```typescript
import Redis from "ioredis";

// Same Redis instance as Python bot — shared cache
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export async function getCachedMembership(userId: number, channelId: number) {
  const key = `member:${channelId}:${userId}`;
  return redis.get(key);
}

export async function setCachedMembership(
  userId: number,
  channelId: number,
  isMember: boolean,
  ttl: number,
) {
  const key = `member:${channelId}:${userId}`;
  await redis.set(key, isMember ? "1" : "0", "EX", ttl);
}
```

### 6.4 Handler Examples

#### `handlers/events/join.ts`

```typescript
import { Composer } from "grammy";
import type { NezukoContext } from "../../types";
import { InlineKeyboard } from "grammy";

const join = new Composer<NezukoContext>();

join.on("message:new_chat_members", async (ctx) => {
  const newMembers = ctx.msg.new_chat_members;
  if (!newMembers) return;

  for (const member of newMembers) {
    if (member.is_bot) continue;

    // Mute the user
    await ctx.api.restrictChatMember(ctx.chat.id, member.id, {
      permissions: { can_send_messages: false },
    });

    // Get required channels
    const channels = await getGroupChannels(ctx.chat.id);
    if (!channels.length) continue;

    // Build inline keyboard
    const keyboard = new InlineKeyboard();
    for (const ch of channels) {
      keyboard
        .url(`Join ${ch.title ?? ch.channel_id}`, `https://t.me/${ch.username}`)
        .row();
    }
    keyboard.text("✅ I have joined", `verify:${ctx.chat.id}`);

    await ctx.reply(
      `Welcome ${member.first_name}! Please join the required channels and click verify.`,
      { reply_markup: keyboard, parse_mode: "HTML" },
    );
  }
});

export { join };
```

#### `handlers/verify.ts`

```typescript
const verify = new Composer<NezukoContext>();

verify.callbackQuery(/^verify:/, async (ctx) => {
  const chatId = parseInt(ctx.callbackQuery.data.split(":")[1]);
  const userId = ctx.from.id;

  const channels = await getGroupChannels(chatId);

  // Invalidate cache + re-verify
  for (const ch of channels) {
    await invalidateCache(userId, ch.channel_id);
  }

  const missing = await checkMultiMembership(userId, channels, ctx.api, chatId);

  if (missing.length > 0) {
    await ctx.answerCallbackQuery({
      text: `You still haven't joined: ${missing.map((c) => c.title).join(", ")}`,
      show_alert: true,
    });
    return;
  }

  // Unmute and cleanup
  await unmuteUser(chatId, userId, ctx.api);
  await ctx.answerCallbackQuery({
    text: "Verification successful!",
    show_alert: true,
  });
  await ctx.deleteMessage();
});

export { verify };
```

---

## 7. InsForge Integration Strategy

### 7.1 Key Principle: Use `@insforge/sdk` Everywhere

The biggest architectural win is **sharing the InsForge SDK** between the grammY bot and the web dashboard. This eliminates the need for the custom 600-line `insforge_client.py`.

```typescript
// apps/grammy/src/lib/insforge.ts
import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL!,
  anonKey: process.env.INSFORGE_ANON_KEY!,
});
```

### 7.2 Database Operations Mapping

| Python (httpx REST)                                   | TypeScript (@insforge/sdk)                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `await get_records("table", {"col": "eq.val"})`       | `await insforge.database.from("table").select("*").eq("col", val)` |
| `await post_records("table", [{...}])`                | `await insforge.database.from("table").insert([{...}])`            |
| `await patch_records("table", {"id": "eq.1"}, {...})` | `await insforge.database.from("table").update({...}).eq("id", 1)`  |
| `await delete_records("table", {"id": "eq.1"})`       | `await insforge.database.from("table").delete().eq("id", 1)`       |
| `await rpc("function_name", {...})`                   | `await insforge.database.rpc("function_name", {...})`              |

### 7.3 Realtime Subscription

```typescript
// Use @insforge/sdk realtime (same as web dashboard)
const channel = insforge.realtime.subscribe("bot_instances");

channel.on("bot_instance_changed", (payload) => {
  // Handle bot instance changes from dashboard
  handleBotInstanceChange(payload);
});
```

### 7.4 Status Writer — PATCH-then-POST UPSERT

```typescript
// Must use the EXACT same UPSERT pattern as Python bot
async function writeStatus(botId: number, instanceId: number) {
  const now = new Date().toISOString();

  // Try PATCH first
  const { data } = await insforge.database
    .from("bot_status")
    .update({
      status: "online",
      last_heartbeat: now,
      uptime_seconds: getUptime(),
    })
    .eq("bot_id", botId)
    .select();

  if (!data || data.length === 0) {
    // No row matched — INSERT
    await insforge.database.from("bot_status").insert([
      {
        bot_id: botId,
        bot_instance_id: instanceId,
        status: "online",
        last_heartbeat: now,
      },
    ]);
  }
}
```

---

## 8. Dashboard Compatibility Matrix

The Next.js dashboard must work **identically** with both the Python and grammY bot. This requires:

| Dashboard Feature   | Dependency                         | grammY Must Match                              |
| ------------------- | ---------------------------------- | ---------------------------------------------- |
| Bot status cards    | `bot_status` table                 | Same UPSERT format, same column values         |
| Verification charts | `verification_log` table           | Same `status`, `latency_ms`, `cached` columns  |
| API call analytics  | `api_call_log` table               | Same `method`, `success`, `latency_ms` columns |
| Live logs           | `admin_logs` table                 | Same `level`, `logger`, `message` columns      |
| Bot management      | `bot_instances` + `admin_commands` | Same read/write patterns                       |
| Member counts       | `protected_groups.member_count`    | Same sync frequency and values                 |
| Realtime events     | Socket.IO channels                 | Same event names and payload shapes            |

> [!IMPORTANT]
> Every database write from the grammY bot MUST produce rows **identical in structure** to the Python bot's writes. The dashboard code must not need ANY changes.

---

## 9. Plugin Selection & Justification

| Plugin            | Package                  | Why                                                                           | Priority            |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------- | ------------------- |
| **Auto-Retry**    | `@grammyjs/auto-retry`   | Handles 429 rate limits automatically — replaces Python's manual rate limiter | P0                  |
| **Hydrate**       | `@grammyjs/hydrate`      | Enrich API responses with methods (e.g., `msg.editText()`) — cleaner code     | P1                  |
| **Parse Mode**    | `@grammyjs/parse-mode`   | Default HTML parse mode — avoid repeating `{ parse_mode: "HTML" }`            | P0                  |
| **Runner**        | `@grammyjs/runner`       | Concurrent update processing — essential for multi-bot mode                   | P0 (dashboard mode) |
| **Sequentialize** | `@grammyjs/runner`       | Prevent session/cache race conditions in concurrent mode                      | P0 (with runner)    |
| **Chat Members**  | `@grammyjs/chat-members` | Track member status changes efficiently                                       | P2                  |

### NOT Selected (with reasons)

| Plugin            | Why Not                                                           |
| ----------------- | ----------------------------------------------------------------- |
| **Session**       | Nezuko uses DB-first architecture — no local session state needed |
| **Conversations** | No multi-step conversation flows in Nezuko                        |
| **Menu**          | Inline keyboards are simple enough — no dynamic menus             |
| **i18n**          | Single-language (English) bot                                     |
| **Router**        | `Composer` modules sufficient for our handler structure           |
| **Throttler**     | `auto-retry` handles this better at the API call level            |

---

## 10. Quality & Testing Strategy

### 10.1 Quality Gates

| Check       | Tool                    | Target      |
| ----------- | ----------------------- | ----------- |
| Type safety | `tsc --noEmit` (strict) | 0 errors    |
| Lint        | ESLint (flat config)    | 0 warnings  |
| Format      | Prettier                | Auto-format |
| Tests       | vitest                  | All pass    |
| Build       | `bun run build`         | Exit 0      |

### 10.2 Testing Architecture

```
tests/grammy/
├── core/
│   ├── encryption.test.ts
│   ├── cache.test.ts
│   └── insforge-client.test.ts
├── handlers/
│   ├── join.test.ts
│   ├── verify.test.ts
│   └── setup.test.ts
├── services/
│   ├── verification.test.ts
│   ├── protection.test.ts
│   └── status-writer.test.ts
└── utils/
    └── auto-delete.test.ts
```

### 10.3 Test Approach

- **Mock grammY**: Use grammY test utilities for context mocking
- **Mock InsForge**: Mock `@insforge/sdk` at the module level
- **Mock Redis**: Use `ioredis-mock` for cache tests
- **Parity tests**: Validate that DB writes match Python bot's output format

---

## 11. Risk Assessment

| Risk                             | Impact                                                            | Probability | Mitigation                                                   |
| -------------------------------- | ----------------------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| **InsForge SDK differences**     | DB writes don't match Python bot format                           | Medium      | Write parity test suite comparing output formats             |
| **grammY API gaps**              | Missing Telegram API features                                     | Low         | grammY wraps full Bot API — check `grammy/types`             |
| **Redis cache incompatibility**  | Different key formats between Python/TS bots                      | High        | Use SAME key format: `member:{channel_id}:{user_id}`         |
| **Multi-bot complexity**         | `@grammyjs/runner` behaves differently than PTB                   | Medium      | Start with single-bot mode, add multi-bot incrementally      |
| **AES-256-GCM compatibility**    | Node.js crypto produces different output than Python cryptography | Low         | Both use standard AES-256-GCM — write compatibility tests    |
| **Realtime subscription format** | Socket.IO event payloads differ                                   | Medium      | Use `@insforge/sdk` realtime — same as web dashboard         |
| **Dashboard breaking**           | grammY bot writes non-matching data                               | Critical    | Integration test suite validates all 10 table writes         |
| **BIGINT handling**              | JavaScript loses precision for Telegram IDs > 2^53                | Low         | Telegram IDs fit in JS `number` (up to 2^53, ~9 quadrillion) |

---

## 12. Migration Switchover Plan

### Phase A: Parallel Running (Development)

```
                    ┌──────────────┐
                    │   InsForge   │
                    │   BaaS DB    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──────┐     │    ┌───────▼────────┐
    │  Python Bot     │     │    │  grammY Bot     │
    │  (apps/bot/)    │     │    │  (apps/grammy/) │
    │  PORT: active   │     │    │  PORT: testing  │
    └────────────────┘     │    └────────────────┘
                           │
              ┌────────────▼────────────┐
              │     Next.js Dashboard    │
              │      (apps/web/)         │
              └──────────────────────────┘
```

- Both bots read from same DB, **only one writes at a time**
- Test grammY bot with a separate Telegram bot token
- Validate dashboard shows correct data from grammY writes

### Phase B: Switchover

1. Stop Python bot
2. Point `BOT_TOKEN` to production token in `apps/grammy/.env`
3. Start grammY bot in production mode
4. Dashboard works unchanged — reads same tables
5. Monitor for 24-48 hours

### Phase C: Cleanup (Optional)

- Remove `apps/bot/` Python code
- Update `GEMINI.md` and memory bank
- Update CI/CD pipelines
- Unify all package management under `bun`

---

## 13. Implementation Phases

### Phase 1: Foundation (Priority: P0)

| Task    | Description                                                            | Effort |
| ------- | ---------------------------------------------------------------------- | ------ |
| **1.1** | Initialize `apps/grammy/` — `package.json`, `tsconfig.json`, env files | 1h     |
| **1.2** | Create `types.ts` — `NezukoContext`, all shared types                  | 1h     |
| **1.3** | Create `config.ts` — Zod-validated env config                          | 1h     |
| **1.4** | Create `core/insforge-client.ts` — `@insforge/sdk` wrapper             | 2h     |
| **1.5** | Create `core/encryption.ts` — AES-256-GCM decryption                   | 1h     |
| **1.6** | Create `core/cache.ts` — Redis client (ioredis)                        | 1h     |
| **1.7** | Create `core/constants.ts` — shared constants                          | 0.5h   |

### Phase 2: Core Bot (Priority: P0)

| Task    | Description                                                  | Effort |
| ------- | ------------------------------------------------------------ | ------ |
| **2.1** | Create `main.ts` — entry point with mode detection           | 2h     |
| **2.2** | Create `core/loader.ts` — handler registration               | 1h     |
| **2.3** | Create `handlers/error.ts` — `bot.catch()` handler           | 0.5h   |
| **2.4** | Create `handlers/admin/help.ts` — `/start`, `/help`          | 1h     |
| **2.5** | Create `handlers/admin/setup.ts` — `/protect`, `/unprotect`  | 2h     |
| **2.6** | Create `handlers/events/join.ts` — new member mute           | 2h     |
| **2.7** | Create `handlers/verify.ts` — callback query handler         | 2h     |
| **2.8** | Create `services/verification.ts` — membership check + cache | 3h     |
| **2.9** | Create `services/protection.ts` — mute/unmute/restrict       | 1.5h   |

### Phase 3: Background Services (Priority: P0)

| Task    | Description                                                | Effort |
| ------- | ---------------------------------------------------------- | ------ |
| **3.1** | Create `services/status-writer.ts` — 60s heartbeat         | 1.5h   |
| **3.2** | Create `database/verification-logger.ts` — fire-and-forget | 1h     |
| **3.3** | Create `database/api-call-logger.ts` — fire-and-forget     | 1h     |
| **3.4** | Create `database/log-handler.ts` — structured log → DB     | 1.5h   |
| **3.5** | Create `services/member-sync.ts` — 15min count sync        | 2h     |
| **3.6** | Create `services/command-worker.ts` — dashboard commands   | 2h     |

### Phase 4: Event Handlers (Priority: P1)

| Task    | Description                                              | Effort |
| ------- | -------------------------------------------------------- | ------ |
| **4.1** | Create `handlers/events/leave.ts` — member left          | 1.5h   |
| **4.2** | Create `handlers/events/message.ts` — message filter     | 1.5h   |
| **4.3** | Create `handlers/events/join-request.ts` — join requests | 1.5h   |
| **4.4** | Create `handlers/admin/settings.ts` — settings command   | 1.5h   |
| **4.5** | Create `services/batch-verification.ts` — batch verify   | 2h     |

### Phase 5: Multi-Bot + Dashboard Mode (Priority: P0)

| Task    | Description                                               | Effort |
| ------- | --------------------------------------------------------- | ------ |
| **5.1** | Create `core/bot-registry.ts` — instance storage          | 1.5h   |
| **5.2** | Create `services/bot-lifecycle.ts` — start/stop instances | 3h     |
| **5.3** | Create `services/bot-health-monitor.ts` — health checks   | 2h     |
| **5.4** | Create `core/bot-manager.ts` — coordinator                | 2h     |
| **5.5** | Create `core/realtime-client.ts` — InsForge realtime      | 2h     |

### Phase 6: Utilities & Polish (Priority: P1)

| Task    | Description                                          | Effort |
| ------- | ---------------------------------------------------- | ------ |
| **6.1** | Create `utils/auto-delete.ts` — auto-delete messages | 0.5h   |
| **6.2** | Create `utils/health.ts` — HTTP health server        | 1h     |
| **6.3** | Create `utils/logger.ts` — pino structured logging   | 1h     |
| **6.4** | Create `utils/metrics.ts` — Prometheus metrics       | 1h     |
| **6.5** | Create `utils/ui.ts` — message formatting            | 0.5h   |

### Phase 7: Testing + Integration (Priority: P0)

| Task    | Description                                 | Effort |
| ------- | ------------------------------------------- | ------ |
| **7.1** | Write tests for core modules                | 4h     |
| **7.2** | Write tests for handlers                    | 3h     |
| **7.3** | Write tests for services                    | 3h     |
| **7.4** | Write parity tests (DB output format)       | 2h     |
| **7.5** | Integration test with real InsForge backend | 2h     |

### Total Estimated Effort: ~60 hours

---

## 14. Open Questions

Before starting implementation, we should resolve these:

1. **Package manager**: Use `bun` (same as web) or `npm`? → Recommendation: **bun** for consistency
2. **Logging library**: `pino` vs `winston` vs `console`? → Recommendation: **pino** (fast, structured JSON)
3. **HTTP health server**: `hono` vs `express` vs bare `http`? → Recommendation: **hono** (lightweight, modern)
4. **Testing framework**: `vitest` vs `jest`? → Recommendation: **vitest** (Vite-native, fast, TS-first)
5. **Multi-bot concurrency**: `@grammyjs/runner` or `bot.start()` per instance? → Recommendation: `run(bot)` for multi-bot
6. **Shared types**: Create a shared `packages/shared/` for types used by both `apps/grammy/` and `apps/web/`? → Recommendation: Start in `apps/grammy/`, extract if needed
7. **Docker**: New Dockerfile for grammY or share with Python? → Separate `Dockerfile.grammy`
8. **Environment variables**: Same `.env` format as Python bot? → Yes, for switchover ease

---

> [!NOTE]
> This plan is designed so the grammY bot can be developed **in parallel** with the existing Python bot, sharing the same InsForge backend. The Next.js dashboard will work with **either** bot engine, since both produce identical database writes.

---

_Generated: 2026-03-03 | Based on comprehensive analysis of 25+ Python bot files, 86 grammY reference documents, InsForge SDK docs, and the existing Nezuko platform architecture._
