# 🚀 Nezuko grammY Bot — Production-Ready PRD & Implementation Blueprint

> **Version**: 3.3 | **Date**: 2026-03-03 | **Lines**: 3,300+ | **Decisions**: 37  
> **Scope**: Build `apps/grammy/` from scratch using grammY best practices — NOT a migration  
> **Philosophy**: Reference existing features, rebuild with grammY-native architecture  
> **grammY Version**: v1.40.1 (Bot API 9.4) | **Runtime**: Bun 1.3.10 + Node.js 22 LTS  

---

## Table of Contents

### Part I — Vision & Foundation

1. [Vision & Philosophy](#1-vision--philosophy)
   - 1.1 What We're Building
   - 1.2 What We're NOT Doing
   - 1.3 Why Rebuild Instead of Migrate
   - 1.4 Feature Scope (From Existing Bot Reference)
2. [Why grammY — Deep Framework Analysis](#2-why-grammy--deep-framework-analysis)
   - 2.1 Framework Overview
   - 2.2 Architecture Strengths
   - 2.3 Bot API Coverage
   - 2.4 Context Object
3. [grammY Pros, Cons & Comparison](#3-grammy-pros-cons--comparison)
   - 3.1 Detailed Pros
   - 3.2 Detailed Cons
   - 3.3 Framework Comparison Matrix
   - 3.4 Why grammY Over Telegraf

### Part II — Architecture & Core Concepts

4. [Architecture — Built for grammY](#4-architecture--built-for-grammy)
   - 4.1 High-Level Architecture
   - 4.2 Middleware Execution Flow
   - 4.3 Key Design Decisions
5. [grammY Core Concepts Deep Dive](#5-grammy-core-concepts-deep-dive)
   - 5.1 Bot Instance Creation
   - 5.2 Middleware System (The Tree, Not a Stack)
   - 5.3 Commands
   - 5.4 Callback Queries
   - 5.5 Inline Keyboards
   - 5.6 Bot API Calls
   - 5.7 Transformer Functions
6. [Plugin Selection & Configuration](#6-plugin-selection--configuration)
   - 6.1 Selected Plugins (7 plugins with install code)
   - 6.2 Plugins NOT Selected (7 rejected with reasons)
7. [Context Type System](#7-context-type-system)
   - 7.1 Custom Context Design
   - 7.2 Context Enricher Middleware
8. [Project Structure](#8-project-structure)
   - 8.1 Directory Layout (~30 files)
   - 8.2 Why This Structure

### Part III — Module Blueprints & Database

9. [Module-by-Module Blueprint](#9-module-by-module-blueprint)
   - 9.1 Entry Point — `main.ts`
   - 9.2 Bot Factory — `core/bot-factory.ts`
   - 9.3 Admin Composer — `composers/admin.ts`
   - 9.4 Events Composer — `composers/events.ts`
   - 9.5 Verify Composer — `composers/verify.ts`
   - 9.6 Verification Service — `services/verification.ts`
10. [Database Strategy (InsForge REST)](#10-database-strategy-insforge-rest)
    - 10.1 InsForge REST Client (TypeScript port)
    - 10.2 Repository Interface
    - 10.3 InsForge Client Implementation
    - 10.4 Configuration

### Part IV — Reliability & Deployment

11. [Error Handling & Reliability](#11-error-handling--reliability)
    - 11.1 grammY Error Hierarchy
    - 11.2 Global Error Handler
    - 11.3 Error Boundaries (Per-Composer)
    - 11.4 Graceful Shutdown
12. [Scaling & Concurrency](#12-scaling--concurrency)
    - 12.1 Single-Bot Mode (Development)
    - 12.2 Multi-Bot Mode (Dashboard/Production)
    - 12.3 Background Services (No JobQueue Needed)
13. [Deployment Strategy](#13-deployment-strategy)
    - 13.1 Long Polling vs Webhooks
    - 13.2 Docker Configuration
    - 13.3 Environment Variables

### Part V — Testing & Quality

14. [Testing Strategy](#14-testing-strategy)
    - 14.1 Test Architecture
    - 14.2 Testing with grammY
    - 14.3 Mock Update Factory
15. [Quality Gates](#15-quality-gates)
    - 15.1 TypeScript Checks
    - 15.2 Test Checks
    - 15.3 Build
    - 15.4 tsconfig.json
16. [Implementation Phases](#16-implementation-phases)
    - Phase 1: Foundation (8h — P0)
    - Phase 2: Core Infrastructure (10h — P0)
    - Phase 3: Core Bot Logic (12h — P0)
    - Phase 4: Background Services (6h — P1)
    - Phase 5: Multi-Bot Mode (10h — P1)
    - Phase 6: Testing (10h — P0)
    - Phase 7: Polish & Production (4h — P1)

### Part VI — Future & References

17. [Dashboard Compatibility (Future)](#17-dashboard-compatibility-future)
18. [Risk Assessment](#18-risk-assessment)
19. [Brainstorming Decisions Log](#19-brainstorming-decisions-log)
20. [Appendix: Official Code References](#20-appendix-official-code-references)

### Part VII — Diagrams, Versions & Edge Cases

21. [Architecture & Flow Diagrams](#21-architecture--flow-diagrams) *(7 Mermaid diagrams)*
    - Diagram 1: Bot Startup Sequence
    - Diagram 2: Middleware Pipeline
    - Diagram 3: Verification Flow (complete)
    - Diagram 4: `/protect` Command Flow
    - Diagram 5: Multi-Bot Dashboard Mode
    - Diagram 6: Message Filtering Pipeline
    - Diagram 7: Error Handling Architecture
22. [Pinned Dependency Versions (March 2026)](#22-pinned-dependency-versions-latest-as-of-march-2026)
    - 22.1 Core Dependencies (12 packages)
    - 22.2 Dev Dependencies (7 packages)
    - 22.3 Runtime (Bun, Node, Redis)
    - 22.4 package.json (exact versions)
    - 22.5 Version Selection Rationale
23. [Comprehensive Edge Case Catalog](#23-comprehensive-edge-case-catalog) *(70 edge cases)*
    - 23.1 New Member Join (EC-1 to EC-10)
    - 23.2 Verification / Callback Query (EC-11 to EC-20)
    - 23.3 Leave Detection (EC-21 to EC-25)
    - 23.4 Protection Setup (EC-26 to EC-34)
    - 23.5 Message Filtering (EC-35 to EC-41)
    - 23.6 getChatMember API (EC-42 to EC-47)
    - 23.7 Bot Permissions (EC-48 to EC-52)
    - 23.8 Multi-Bot Mode (EC-53 to EC-58)
    - 23.9 Cache & Database (EC-59 to EC-63)
    - 23.10 Telegram API (EC-64 to EC-70)
    - 23.11 Edge Case Summary

---

## 1. Vision & Philosophy

### 1.1 What We're Building

A **production-ready group management Telegram bot** built from scratch using the **grammY framework** and **TypeScript**. The bot enforces channel membership verification in Telegram groups — users must join required channels before they can participate.

### 1.2 What We're NOT Doing

| ❌ NOT Doing | ✅ Instead |
|---|---|
| Migrating PTB code line-by-line | Building from scratch with grammY idioms |
| Copying Python patterns | Using grammY middleware architecture |
| Using PTB's handler groups model | Using grammY's Composer tree + filter queries |
| Porting `insforge_client.py` | Local SQLite in dev, InsForge SDK when ready |
| Working around PTB's async quirks | Leveraging Node.js native async/await |

### 1.3 Why Rebuild Instead of Migrate

The existing Python bot works but has accumulated technical debt:

1. **Custom REST client** (600+ lines) where an SDK call would suffice
2. **Handler group ordering** that's fragile and implicit
3. **Manual rate limiting** where `auto-retry` plugin handles it natively
4. **Separate language** from the web dashboard, preventing code sharing
5. **Pyrefly + Pylint + Ruff** triple-checking where TSC strict does it natively
6. **No middleware composition** — PTB's handler groups don't compose like grammY's tree

By rebuilding, we get:
- **grammY-native patterns** from day one
- **Type-safe from core** — TypeScript strict mode with grammY's excellent type system
- **Plugin ecosystem** instead of hand-rolled solutions
- **Code sharing** with the Next.js dashboard (same language, same SDK)
- **Cleaner architecture** designed around grammY's middleware tree

### 1.4 Feature Scope (From Existing Bot Reference)

These features are what the bot needs — referenced from the working bot, but implemented fresh:

| Feature | What It Does | Priority |
|---|---|---|
| **Join Mute** | Restrict new members until they verify | P0 |
| **Verify Button** | Inline keyboard → check membership → unmute | P0 |
| **Multi-Channel Check** | Verify membership across multiple channels | P0 |
| **Protection Setup** | `/protect @channel` links a channel to a group | P0 |
| **Leave Detection** | Revoke permissions when users leave channels | P0 |
| **Message Filter** | Delete messages from unverified users | P0 |
| **Admin Commands** | `/help`, `/settings`, `/start`, `/unprotect` | P0 |
| **Status Heartbeat** | Periodic health status writes to DB | P1 |
| **Dashboard Commands** | Process commands sent from web dashboard | P1 |
| **Member Count Sync** | Periodic member/subscriber count updates | P1 |
| **Multi-Bot Mode** | Run multiple bot instances from DB tokens | P1 |
| **Batch Verification** | Verify multiple pending users at once | P2 |
| **Join Request Handling** | Auto-approve/deny join requests | P2 |

---

## 2. Why grammY — Deep Framework Analysis

### 2.1 Framework Overview

**grammY** (v1.40.1) is a modern Telegram Bot framework for TypeScript/JavaScript:

- **Created by**: [@KnorpelSenf](https://github.com/KnorpelSenf) and community
- **License**: MIT
- **Bot API Support**: 9.4 (latest as of Feb 2026)
- **Runtime**: Node.js, Deno, Bun, Cloudflare Workers, browsers
- **npm**: `grammy` — 1.4M+ downloads
- **GitHub Stars**: 2,500+
- **Plugin Ecosystem**: 20+ official plugins

### 2.2 Architecture Strengths

#### Middleware Tree (Not Stack)

Unlike Express/Koa's linear middleware stack, grammY builds a **middleware tree** using `Composer`:

```typescript
// grammY's tree — each branch filters independently
const bot = new Bot<MyContext>(token);

// Branch 1: Admin commands (only runs for admins)
const admin = new Composer<MyContext>();
admin.command("protect", protectHandler);
admin.command("settings", settingsHandler);

// Branch 2: Events (only runs for specific events)
const events = new Composer<MyContext>();
events.on("message:new_chat_members", joinHandler);
events.on("message:left_chat_member", leaveHandler);

// Branch 3: Verification (only runs for callback queries)
bot.callbackQuery(/^verify:/, verifyHandler);

// Register branches — order DOES matter for same-type handlers
bot.use(admin);
bot.use(events);
```

> **Source**: [grammY Advanced Middleware](./agents/skills/grammy/references/advanced/middleware.md) — "behind the scenes, it really is a tree... grammY preserves the tree you specified"

#### Filter Query System

grammY's filter queries are a type-safe DSL for matching updates:

```typescript
// Basic filter
bot.on("message:text", handler);           // Text messages
bot.on("message:photo", handler);          // Photo messages
bot.on("callback_query:data", handler);    // Callback with data

// Compound filters
bot.on("message:new_chat_members", handler); // New member join
bot.on("message:left_chat_member", handler); // Member left
bot.on("chat_join_request", handler);        // Join request

// Shorthand for common patterns
bot.on(":text", handler);    // Text in messages or channel posts
bot.on(":photo", handler);   // Photos anywhere
bot.on("::url", handler);    // Any entity containing a URL
```

> **Source**: [Filter Queries Guide](./agents/skills/grammy/references/guide/filter-queries.md) — "Filter queries are a unified query system for the Telegram Bot API... The special part is that you can filter down update objects"

#### Type Narrowing

When you use a filter query, TypeScript **automatically narrows** the context type:

```typescript
bot.on("message:text", (ctx) => {
  // TypeScript KNOWS ctx.msg.text exists here — no optional chaining needed!
  const text: string = ctx.msg.text; // ← guaranteed string, not string | undefined
});

bot.on("callback_query:data", (ctx) => {
  // TypeScript KNOWS ctx.callbackQuery.data exists
  const data: string = ctx.callbackQuery.data; // ← guaranteed string
});
```

### 2.3 Bot API Coverage

grammY ships with **complete Bot API type definitions** via `@grammyjs/types`:

```typescript
import { type Chat, type User, type Message } from "grammy/types";

// All 200+ Bot API types are available and always up-to-date
// grammY updates within days of new Bot API releases
```

### 2.4 Context Object

The `Context` object is the heart of grammY — it provides:

```typescript
// ctx.msg — the message (narrowed by filter)
// ctx.chat — the chat object
// ctx.from — the sender
// ctx.api — the API client for this bot
// ctx.reply() — shortcut for ctx.api.sendMessage(ctx.chat.id, ...)
// ctx.deleteMessage() — delete the current message
// ctx.banAuthor() — ban the message sender
// ctx.react("👍") — react to the message
```

> **Source**: [Context Guide](./agents/skills/grammy/references/guide/context.md) — "The context object is the most important part of grammY"

---

## 3. grammY Pros, Cons & Comparison

### 3.1 Detailed Pros

| Category | Advantage | Details |
|---|---|---|
| **Type Safety** | Full TypeScript-first design | All API methods, filter queries, and plugins are type-safe. Context types narrow automatically with filter queries. No `any` types. |
| **Middleware Architecture** | Koa-style `async/await` middleware tree | Composable, testable, no handler group numbering. `Composer` enables modular code structure. |
| **Filter Queries** | Domain-specific query language | `"message:text"`, `"callback_query:data"`, `":photo"` — type-safe, auto-completing, composable with `AND` (`.filter()`) and `OR` (array). |
| **Plugin Ecosystem** | 20+ official plugins | `auto-retry`, `runner`, `hydrate`, `parse-mode`, `commands`, `session`, `router`, `ratelimiter`, `chat-members`, `conversations`, `i18n`, `menu`, etc. |
| **Multi-Runtime** | Node.js, Deno, Bun, CF Workers | Same codebase runs everywhere. `webhookCallback` supports 15+ web framework adapters. |
| **API Completeness** | Bot API 9.4 support | Updates within days of new Bot API releases. Full `@grammyjs/types` package. |
| **Error Handling** | Structured error hierarchy | `BotError` wraps `GrammyError` (API errors) and `HttpError` (network errors). `bot.catch()` + `errorBoundary()`. |
| **Transformer Functions** | Outgoing request middleware | Intercept and modify outgoing API calls. Used by `auto-retry`, `parse-mode`, `throttler`. |
| **Deep Linking** | Built-in support | `ctx.match` contains the `/start` payload automatically. |
| **Concurrent Processing** | `@grammyjs/runner` | Process updates concurrently with `run(bot)`. `sequentialize` prevents race conditions. |
| **Community** | Active Telegram group + GitHub | Fast issue resolution, regular updates, good documentation. |
| **Performance** | Minimal overhead | ~2MB installed, fast startup, efficient long polling. |
| **Testing** | `bot.handleUpdate()` | Send mock update objects directly. Transformer functions for mocking API calls. |

### 3.2 Detailed Cons

| Category | Limitation | Mitigation |
|---|---|---|
| **Maturity** | Younger than PTB/Telegraf | Actively maintained, 2,500+ stars, used in production bots. v1.x is stable. |
| **Testing Framework** | No official test utils | Use `bot.handleUpdate()` + transformer mocking. Community examples exist. |
| **No Built-in JobQueue** | No equivalent to PTB's `JobQueue` | Use `setInterval()`, `node-cron`, or OS-level scheduling. Actually simpler. |
| **No Built-in DB** | No database abstraction | By design — use any DB you want. We use Prisma + SQLite (dev) → InsForge (prod). |
| **Documentation Gaps** | Some advanced patterns underdocumented | 86 reference files in our skill folder. Context7 has 4,247 code snippets. |
| **Node.js Memory** | Larger runtime than Python for small bots | Negligible for our use case. Bun makes it even faster. |
| **Webhook Complexity** | Timeout handling requires care | Use `webhookCallback` with proper timeout config. Or just use long polling. |

### 3.3 Framework Comparison Matrix

| Feature | grammY | python-telegram-bot | Telegraf | node-telegram-bot-api |
|---|---|---|---|---|
| **Language** | TypeScript | Python | TypeScript | JavaScript |
| **Bot API** | 9.4 | 7.x+ | 7.x+ | 6.x+ |
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (Pyrefly) | ⭐⭐⭐ | ⭐ |
| **Middleware** | Tree (Koa-style) | Handler groups | Linear stack | Callbacks |
| **Plugins** | 20+ official | Few | ~10 | None |
| **Filter System** | Query DSL | `filters.*` | `.on()` | Manual |
| **Concurrency** | `@grammyjs/runner` | asyncio | Manual | Manual |
| **Rate Limiting** | `auto-retry` plugin | Manual | Manual | Manual |
| **Error Types** | `BotError/GrammyError/HttpError` | `TelegramError` | `TelegrafError` | Generic |
| **Multi-Runtime** | Node/Deno/Bun/CF | Python only | Node only | Node only |
| **Context Flavors** | Full type extension | Limited | Limited | None |
| **Active Development** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Bundle Size** | ~2MB | ~50MB (with deps) | ~5MB | ~1MB |

### 3.4 Why grammY Over Telegraf

Telegraf is the older Node.js alternative. grammY wins because:

1. **Better TypeScript** — grammY was built for TS from day one; Telegraf was JS-first
2. **Filter queries** — Telegraf has basic `.on()`, grammY has a full query DSL
3. **Context flavors** — Type-safe context extension, not possible in Telegraf
4. **Plugin architecture** — Official plugin ecosystem vs scattered community plugins
5. **Transformer functions** — Intercept outgoing API calls (unique to grammY)
6. **Active development** — grammY updates within days of new Bot API; Telegraf lags
7. **Multi-runtime** — grammY runs on Deno, Bun, CF Workers; Telegraf is Node-only

---

## 4. Architecture — Built for grammY

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       apps/grammy/ (TypeScript)                  │
│                                                                  │
│  main.ts ──► Bot<NezukoContext>(token)                          │
│     │                                                            │
│     ├── Middleware Stack (order matters)                         │
│     │   1. auto-retry        (transformer — handles 429s)       │
│     │   2. parse-mode        (transformer — default HTML)       │
│     │   3. hydrate           (middleware — enrich responses)     │
│     │   4. ratelimiter       (middleware — user flood protect)   │
│     │   5. contextEnricher   (middleware — inject services)      │
│     │                                                            │
│     ├── Handler Tree (Composers)                                │
│     │   ├── adminComposer    → /start, /help, /protect, etc.   │
│     │   ├── eventsComposer   → joins, leaves, messages         │
│     │   ├── verifyComposer   → callback queries                │
│     │   └── bot.catch()      → global error handler            │
│     │                                                            │
│     ├── Services (business logic)                               │
│     │   ├── verification.ts  → membership check + cache        │
│     │   ├── protection.ts    → mute/unmute users               │
│     │   ├── status-writer.ts → heartbeat (setInterval)         │
│     │   └── member-sync.ts   → count sync (setInterval)        │
│     │                                                            │
│     ├── Database (abstracted)                                   │
│     │   ├── DEV:  Prisma + SQLite (local, zero config)         │
│     │   └── PROD: @insforge/sdk (cloud PostgreSQL)             │
│     │                                                            │
│     └── Cache                                                   │
│         └── ioredis → same Redis as existing bot               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Middleware Execution Flow

```
Update arrives → auto-retry (transformer, wraps API calls)
              → parse-mode (transformer, sets default HTML)
              → hydrate (middleware, enriches ctx objects)
              → ratelimiter (middleware, drops spam)
              → contextEnricher (middleware, injects db/cache)
              → Composer tree routing:
                  IF /command → adminComposer
                  IF new_member → eventsComposer.joinHandler
                  IF left_member → eventsComposer.leaveHandler
                  IF callback_query → verifyComposer
                  IF message:text → eventsComposer.messageFilter
                  ELSE → ignored (no next())
              → bot.catch() if any error
```

### 4.3 Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Deployment type** | Long polling (`bot.start()`) | Simpler, no SSL needed, `grammyjs/runner` for concurrency |
| **Middleware order** | Transformers first, then middleware, then handlers | grammY best practice — transformers wrap outgoing, middleware wraps incoming |
| **Handler structure** | `Composer` per feature domain | Modular, testable, each Composer can be developed independently |
| **State management** | DB-first, no sessions | Nezuko doesn't need per-chat state — all data is in the database |
| **Concurrency** | `bot.start()` for single-bot, `run(bot)` for multi-bot | `@grammyjs/runner` only needed for dashboard mode |
| **Package manager** | bun | Same as web dashboard, faster than npm |
| **Database** | Prisma + SQLite (dev) → InsForge SDK (prod) | Zero-config local development, production-ready cloud backend |

---

## 5. grammY Core Concepts Deep Dive

### 5.1 Bot Instance Creation

```typescript
// Source: grammy/references/guide/getting-started.md
import { Bot } from "grammy";

// Simple creation
const bot = new Bot<NezukoContext>("BOT_TOKEN");

// With configuration
const bot = new Bot<NezukoContext>("BOT_TOKEN", {
  client: {
    // Custom API root (for local Bot API server)
    apiRoot: "https://api.telegram.org",
    // Webhook reply optimization (only if using webhooks)
    canUseWebhookReply: (method) => method === "sendChatAction",
  },
  // Pre-set bot info to avoid getMe call on startup
  botInfo: {
    id: 123456789,
    is_bot: true,
    first_name: "Nezuko",
    username: "nezuko_bot",
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
  },
});
```

> **Source**: [API Guide](./agents/skills/grammy/references/guide/api.md) — "`bot.api` is simply an instance of `Api` that is pre-constructed for you for convenience"

### 5.2 Middleware System (The Tree, Not a Stack)

```typescript
// Source: grammy/references/advanced/middleware.md
// grammY's Composer builds a tree, not a flat stack

const bot = new Bot<NezukoContext>(token);

// Each .use() creates a branch in the tree
const branch1 = new Composer<NezukoContext>();
branch1.use(/* A */);
branch1.use(/* B */);

const branch2 = new Composer<NezukoContext>();
branch2.use(/* C */);

// Installing composers — tree is traversed depth-first
bot.use(branch1); // A, B run first
bot.use(branch2); // C runs after

// Chaining creates sub-branches
bot.use(/* D */).use(/* E */); // E is child of D, only runs if D calls next()

// Filtering creates guarded branches
bot.filter(predicate, /* F */); // F only runs if predicate returns true
bot.on("message:text", /* G */); // G only runs for text messages
```

**Key insight**: Unlike Express where middleware is flat, grammY's tree means:
- Handlers **DON'T need to call `next()`** unless they want downstream handlers to also process the update
- Filter queries **automatically stop traversal** for non-matching updates
- Each `Composer` is an independent branch that can be developed/tested in isolation

### 5.3 Commands

```typescript
// Source: grammy/references/guide/commands.md
bot.command("start", (ctx) => ctx.reply("Welcome!"));
bot.command("help", (ctx) => ctx.reply("Available commands..."));

// Multiple commands at once
bot.command(["a", "b", "c"], (ctx) => ctx.reply("You used a, b, or c"));

// Command arguments via ctx.match
bot.command("protect", (ctx) => {
  const channelUsername = ctx.match; // "/protect @channel" → "@channel"
  // ...
});

// Deep linking: https://t.me/bot?start=payload
bot.command("start", (ctx) => {
  const payload = ctx.match; // "payload"
});

// Set command menu
await bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Show help text" },
  { command: "protect", description: "Protect this group" },
  { command: "settings", description: "Bot settings" },
]);
```

### 5.4 Callback Queries

```typescript
// Source: grammy/references/guide/filter-queries.md
// Handle callback queries (inline keyboard button clicks)

// String match
bot.callbackQuery("verify", (ctx) => { /* exact match */ });

// Regex match — essential for our verify:chatId pattern
bot.callbackQuery(/^verify:(\d+)$/, async (ctx) => {
  const chatId = parseInt(ctx.match[1]); // regex capture group!
  const userId = ctx.from.id;
  // ... verify membership
  await ctx.answerCallbackQuery({ text: "Verified!", show_alert: true });
});

// IMPORTANT: Always answer callback queries
// Source: grammy/references/advanced/deployment.md
// "Use bot.on('callback_query:data') as the fallback handler to react to all callback queries"
bot.on("callback_query:data", (ctx) => ctx.answerCallbackQuery());
```

### 5.5 Inline Keyboards

```typescript
// Source: grammy/references/plugins/keyboard.md
import { InlineKeyboard } from "grammy";

// Build keyboard fluently
const keyboard = new InlineKeyboard()
  .url("Join Channel 1", "https://t.me/channel1")
  .row()
  .url("Join Channel 2", "https://t.me/channel2")
  .row()
  .text("✅ I have joined", `verify:${chatId}`);

await ctx.reply("Please join the channels:", {
  reply_markup: keyboard,
});
```

### 5.6 Bot API Calls

```typescript
// Source: grammy/references/guide/api.md
// Two ways to make API calls:

// 1. Via context shortcuts (preferred — auto-fills chat_id)
await ctx.reply("Hello!");
await ctx.deleteMessage();
await ctx.banAuthor();

// 2. Via ctx.api (when you need to target a different chat)
await ctx.api.sendMessage(otherChatId, "Hello!");
await ctx.api.restrictChatMember(chatId, userId, {
  permissions: { can_send_messages: false },
});
await ctx.api.getChatMember(channelId, userId);

// 3. Via bot.api (outside handlers)
await bot.api.sendMessage(chatId, "System message");

// Raw API access (use original Telegram parameter names)
await bot.api.raw.sendMessage({
  chat_id: 12345,
  text: "<b>Hello!</b>",
  parse_mode: "HTML",
});
```

### 5.7 Transformer Functions

```typescript
// Source: grammy/references/advanced/transformers.md
// Transformers intercept OUTGOING API calls (opposite of middleware)

// Install on bot.api — affects ALL API calls
bot.api.config.use((prev, method, payload, signal) => {
  console.log(`Calling ${method}`);
  return prev(method, payload, signal);
});

// Install temporarily on ctx.api — affects only this handler
bot.on("message", async (ctx) => {
  ctx.api.config.use((prev, method, payload, signal) => {
    // Only affects API calls made in this handler
    return prev(method, payload, signal);
  });
});

// Used by: auto-retry, parse-mode, transformer-throttler
```

---

## 6. Plugin Selection & Configuration

### 6.1 Selected Plugins (with install code)

#### auto-retry — Rate Limit Handler (P0)

```typescript
// Source: grammy/references/plugins/auto-retry.md
// Handles 429 (rate limit), 500+ (server errors), and network errors
import { autoRetry } from "@grammyjs/auto-retry";

bot.api.config.use(autoRetry({
  maxRetryAttempts: 3,        // retry up to 3 times
  maxDelaySeconds: 3600,      // max 1 hour wait
  rethrowInternalServerErrors: false, // retry 500s
  rethrowHttpErrors: false,           // retry network errors
}));
```

> **Why**: Replaces the entire hand-built `rate_limiter.py` from the Python bot. grammY auto-retry handles flood limits, server errors, AND network errors with exponential backoff. Zero custom code needed.

#### parse-mode — Default HTML Formatting (P0)

```typescript
// Source: grammy/references/plugins/parse-mode.md
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import type { ParseModeFlavor } from "@grammyjs/parse-mode";

// Middleware — adds replyWithHTML, replyFmt, etc.
bot.use(hydrateReply);

// Transformer — sets default parse_mode to HTML
bot.api.config.use(parseMode("HTML"));

// Usage in handlers:
bot.command("help", async (ctx) => {
  await ctx.reply("<b>Help</b>\n<i>Available commands...</i>");
  // No need for { parse_mode: "HTML" } — it's the default now!

  // Or use convenient methods:
  await ctx.replyWithHTML("<b>Bold</b> and <i>italic</i>");

  // Or use the fmt template tag for safe formatting:
  await ctx.replyFmt(fmt`${bold("Bold")} and ${italic("italic")}`);
});
```

#### hydrate — Enriched API Responses (P1)

```typescript
// Source: grammy/references/plugins/hydrate.md
import { hydrate, HydrateFlavor } from "@grammyjs/hydrate";

bot.use(hydrate());

// Without hydrate:
const msg = await ctx.reply("Processing...");
await ctx.api.editMessageText(ctx.chat.id, msg.message_id, "Done!");
await ctx.api.deleteMessage(ctx.chat.id, msg.message_id);

// With hydrate — methods on the returned object:
const msg = await ctx.reply("Processing...");
await msg.editText("Done!");   // So much cleaner!
await msg.delete();            // No chat_id/message_id needed!
```

#### runner — Concurrent Processing (P0 for multi-bot)

```typescript
// Source: grammy/references/plugins/runner.md
import { run, sequentialize } from "@grammyjs/runner";

// IMPORTANT: sequentialize prevents race conditions
// Use the same key as would be used for sessions
bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));

// Replace bot.start() with run() for concurrent processing
const runner = run(bot);

// Graceful shutdown
process.on("SIGINT", () => runner.isRunning() && runner.stop());
process.on("SIGTERM", () => runner.isRunning() && runner.stop());
```

> **Why**: `bot.start()` processes updates sequentially. `run(bot)` processes them concurrently — essential when running multiple bot instances (dashboard mode). Must use `sequentialize` to prevent cache/DB race conditions.

#### ratelimiter — User Flood Protection (P1)

```typescript
// Source: grammy/references/plugins/ratelimiter.md
import { limit } from "@grammyjs/ratelimiter";

// Rate-limit users — not the same as auto-retry!
// auto-retry = handles Telegram's rate limits on OUR outgoing calls
// ratelimiter = limits INCOMING updates from spammy users
bot.use(limit({
  timeFrame: 2000,    // 2 second window
  limit: 3,           // max 3 messages per window
  onLimitExceeded: async (ctx) => {
    await ctx.reply("⏳ Slow down! Too many requests.");
  },
  keyGenerator: (ctx) => ctx.from?.id.toString(), // per-user
}));
```

#### commands — Advanced Command Handling (P2)

```typescript
// Source: grammy/references/plugins/commands.md
import { CommandGroup, commands, type CommandsFlavor } from "@grammyjs/commands";

const userCommands = new CommandGroup<NezukoContext>();
userCommands.command("start", "Start the bot", startHandler);
userCommands.command("help", "Show help", helpHandler);

const adminCommands = new CommandGroup<NezukoContext>();
adminCommands.command("protect", "Protect this group", protectHandler)
  .addToScope({ type: "all_chat_administrators" }, protectHandler);
adminCommands.command("settings", "Bot settings", settingsHandler)
  .addToScope({ type: "all_chat_administrators" }, settingsHandler);

bot.use(commands()); // Install context shortcut
bot.use(userCommands);
bot.use(adminCommands);

// Sync command menu to Telegram
await userCommands.setCommands(bot);
```

### 6.2 Plugins NOT Selected (with reasons)

| Plugin | Why Not | Notes |
|---|---|---|
| **session** | DB-first architecture — no per-chat state needed | Nezuko stores everything in InsForge |
| **conversations** | No multi-step conversation flows | Verification is single-action, not a flow |
| **menu** | Inline keyboards are simple enough | No dynamic nested menus needed |
| **i18n / fluent** | Single language (English) | Can add later if i18n is needed |
| **transformer-throttler** | `auto-retry` is better | Throttler docs say "Consider using auto-retry instead" |
| **entity-parser** | Not displaying messages outside Telegram | Entity parser docs say "Probably NEVER" needed |
| **autoquote** | Not needed for verification bot | Auto-quoting adds noise in group chats |

#### chat-members — Member Status Cache (P0)

> **Added in v3.0 brainstorming** — discovered via grammY official docs research.

```typescript
// Source: grammY official docs /plugins/chat-members
import { chatMembers, type ChatMembersFlavor } from "@grammyjs/chat-members";
import Redis from "ioredis";

// Uses Redis as storage adapter for chat member data
const redis = new Redis(config.redisUrl);
const adapter = new RedisAdapter<ChatMember>(redis);

bot.use(chatMembers(adapter));

// In verification handler:
const member = await ctx.chatMembers.getChatMember(channelId, userId);
// ^ checks Redis first → if miss, calls Telegram API → caches result
```

**Why this plugin?**
- Automatic cache: listens for `chat_member` events, updates cache on join/leave
- `getChatMember()` checks cache-first, falls back to API, caches result
- Requires `allowed_updates: ["chat_member", "message", "callback_query"]`
- Combined with our 6h Redis TTL for derived verification status = hybrid cache strategy

**Cache Strategy (3-layer hybrid):**

| Layer | What | TTL | Plugin |
|---|---|---|---|
| L1 | Individual channel membership | Event-driven (no TTL) | `chat-members` plugin |
| L2 | Derived verification status | 6 hours | Custom Redis key `nezuko:v2:verified:{groupId}:{userId}` |
| L3 | Periodic bulk re-check | Every 15 min | `member-sync` service |

---

## 7. Context Type System

### 7.1 Custom Context Design

```typescript
// apps/grammy/src/types.ts
import { Context, Api } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";
import { ParseModeFlavor } from "@grammyjs/parse-mode";
import { CommandsFlavor } from "@grammyjs/commands";
import { ChatMembersFlavor } from "@grammyjs/chat-members";
import type { InsForgeClient } from "./core/insforge-client";
import type { CacheClient } from "./core/cache";

/**
 * Custom context properties injected via middleware.
 * Available on every ctx object after contextEnricher runs.
 */
interface NezukoContextFlavor {
  /** InsForge REST client for database access */
  db: InsForgeClient;
  /** Redis cache client */
  cache: CacheClient;
  /** Current bot's Telegram ID */
  botId: number;
  /** Logger scoped to this update */
  log: Logger;
}

/**
 * Combined context type for the Nezuko bot.
 * Flavors are composed inside-out:
 * 1. Context (base)
 * 2. NezukoContextFlavor (our custom props)
 * 3. CommandsFlavor (ctx.setMyCommands)
 * 4. HydrateFlavor (msg.editText(), msg.delete())
 * 5. ParseModeFlavor (ctx.replyWithHTML, ctx.replyFmt)
 */
export type NezukoContext = ParseModeFlavor<
  HydrateFlavor<
    Context & NezukoContextFlavor & CommandsFlavor & ChatMembersFlavor
  >
>;
```

### 7.2 Context Enricher Middleware

```typescript
// apps/grammy/src/middleware/context-enricher.ts
import { Middleware } from "grammy";
import type { NezukoContext } from "../types";

export function contextEnricher(deps: {
  db: DatabaseClient;
  cache: CacheClient;
  botId: number;
  logger: Logger;
}): Middleware<NezukoContext> {
  return async (ctx, next) => {
    // Inject dependencies into context
    ctx.db = deps.db;
    ctx.cache = deps.cache;
    ctx.botId = deps.botId;
    ctx.log = deps.logger.child({ updateId: ctx.update.update_id });
    await next();
  };
}
```

---

## 8. Project Structure

### 8.1 Directory Layout

> **v2** — Updated after architecture research (grammY deployment checklist, scaling guide, official structuring docs)

```
apps/grammy/
├── src/
│   ├── main.ts                          # Entry point — run() with 4-step graceful shutdown
│   ├── config.ts                        # Zod-validated environment config
│   ├── types.ts                         # NezukoContext + all shared types
│   │
│   ├── core/                            # Framework-level infrastructure
│   │   ├── bot-factory.ts               # Creates Bot<NezukoContext> with all plugins
│   │   ├── cache.ts                     # Redis client (ioredis wrapper)
│   │   ├── constants.ts                 # Shared constants (timeouts, limits, namespaces)
│   │   ├── insforge-client.ts           # InsForge REST client (fetch-based)
│   │   ├── encryption.ts               # AES-256-GCM token decryption (Phase 5)
│   │   └── shutdown.ts                 # 4-step graceful shutdown handler
│   │
│   ├── middleware/                       # Custom grammY middleware (registration order matters!)
│   │   ├── sequentialize.ts            # [1st] Prevent race conditions per chat
│   │   ├── context-enricher.ts          # [2nd] Injects db/cache/logger into ctx
│   │   ├── admin-guard.ts              # Filter: only chat admins (uses chat-members)
│   │   ├── group-only.ts              # Filter: only group/supergroup chats
│   │   └── permission-check.ts        # Verify bot has required admin permissions
│   │
│   ├── composers/                       # Feature modules (each exports a Composer)
│   │   ├── admin.ts                     # /start, /help, /protect, /unprotect, /settings
│   │   ├── channels.ts                 # /channels, /verify, /stats (user commands)
│   │   ├── events.ts                   # chat_member join/leave, my_chat_member
│   │   ├── migration.ts               # Supergroup migration handler
│   │   ├── verify.ts                   # Callback query handler for verification button
│   │   └── fallback.ts                # Catch-all callback query answerer (ALWAYS last)
│   │
│   ├── services/                        # Business logic (ZERO grammy imports!)
│   │   ├── verification.ts             # Membership check + 3-layer cache logic
│   │   ├── protection.ts              # Mute/unmute/kick via Telegram API calls
│   │   ├── channel-linker.ts          # Link/unlink channels to groups
│   │   ├── status-writer.ts           # Heartbeat interval (30s)
│   │   ├── member-sync.ts            # Bulk re-check interval (15min)
│   │   └── batch-verification.ts     # Batch verify multiple users
│   │
│   ├── database/                        # Data access layer (InsForge REST only, flat)
│   │   ├── group.repo.ts              # Protected groups CRUD
│   │   ├── channel.repo.ts            # Enforced channels CRUD
│   │   ├── link.repo.ts              # Group↔Channel links CRUD
│   │   ├── verification.repo.ts      # Verification logs
│   │   └── bot-status.repo.ts        # Bot status heartbeat
│   │
│   └── utils/                          # Pure utility functions (zero side effects)
│       ├── auto-delete.ts             # Delete messages after delay
│       ├── logger.ts                  # pino structured logging
│       ├── messages.ts                # All user-facing strings in one file
│       └── health.ts                  # HTTP health endpoint (for Docker)
│
├── Dockerfile                           # 3-stage: Bun install → Node build → Node runtime
├── .dockerignore                        # Exclude node_modules, .git, tests, docs
├── package.json
├── tsconfig.json
├── tsconfig.build.json                  # Separate build config (excludes tests)
├── vitest.config.ts                    # Test configuration
├── .env.example                        # Template with all required env vars
└── .env                                # Local env vars (gitignored)
```

### 8.2 Why This Structure

> Updated after grammY deployment checklist + scaling guide research

| Decision | Rationale |
|---|---|
| **`sequentialize.ts` first middleware** | grammY deployment checklist: "Use sequentialize" — prevents race conditions with `runner` |
| **`composers/` not `handlers/`** | grammY uses `Composer` class — naming reflects the framework |
| **`channels.ts` split from `admin.ts`** | `/channels`, `/verify`, `/stats` are user commands, not admin-only |
| **`migration.ts` composer** | Supergroup migration handler (decision #26) — separate concern |
| **`services/` has ZERO grammY imports** | Business logic testable in isolation — framework-agnostic |
| **`database/` is flat (5 files)** | No nested directories — simple for 5 repos. No abstract base class overhead |
| **`messages.ts` not `ui.ts`** | All user-facing strings in one file — easy to update/translate later |
| **`shutdown.ts` extracted to `core/`** | Reusable across single-bot and multi-bot modes |
| **`permission-check.ts` middleware** | Bot permission detection (decision #32) — 3-layer defense |
| **Error boundaries per composer** | grammY error handling: one composer crashing doesn't kill the whole bot |
| **`fallback.ts` is ALWAYS last** | grammY deployment checklist: "Answer all callback queries" — prevents infinite spinners |
| **No `multi-bot/` directory** | Phase 5 code scaffolded only when Phase 5 starts — YAGNI |
| **No `prisma/` directory** | Decision #2: InsForge from day one. No local database at all |
| **`tsconfig.build.json` added** | Separate config for `tsc` production build (excludes tests, dev files) |

---

## 9. Module-by-Module Blueprint

### 9.1 Entry Point — `main.ts`

> **v2** — Uses `run()` from grammY runner + 4-step graceful shutdown (decision #29)

```typescript
// apps/grammy/src/main.ts
import { run } from "@grammyjs/runner";
import { createBot } from "./core/bot-factory";
import { loadConfig } from "./config";
import { createInsForgeClient } from "./core/insforge-client";
import { createCache } from "./core/cache";
import { createLogger } from "./utils/logger";
import { startStatusWriter } from "./services/status-writer";
import { startMemberSync } from "./services/member-sync";
import { startHealthServer } from "./utils/health";

const SHUTDOWN_TIMEOUT_MS = 8_000; // Docker sends SIGKILL at 10s

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const db = createInsForgeClient(config.insforgeBaseUrl, config.insforgeAnonKey);
  const cache = createCache(config.redisUrl);

  logger.info("Starting Nezuko grammY bot...");

  const bot = createBot(config.botToken, { db, cache, logger });

  // Start background services
  const statusInterval = startStatusWriter(bot.api, db, config.botId);
  const syncInterval = startMemberSync(bot.api, db, config.botId);
  startHealthServer(config.healthPort);

  // Source: grammy/references/plugins/runner.md
  // run() processes updates concurrently (default: 500)
  const handle = run(bot, {
    runner: {
      fetch: {
        // Decision #27: exactly 4 update types
        allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"],
      },
    },
  });

  logger.info(`Bot @${bot.botInfo.username} started (ID: ${bot.botInfo.id})`);

  // Decision #29: 4-step graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, "Shutdown signal received");

    // 1. Stop accepting new updates
    if (handle.isRunning()) handle.stop();

    // 2. Wait for in-flight updates to complete (max 8s)
    await Promise.race([
      handle.task(),
      new Promise((r) => setTimeout(r, SHUTDOWN_TIMEOUT_MS)),
    ]);

    // 3. Cleanup: status → offline, Redis quit, Sentry flush
    clearInterval(statusInterval);
    clearInterval(syncInterval);
    await Promise.allSettled([
      db.upsertBotStatus(config.botId, "offline"),
      cache.quit(),
    ]);

    // 4. Exit
    logger.info("Graceful shutdown complete");
    process.exit(0);
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(console.error);
```

### 9.2 Bot Factory — `core/bot-factory.ts`

> **v2** — Correct middleware order, `sequentialize`, `chat-members`, error boundaries per composer

```typescript
// apps/grammy/src/core/bot-factory.ts
import { Bot, GrammyError, HttpError } from "grammy";
import { sequentialize } from "@grammyjs/runner";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { limit } from "@grammyjs/ratelimiter";
import { chatMembers } from "@grammyjs/chat-members";
import { contextEnricher } from "../middleware/context-enricher";
import { adminComposer } from "../composers/admin";
import { channelsComposer } from "../composers/channels";
import { eventsComposer } from "../composers/events";
import { migrationComposer } from "../composers/migration";
import { verifyComposer } from "../composers/verify";
import { fallbackComposer } from "../composers/fallback";
import type { NezukoContext } from "../types";
import type { InsForgeClient } from "./insforge-client";
import type { CacheClient } from "./cache";
import type { Logger } from "pino";

interface BotDeps {
  db: InsForgeClient;
  cache: CacheClient;
  logger: Logger;
}

export function createBot(token: string, deps: BotDeps): Bot<NezukoContext> {
  const bot = new Bot<NezukoContext>(token);

  // ── Transformers (outgoing API call interceptors) ──
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }));
  bot.api.config.use(parseMode("HTML"));

  // ── Middleware (incoming update processing — ORDER MATTERS!) ──

  // 1. Sequentialize — MUST be first (grammY deployment checklist #2)
  //    Prevents race conditions: same chat = same queue, different chats = parallel
  bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));

  // 2. Rate limiter — drop spam before any processing
  //    Decision #28: grammY defaults (1 per 1s, silent ignore)
  bot.use(limit({ storageClient: deps.cache.redis }));

  // 3. Hydration — enables ctx.msg.editText(), ctx.msg.delete()
  bot.use(hydrateReply);
  bot.use(hydrate());

  // 4. Chat members — cache member status from chat_member events
  //    Decision #22: official grammY plugin for getChatMember caching
  bot.use(chatMembers(deps.cache.chatMembersAdapter));

  // 5. Context enricher — inject db/cache/logger
  bot.use(contextEnricher(deps));

  // ── Composers (handler tree — with error boundaries!) ──
  // Source: grammy/references/guide/errors.md
  // Each composer wrapped in errorBoundary so one crash doesn't kill others

  const handleComposerError = (err: unknown) => {
    deps.logger.error({ err }, "Error in composer");
  };

  bot.use(adminComposer.errorBoundary(handleComposerError));
  bot.use(channelsComposer.errorBoundary(handleComposerError));
  bot.use(migrationComposer.errorBoundary(handleComposerError));
  bot.use(eventsComposer.errorBoundary(handleComposerError));
  bot.use(verifyComposer.errorBoundary(handleComposerError));

  // Fallback — ALWAYS last (grammY deployment checklist)
  // Answers any unclaimed callback queries to remove Telegram loading spinner
  bot.use(fallbackComposer);

  // ── Global Error Handler (safety net) ──
  bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;
    deps.logger.error({ err: e, updateId: ctx.update.update_id },
      `Unhandled error in update ${ctx.update.update_id}`);

    if (e instanceof GrammyError) {
      deps.logger.error({ description: e.description }, "Bot API error");
    } else if (e instanceof HttpError) {
      deps.logger.error({ message: e.message }, "Network error");
    }
  });

  return bot;
}
```

### 9.3 Admin Composer — `composers/admin.ts`

```typescript
// apps/grammy/src/composers/admin.ts
import { Composer } from "grammy";
import type { NezukoContext } from "../types";
import { linkChannel } from "../services/channel-linker";

export const adminComposer = new Composer<NezukoContext>();

// /start — works in private and group chats
adminComposer.command("start", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply(
      "<b>👋 Welcome to Nezuko!</b>\n\n" +
      "I help manage Telegram groups by enforcing channel membership.\n\n" +
      "Add me to a group and use <code>/protect @channel</code> to get started."
    );
  } else {
    await ctx.reply("I'm active in this group! Use /help for commands.");
  }
});

// /help — admin-only in groups
adminComposer.command("help", async (ctx) => {
  await ctx.reply(
    "<b>📋 Available Commands</b>\n\n" +
    "<code>/protect @channel</code> — Link a channel\n" +
    "<code>/unprotect @channel</code> — Unlink a channel\n" +
    "<code>/settings</code> — View current settings\n" +
    "<code>/help</code> — Show this message"
  );
});

// /protect — link a channel to enforce membership
// Source: grammy/references/guide/commands.md — ctx.match for arguments
adminComposer.command("protect", async (ctx) => {
  // Only works in groups
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("⚠️ This command only works in groups.");
    return;
  }

  // Check if sender is admin
  const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
  if (!["administrator", "creator"].includes(member.status)) {
    await ctx.reply("⚠️ Only admins can use this command.");
    return;
  }

  const channelUsername = ctx.match?.trim();
  if (!channelUsername) {
    await ctx.reply("Usage: <code>/protect @channelname</code>");
    return;
  }

  await linkChannel(ctx, channelUsername);
});
```

### 9.4 Events Composer — `composers/events.ts`

```typescript
// apps/grammy/src/composers/events.ts
import { Composer } from "grammy";
import type { NezukoContext } from "../types";

export const eventsComposer = new Composer<NezukoContext>();

// ── New Member Join ──
// Source: grammy/references/guide/filter-queries.md
eventsComposer.on("message:new_chat_members", async (ctx) => {
  const newMembers = ctx.msg.new_chat_members;

  for (const member of newMembers) {
    if (member.is_bot) continue;

    // Check if this group is protected
    const channels = await ctx.db.getGroupChannels(ctx.chat.id);
    if (channels.length === 0) continue;

    // Mute the new member
    await ctx.api.restrictChatMember(ctx.chat.id, member.id, {
      permissions: { can_send_messages: false },
    });

    // Send verification message with inline keyboard
    const keyboard = new InlineKeyboard();
    for (const channel of channels) {
      keyboard.url(`Join ${channel.title}`, `https://t.me/${channel.username}`).row();
    }
    keyboard.text("✅ Verify", `verify:${ctx.chat.id}`);

    const greeting = await ctx.reply(
      `<b>Welcome, ${member.first_name}!</b>\n\n` +
      `Please join the channels below and click ✅ Verify.`,
      { reply_markup: keyboard }
    );

    // Auto-delete after 5 minutes
    setTimeout(() => greeting.delete().catch(() => {}), 5 * 60 * 1000);
  }
});

// ── Member Left ──
eventsComposer.on("message:left_chat_member", async (ctx) => {
  // Delete the "X left the group" service message
  await ctx.deleteMessage().catch(() => {});
});

// ── Message Filter (delete messages from unverified users) ──
eventsComposer.on("message:text", async (ctx) => {
  if (!ctx.from) return;
  const channels = await ctx.db.getGroupChannels(ctx.chat.id);
  if (channels.length === 0) return;

  // Check cache first
  const isVerified = await ctx.cache.get(`verified:${ctx.chat.id}:${ctx.from.id}`);
  if (isVerified) return; // Verified — let the message through

  // Not in cache — check DB
  const dbVerified = await ctx.db.isUserVerified(ctx.chat.id, ctx.from.id);
  if (dbVerified) {
    await ctx.cache.set(`verified:${ctx.chat.id}:${ctx.from.id}`, "1", "EX", 3600);
    return;
  }

  // Not verified — delete the message
  await ctx.deleteMessage().catch(() => {});
});
```

### 9.5 Verify Composer — `composers/verify.ts`

```typescript
// apps/grammy/src/composers/verify.ts
import { Composer } from "grammy";
import type { NezukoContext } from "../types";
import { verifyMembership } from "../services/verification";

export const verifyComposer = new Composer<NezukoContext>();

// Regex callback query: verify:<chatId>
verifyComposer.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const userId = ctx.from.id;

  const result = await verifyMembership(ctx, groupId, userId);

  if (result.success) {
    // Unmute user
    await ctx.api.restrictChatMember(groupId, userId, {
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
    });

    // Cache the verification
    await ctx.cache.set(`verified:${groupId}:${userId}`, "1", "EX", 3600);

    // Log to DB
    await ctx.db.logVerification(groupId, userId, "verified");

    await ctx.answerCallbackQuery({
      text: "✅ Verified! You can now send messages.",
      show_alert: true,
    });

    // Delete the verification message
    await ctx.deleteMessage().catch(() => {});
  } else {
    await ctx.answerCallbackQuery({
      text: `❌ Please join: ${result.missingChannels.join(", ")}`,
      show_alert: true,
    });
  }
});
```

### 9.6 Verification Service — `services/verification.ts`

```typescript
// apps/grammy/src/services/verification.ts
// Framework-agnostic — uses ctx.api for Telegram calls but no grammY-specific types
import type { Api } from "grammy";
import type { DatabaseClient } from "../core/database";
import type { CacheClient } from "../core/cache";

interface VerificationResult {
  success: boolean;
  missingChannels: string[];
}

export async function verifyMembership(
  api: Api,
  db: DatabaseClient,
  cache: CacheClient,
  groupId: number,
  userId: number,
): Promise<VerificationResult> {
  const channels = await db.getGroupChannels(groupId);
  const missingChannels: string[] = [];

  for (const channel of channels) {
    // Check cache first
    const cached = await cache.get(`member:${channel.id}:${userId}`);
    if (cached === "1") continue;

    // Check via Telegram API
    try {
      const member = await api.getChatMember(channel.id, userId);
      if (["member", "administrator", "creator"].includes(member.status)) {
        await cache.set(`member:${channel.id}:${userId}`, "1", "EX", 300);
      } else {
        missingChannels.push(`@${channel.username}`);
      }
    } catch {
      missingChannels.push(`@${channel.username}`);
    }
  }

  return { success: missingChannels.length === 0, missingChannels };
}
```

---

## 10. Database Strategy (InsForge REST)

> **Decision (v3.0)**: No local database, no Prisma. Use InsForge REST API from day one.
> This matches the existing Python bot (`insforge_client.py`) and eliminates schema sync issues.

### 10.1 InsForge REST Client (TypeScript Port)

The grammY bot talks to InsForge the **same way** the existing Python bot does — via raw HTTP REST calls to `/api/database/records/{table}`. This is a TypeScript port of the Python `insforge_client.py`.

**Why NOT `@insforge/sdk`?** The SDK is designed for browser/frontend apps. For a server-side bot:
- We need lower-level control over HTTP headers and error handling
- We already have a proven REST pattern from the Python bot
- No SDK dependency = one less thing to update

```typescript
// apps/grammy/src/core/insforge-client.ts
import type { Logger } from "pino";

interface InsForgeConfig {
  baseUrl: string;
  anonKey: string;
  logger: Logger;
}

export class InsForgeClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private log: Logger;

  constructor(config: InsForgeConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
    };
    this.log = config.logger.child({ module: "insforge" });
  }

  async getRecords<T>(table: string, params?: Record<string, string>): Promise<T[]> {
    const url = new URL(`/api/database/records/${table}`, this.baseUrl);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const resp = await fetch(url, { headers: this.headers });
    if (!resp.ok) throw new Error(`InsForge GET ${table}: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<T[]>;
  }

  async postRecords<T>(table: string, body: unknown[], prefer = "return=representation"): Promise<T[]> {
    const resp = await fetch(`${this.baseUrl}/api/database/records/${table}`, {
      method: "POST",
      headers: { ...this.headers, Prefer: prefer },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`InsForge POST ${table}: ${resp.status}`);
    if (resp.status === 204) return [];
    return resp.json() as Promise<T[]>;
  }

  async patchRecords<T>(table: string, params: Record<string, string>, body: unknown): Promise<T[]> {
    const url = new URL(`/api/database/records/${table}`, this.baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const resp = await fetch(url, {
      method: "PATCH",
      headers: { ...this.headers, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`InsForge PATCH ${table}: ${resp.status}`);
    if (resp.status === 204) return [];
    return resp.json() as Promise<T[]>;
  }

  async deleteRecords(table: string, params: Record<string, string>): Promise<void> {
    const url = new URL(`/api/database/records/${table}`, this.baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const resp = await fetch(url, { method: "DELETE", headers: this.headers });
    if (!resp.ok) throw new Error(`InsForge DELETE ${table}: ${resp.status}`);
  }
}
```

### 10.2 Repository Interface

```typescript
// apps/grammy/src/database/types.ts
export interface GroupRepository {
  getGroupChannels(groupId: number): Promise<Channel[]>;
  isUserVerified(groupId: number, userId: number): Promise<boolean>;
  createGroup(groupId: number, ownerId: number, title: string): Promise<void>;
  linkChannel(groupId: number, channelId: number, title?: string, username?: string): Promise<void>;
  unlinkAllChannels(groupId: number): Promise<void>;
  logVerification(groupId: number, userId: number, status: string, latencyMs?: number): Promise<void>;
  upsertBotStatus(botId: number, status: string, uptimeSeconds: number): Promise<void>;
  getGroupChannelCount(groupId: number): Promise<number>;
}
```

### 10.3 InsForge Client Implementation

The repository wraps the InsForge REST client, mirroring the existing Python bot's `insforge_client.py`:

```typescript
// apps/grammy/src/database/insforge-repo.ts
import type { InsForgeClient } from "../core/insforge-client";
import type { GroupRepository, Channel } from "./types";

export function createInsForgeRepo(client: InsForgeClient): GroupRepository {
  return {
    async getGroupChannels(groupId) {
      const links = await client.getRecords<{ channel_id: number }>(
        "group_channel_links",
        { group_id: `eq.${groupId}`, select: "channel_id" },
      );
      if (links.length === 0) return [];

      const ids = links.map((l) => l.channel_id).join(",");
      return client.getRecords<Channel>("enforced_channels", {
        channel_id: `in.(${ids})`,
      });
    },

    async isUserVerified(groupId, userId) {
      const logs = await client.getRecords("verification_log", {
        group_id: `eq.${groupId}`,
        user_id: `eq.${userId}`,
        status: "eq.verified",
        limit: "1",
      });
      return logs.length > 0;
    },

    // ... remaining methods follow same pattern as Python bot
  };
}
```

### 10.4 Configuration

```typescript
// apps/grammy/src/core/database.ts
import { InsForgeClient } from "./insforge-client";
import { createInsForgeRepo } from "../database/insforge-repo";
import type { GroupRepository } from "../database/types";
import type { Config } from "./config";

export function createDatabase(config: Config): GroupRepository {
  const client = new InsForgeClient({
    baseUrl: config.insforgeBaseUrl,
    anonKey: config.insforgeAnonKey,
    logger: config.logger,
  });
  return createInsForgeRepo(client);
}
```

---

## 11. Error Handling & Reliability

### 11.1 grammY Error Hierarchy

```
BotError (wrapper)
├── GrammyError  — Telegram Bot API returned an error (HTTP 200 but ok: false)
│   ├── error_code: 400 — Bad Request
│   ├── error_code: 403 — Forbidden (bot kicked, no permissions)
│   ├── error_code: 429 — Too Many Requests (handled by auto-retry)
│   └── description: string — Human-readable error
└── HttpError    — Network-level error (DNS, timeout, connection refused)
```

> **Source**: [Error Handling Guide](./agents/skills/grammy/references/guide/errors.md)

### 11.2 Global Error Handler

```typescript
// Source: grammy/references/guide/errors.md
bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;

  if (e instanceof GrammyError) {
    // Telegram API error — bot may be kicked, blocked, etc.
    if (e.error_code === 403) {
      logger.warn(`Bot removed from chat ${ctx.chat?.id}: ${e.description}`);
      // Mark group as inactive in DB
    } else {
      logger.error(`API error [${e.error_code}]: ${e.description}`);
    }
  } else if (e instanceof HttpError) {
    // Network error — transient, will be retried by auto-retry
    logger.error(`Network error: ${e.message}`);
  } else {
    // Unknown error — our code has a bug
    logger.error({ err: e }, "Unexpected error in middleware");
  }
});
```

### 11.3 Error Boundaries (Per-Composer)

```typescript
// Source: grammy/references/guide/errors.md — errorBoundary
const adminComposer = new Composer<NezukoContext>();

// Errors in admin handlers don't crash the entire bot
adminComposer.errorBoundary((err) => {
  err.ctx.log.error(`Admin handler error: ${err.error}`);
  err.ctx.reply("⚠️ An error occurred. Please try again.").catch(() => {});
});

adminComposer.command("protect", protectHandler);
```

### 11.4 Graceful Shutdown

```typescript
// Source: grammy/references/advanced/reliability.md
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // 1. Stop accepting new updates
  await bot.stop();

  // 2. Clear background intervals
  clearInterval(statusInterval);
  clearInterval(syncInterval);

  // 3. Close database connection
  await db.$disconnect();

  // 4. Close Redis connection
  await cache.quit();

  logger.info("Shutdown complete");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

---

## 12. Scaling & Concurrency

### 12.1 Single-Bot Mode (Development)

```typescript
// Simple sequential processing — default bot.start()
// Source: grammy/references/guide/deployment-types.md
await bot.start(); // processes updates one at a time
```

### 12.2 Multi-Bot Mode (Dashboard/Production)

```typescript
// Source: grammy/references/plugins/runner.md
// Source: grammy/references/advanced/scaling.md
import { run, sequentialize } from "@grammyjs/runner";

// CRITICAL: sequentialize prevents race conditions on shared resources
// "If two updates are in the same chat, they should be processed sequentially"
bot.use(sequentialize((ctx) => {
  const chatId = ctx.chat?.id.toString();
  const userId = ctx.from?.id.toString();
  return chatId ?? userId ?? "global";
}));

// Use runner for concurrent processing
const runner = run(bot, {
  runner: {
    fetch: { allowed_updates: ["message", "callback_query", "chat_member"] },
  },
  source: {
    // How many updates to fetch in parallel
    maxPrefetch: 1000,
  },
  sink: {
    // How many updates to process concurrently
    concurrency: 50,
  },
});

// Graceful stop
process.on("SIGINT", () => runner.isRunning() && runner.stop());
```

### 12.3 Background Services (No JobQueue Needed)

grammY doesn't have PTB's `JobQueue` — and that's fine. Node.js `setInterval` is simpler:

```typescript
// apps/grammy/src/services/status-writer.ts
export function startStatusWriter(
  api: Api, db: GroupRepository, botId: number
): NodeJS.Timeout {
  const uptimeTracker = new UptimeTracker();

  return setInterval(async () => {
    try {
      await db.upsertBotStatus({
        botId,
        status: "online",
        uptimeSeconds: uptimeTracker.getSeconds(),
        lastHeartbeat: new Date(),
      });
    } catch (err) {
      logger.error({ err }, "Status write failed");
    }
  }, 30_000); // Every 30 seconds
}
```

---

## 13. Deployment Strategy

### 13.1 Long Polling vs Webhooks

| Aspect | Long Polling (Chosen) | Webhooks |
|---|---|---|
| **Setup** | `bot.start()` — zero config | SSL cert + public URL + `setWebhook` |
| **Development** | Works behind NAT/firewalls | Requires ngrok/tunnel |
| **Reliability** | grammY handles reconnection | Must handle timeouts carefully |
| **Concurrency** | `@grammyjs/runner` | Web framework + `webhookCallback` |
| **Cost** | Constant connection | Serverless-friendly (pay per request) |

> **Source**: [Deployment Types Guide](./agents/skills/grammy/references/guide/deployment-types.md) — "If you don't have a good reason to use webhooks... you will spend much less time fixing things"

### 13.2 Docker Configuration

```dockerfile
# apps/grammy/Dockerfile
FROM oven/bun:1.2 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# Generate Prisma client (dev mode only)
RUN bunx prisma generate
RUN bun run build

FROM oven/bun:1.2-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
CMD ["bun", "run", "dist/main.js"]
```

### 13.3 Environment Variables

```bash
# apps/grammy/.env.example

# ── Required ──
BOT_TOKEN=123456:ABC-DEF                # Telegram bot token
REDIS_URL=redis://localhost:6379         # Redis connection URL

# ── Database (choose one) ──
USE_INSFORGE=false                        # false = SQLite, true = InsForge
DATABASE_URL=file:./dev.db               # SQLite path (dev)
INSFORGE_BASE_URL=                       # InsForge URL (prod)
INSFORGE_ANON_KEY=                       # InsForge anon key (prod)

# ── Optional ──
LOG_LEVEL=info                           # pino log level
HEALTH_PORT=8080                         # HTTP health check port
DASHBOARD_MODE=false                     # Enable multi-bot mode
MASTER_KEY=                              # AES-256 master key for token decryption
```

---

## 14. Testing Strategy

### 14.1 Test Architecture

```
tests/grammy/
├── unit/
│   ├── services/
│   │   ├── verification.test.ts    # Business logic tests
│   │   ├── protection.test.ts      # Mute/unmute logic
│   │   └── channel-linker.test.ts  # Link/unlink logic
│   ├── middleware/
│   │   ├── admin-guard.test.ts     # Admin filtering
│   │   └── context-enricher.test.ts
│   └── database/
│       └── repositories.test.ts    # Repository CRUD tests
├── integration/
│   ├── composers/
│   │   ├── admin.test.ts           # Full handler tests with mock bot
│   │   ├── events.test.ts          # Join/leave/message tests
│   │   └── verify.test.ts          # Verification flow tests
│   └── bot-factory.test.ts         # Complete bot creation test
└── helpers/
    ├── mock-update.ts              # Factory for Telegram Update objects
    └── test-bot.ts                 # Test bot with mocked API
```

### 14.2 Testing with grammY

```typescript
// Source: grammy/references/advanced/deployment.md — "Testing" section
// Source: grammy/references/advanced/transformers.md — mocking API calls

// tests/grammy/helpers/test-bot.ts
import { Bot, type Update } from "grammy";
import type { NezukoContext } from "../../src/types";

export function createTestBot(): {
  bot: Bot<NezukoContext>;
  apiCalls: Array<{ method: string; payload: unknown }>;
} {
  const apiCalls: Array<{ method: string; payload: unknown }> = [];

  const bot = new Bot<NezukoContext>("TEST_TOKEN", {
    botInfo: {
      id: 1, is_bot: true, first_name: "Test",
      username: "test_bot", can_join_groups: true,
      can_read_all_group_messages: true, supports_inline_queries: false,
    },
  });

  // Mock all outgoing API calls using transformer
  bot.api.config.use((prev, method, payload) => {
    apiCalls.push({ method, payload });
    return { ok: true, result: true } as any;
  });

  return { bot, apiCalls };
}

// Usage in tests:
import { describe, it, expect } from "vitest";

describe("verify composer", () => {
  it("should unmute user on successful verification", async () => {
    const { bot, apiCalls } = createTestBot();

    // Set up composers and middleware...
    bot.use(verifyComposer);

    // Send a mock update via bot.handleUpdate()
    await bot.handleUpdate({
      update_id: 1,
      callback_query: {
        id: "1",
        chat_instance: "1",
        from: { id: 12345, is_bot: false, first_name: "Test" },
        data: "verify:-100123456",
      },
    });

    // Assert API calls were made
    expect(apiCalls).toContainEqual(
      expect.objectContaining({ method: "restrictChatMember" })
    );
  });
});
```

### 14.3 Mock Update Factory

```typescript
// tests/grammy/helpers/mock-update.ts
import type { Update } from "grammy/types";

export function createMessageUpdate(overrides: Partial<Update> = {}): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: -100123, type: "supergroup", title: "Test Group" },
      from: { id: 789, is_bot: false, first_name: "User" },
      text: "/start",
      ...overrides.message,
    },
    ...overrides,
  } as Update;
}

export function createCallbackUpdate(data: string): Update {
  return {
    update_id: 2,
    callback_query: {
      id: "cb1",
      chat_instance: "inst1",
      from: { id: 789, is_bot: false, first_name: "User" },
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: -100123, type: "supergroup", title: "Test Group" },
      },
      data,
    },
  } as Update;
}
```

---

## 15. Quality Gates

### 15.1 TypeScript Checks

```bash
# TSC strict mode — all errors must be fixed
cd apps/grammy && bun run type-check   # tsc --noEmit → 0 errors

# ESLint
cd apps/grammy && bun run lint         # 0 warnings

# Prettier
cd apps/grammy && bun x prettier src --check
```

### 15.2 Test Checks

```bash
# Run all tests
cd apps/grammy && bun run test         # vitest → all pass

# Coverage
cd apps/grammy && bun run test:coverage # vitest --coverage → target 80%+
```

### 15.3 Build

```bash
cd apps/grammy && bun run build        # tsc -p tsconfig.build.json → 0 errors
```

### 15.4 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 16. Implementation Phases

### Phase 1: Foundation (8 hours) — P0

| Task | File | Description |
|---|---|---|
| 1.1 | `package.json` | Init with bun, add grammy + plugins + dev deps |
| 1.2 | `tsconfig.json` | Strict mode, NodeNext resolution |
| 1.3 | `vitest.config.ts` | Test configuration |
| 1.4 | `.env.example` | Environment template |
| 1.5 | `src/config.ts` | Zod-validated config loader |
| 1.6 | `src/types.ts` | NezukoContext, all shared types |
| 1.7 | `src/core/constants.ts` | Shared constants |
| 1.8 | `src/utils/logger.ts` | pino structured logger |

**Dependencies**: `grammy`, `@grammyjs/auto-retry`, `@grammyjs/hydrate`, `@grammyjs/parse-mode`, `@grammyjs/runner`, `@grammyjs/ratelimiter`, `@grammyjs/commands`, `ioredis`, `pino`, `zod`, `prisma`, `@prisma/client`

**Dev Deps**: `typescript`, `vitest`, `@types/node`, `prettier`, `eslint`

### Phase 2: Core Infrastructure (10 hours) — P0

| Task | File | Description |
|---|---|---|
| 2.1 | `prisma/schema.prisma` | Database schema |
| 2.2 | `src/database/repositories/types.ts` | Repository interfaces |
| 2.3 | `src/database/prisma/adapter.ts` | Prisma implementation |
| 2.4 | `src/core/database.ts` | Database factory |
| 2.5 | `src/core/cache.ts` | Redis client wrapper |
| 2.6 | `src/core/bot-factory.ts` | Bot creation with plugins |
| 2.7 | `src/middleware/context-enricher.ts` | DI middleware |
| 2.8 | `src/middleware/admin-guard.ts` | Admin filter |
| 2.9 | `src/middleware/group-only.ts` | Group filter |

### Phase 3: Core Bot Logic (12 hours) — P0

| Task | File | Description |
|---|---|---|
| 3.1 | `src/composers/admin.ts` | /start, /help, /protect, /unprotect, /settings |
| 3.2 | `src/composers/events.ts` | Join, leave, message filter handlers |
| 3.3 | `src/composers/verify.ts` | Callback query verification |
| 3.4 | `src/composers/fallback.ts` | Catch-all callback answerer |
| 3.5 | `src/services/verification.ts` | Membership check + cache |
| 3.6 | `src/services/protection.ts` | Mute/unmute API calls |
| 3.7 | `src/services/channel-linker.ts` | Link/unlink channels |
| 3.8 | `src/utils/ui.ts` | Message text builders |
| 3.9 | `src/utils/auto-delete.ts` | Timed message deletion |
| 3.10 | `src/main.ts` | Entry point — wire everything together |

### Phase 4: Background Services (6 hours) — P1

| Task | File | Description |
|---|---|---|
| 4.1 | `src/services/status-writer.ts` | 30s heartbeat interval |
| 4.2 | `src/services/member-sync.ts` | 15min count sync interval |
| 4.3 | `src/core/uptime.ts` | Uptime tracker |
| 4.4 | `src/utils/health.ts` | HTTP health endpoint |

### Phase 5: Multi-Bot + Realtime (12 hours) — P1

| Task | File | Description |
|---|---|---|
| 5.1 | `src/multi-bot/bot-registry.ts` | Instance storage map |
| 5.2 | `src/multi-bot/bot-lifecycle.ts` | Start/stop individual bots |
| 5.3 | `src/multi-bot/bot-manager.ts` | Coordinator (dashboard commands) |
| 5.4 | `src/core/encryption.ts` | AES-256-GCM token decryption |
| 5.5 | `src/core/realtime-client.ts` | InsForge Socket.IO client (subscribe, dispatch events) |
| 5.6 | Update `src/main.ts` | Dashboard mode detection + realtime connect |

> **Realtime approach (see §17 for full architecture)**: Bot uses `socket.io-client` to connect to InsForge Realtime. Subscribes to `commands` + `bot_instances` channels. DB triggers fire events → bot processes instantly. Dashboard uses `@insforge/sdk` `.realtime` module. Fallback: 30s polling if WS unavailable.

### Phase 6: Testing (10 hours) — P0

| Task | File | Description |
|---|---|---|
| 6.1 | `tests/grammy/helpers/*` | Test utilities, mock factories |
| 6.2 | `tests/grammy/unit/services/*` | Unit tests for all services |
| 6.3 | `tests/grammy/unit/middleware/*` | Middleware unit tests |
| 6.4 | `tests/grammy/integration/composers/*` | Handler integration tests |
| 6.5 | `tests/grammy/integration/bot-factory.test.ts` | Full bot creation test |

### Phase 7: Polish & Production (6 hours) — P1

| Task | File | Description |
|---|---|---|
| 7.1 | `Dockerfile` | 3-stage build: Bun install → Node build → Node 22-slim runtime |
| 7.2 | `.github/workflows/grammy-ci.yml` | CI: lint + type-check + test + Docker build |
| 7.3 | `.dockerignore` | Exclude `node_modules`, `.git`, tests, docs |
| 7.4 | Error message polish | Consistent, user-friendly messages |
| 7.5 | Documentation | README, inline docs, `.env.example` |

### Total Estimated Effort: ~64 hours

```
Phase 1: Foundation          ████████░░  8h
Phase 2: Core Infrastructure ██████████░ 10h
Phase 3: Core Bot Logic      ████████████ 12h
Phase 4: Background Services ██████░░░░  6h
Phase 5: Multi-Bot + Realtime ████████████ 12h
Phase 6: Testing             ██████████░ 10h
Phase 7: Polish + Docker/CI  ██████░░░░  6h
                             ──────────
                             Total: 64h
```

---

## 17. Realtime Architecture — Bot ↔ Dashboard

> Sources: grammY official docs (runner, scaling), InsForge Realtime SDK, Telegram Bot API

### 17.1 Two Separate Realtime Systems

The Nezuko platform has **two independent realtime systems** that should not be confused:

```
System 1: Telegram → Bot                    System 2: Bot ↔ Dashboard
─────────────────────────                    ─────────────────────────
Telegram API → getUpdates                    InsForge PostgreSQL + Socket.IO
grammY runner (500 concurrent)               DB triggers → realtime.publish()
Long polling (~100ms)                        WebSocket broadcast (~200ms)
Already solved by run()                      ← THIS is what we design
```

### 17.2 System 1 — Telegram → Bot (Solved by grammY)

**grammY `run()` with the runner package handles this:**
- Polls `getUpdates` concurrently (default: 500 in-flight updates)
- ~100ms latency — effectively real-time for chat events
- `sequentialize` ensures same-chat ordering despite concurrency
- `allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"]`

**No additional work needed.** This is the grammY-recommended pattern.

### 17.3 System 2 — Bot ↔ Dashboard via InsForge Realtime

**The database is the event bus.** Both the bot and dashboard write to InsForge PostgreSQL. DB triggers fire `realtime.publish()` which broadcasts to all connected WebSocket clients.

```
Bot Action (e.g., user verified)
  │
  ▼
Bot writes to InsForge DB via REST (POST /verification_log)
  │
  ▼
PostgreSQL trigger fires → realtime.publish('dashboard', 'verification', payload)
  │
  ▼
InsForge Realtime broadcasts via Socket.IO
  │
  ├──► Dashboard (@insforge/sdk) → queryClient.invalidateQueries() → UI updates
  └──► Bot (socket.io-client) → processes command (if relevant)
```

### 17.4 Realtime Channels

| Channel | Direction | Trigger Table | Event Name | Payload |
|---|---|---|---|---|
| `dashboard` | Bot → Dashboard | `verification_log` INSERT | `verification` | user_id, group_id, status, latency_ms |
| `bot_status` | Bot → Dashboard | `bot_status` INSERT/UPDATE | `status_changed` | bot_id, status, uptime_seconds |
| `commands` | Dashboard → Bot | `admin_commands` UPDATE | `command_updated` | id, command_type, status, bot_id |
| `logs` | Bot → Dashboard | `admin_logs` INSERT | `new_log` | id, level, message, timestamp |
| `bot_instances` | Dashboard → Bot | `bot_instances` UPDATE | `bot_instance_changed` | bot_id, action, config |

### 17.5 Bot-Side Implementation

The grammY bot uses `socket.io-client` (Node.js) — same Socket.IO protocol as InsForge:

```typescript
// apps/grammy/src/core/realtime-client.ts
import { io, type Socket } from "socket.io-client";
import type { Logger } from "pino";

const RECONNECT_MIN = 2_000;
const RECONNECT_MAX = 60_000;

interface RealtimeOptions {
  baseUrl: string;
  anonKey: string;
  logger: Logger;
}

export class InsForgeRealtimeClient {
  private socket: Socket | null = null;
  private readonly logger: Logger;
  private subscribedChannels: string[] = [];

  constructor(private readonly options: RealtimeOptions) {
    this.logger = options.logger.child({ module: "realtime" });
  }

  /** Connect to InsForge Realtime via Socket.IO */
  async connect(): Promise<boolean> {
    try {
      this.socket = io(this.options.baseUrl, {
        auth: { token: this.options.anonKey },
        transports: ["websocket"],        // No HTTP long-polling fallback
        reconnection: true,
        reconnectionDelay: RECONNECT_MIN,
        reconnectionDelayMax: RECONNECT_MAX,
      });

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 10_000);
        this.socket!.on("connect", () => {
          clearTimeout(timeout);
          this.logger.info("InsForge Realtime connected");
          resolve(true);
        });
        this.socket!.on("connect_error", (err) => {
          clearTimeout(timeout);
          this.logger.warn({ err: err.message }, "Realtime connection failed");
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /** Subscribe to a channel (InsForge protocol) */
  subscribe(channel: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("REALTIME_SUBSCRIBE", { channel });
    this.subscribedChannels.push(channel);
    this.logger.info({ channel }, "Subscribed to channel");
  }

  /** Listen for a specific event */
  on<T = unknown>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler as (...args: unknown[]) => void);
  }

  /** Disconnect and cleanup */
  async disconnect(): Promise<void> {
    for (const ch of this.subscribedChannels) {
      this.socket?.emit("REALTIME_UNSUBSCRIBE", { channel: ch });
    }
    this.socket?.disconnect();
    this.socket = null;
    this.subscribedChannels = [];
    this.logger.info("Realtime disconnected");
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
```

### 17.6 Integration with main.ts

```typescript
// In main.ts — after bot creation, before run()

const realtime = new InsForgeRealtimeClient({
  baseUrl: config.insforgeBaseUrl,
  anonKey: config.insforgeAnonKey,
  logger,
});

const wsOk = await realtime.connect();
if (wsOk) {
  realtime.subscribe("commands");
  realtime.subscribe("bot_instances");

  // Dashboard → Bot: admin command dispatched
  realtime.on<{ status: string; bot_id: number }>("command_updated", (data) => {
    if (data.status === "pending" && data.bot_id === config.botId) {
      commandWorker.processNow(); // Wake up command processor immediately
    }
  });

  // Dashboard → Bot: config changed
  realtime.on<{ bot_id: number }>("bot_instance_changed", (data) => {
    if (data.bot_id === config.botId) {
      reloadBotConfig(); // Reload settings without restart
    }
  });

  logger.info("✅ InsForge Realtime → instant command dispatch enabled");
} else {
  logger.warn("⚠️ InsForge Realtime unavailable → 30s polling fallback");
}
```

### 17.7 Dashboard-Side (Already Implemented)

The web dashboard uses `@insforge/sdk` which wraps the same Socket.IO client:

```typescript
// apps/web/src/lib/hooks/use-realtime.ts (existing pattern)
await insforge.realtime.connect();
await insforge.realtime.subscribe("dashboard");
await insforge.realtime.subscribe("bot_status");

insforge.realtime.on("verification", () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
});

insforge.realtime.on("status_changed", () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
});
```

### 17.8 Why InsForge Realtime (Not Alternatives)

| Alternative | Why NOT |
|---|---|
| **Webhooks for Telegram** | Requires SSL + public URL + port config. `run()` gives same ~100ms latency |
| **Custom REST API server** | Violates "no custom API server" architecture. Extra infra to maintain |
| **Redis Pub/Sub** | Extra infrastructure. InsForge Realtime already provides Socket.IO |
| **Direct HTTP bot→dashboard** | Bot would need its own HTTP server. Violates stateless architecture |
| **gRPC / tRPC** | Over-engineered. InsForge REST + Realtime covers all cases |

### 17.9 Performance

| Metric | Value |
|---|---|
| Telegram → Bot latency | ~100ms (grammY runner long polling) |
| Bot → Dashboard latency | ~200ms (REST write → trigger → WS broadcast) |
| Dashboard → Bot latency | ~200ms (REST write → trigger → WS broadcast) |
| WebSocket reconnect | Auto (2s → 60s exponential backoff) |
| Concurrent bot updates | 500 (grammY runner default) |
| Fallback when WS down | 30s polling for commands/status |

### 17.10 DB Writes for Dashboard Compatibility

The grammY bot must produce **identical database writes** to the PTB bot to keep the dashboard working:

| Table | Key Fields | Write Pattern |
|---|---|---|
| `bot_status` | `bot_id`, `status`, `uptime_seconds` | UPSERT every 30s |
| `protected_groups` | `telegram_id`, `title`, `member_count` | UPSERT on /protect |
| `enforced_channels` | `telegram_id`, `username`, `subscriber_count` | UPSERT on /protect |
| `group_channel_links` | `group_id`, `channel_id` | INSERT on /protect, DELETE on /unprotect |
| `verification_log` | `user_id`, `group_id`, `status` | INSERT on each verify |

### 17.11 Switchover Plan

1. **Parallel Running**: Both Python and grammY bots run simultaneously (different tokens)
2. **Database Verification**: Compare DB writes from both bots
3. **Token Swap**: Switch the production token to grammY bot
4. **Monitor**: Watch dashboard for 48 hours
5. **Cleanup**: Deprecate Python bot

---

## 18. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| InsForge API downtime affects bot | Low | High | Catch HTTP errors, log to pino, bot continues without DB for cached data |
| grammY plugin version conflicts | Low | Medium | Pin exact versions in package.json |
| Redis cache key conflicts with Python bot | Medium | Medium | Namespace keys: `nezuko:v2:verified:...` |
| Telegram rate limits during testing | Medium | Low | auto-retry + separate test bot token |
| TypeScript strict mode reveals design issues | High | Low | Fix at compile time — this is a feature, not a bug |
| Multi-bot mode race conditions | Medium | High | `sequentialize` middleware + per-chat isolation |
| ioredis event listener issues on Bun | Medium | Medium | Dev only on Bun; production uses Node.js 22 |
| InsForge Realtime Socket.IO disconnect | Low | Medium | Auto-reconnect built into Socket.IO; 30s polling fallback |

---

## 19. Brainstorming Decisions Log

> All decisions finalized via brainstorming session (v3.0, 2026-03-03)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | **Runtime** | **Bun dev + Node.js 22 prod** | Bun for fast dev (`--watch`), Node.js for ioredis stability in Docker |
| 2 | **Database** | **InsForge REST from day one** | No Prisma, no local DB. TypeScript port of `insforge_client.py`. Zero schema sync issues |
| 3 | **Verification timeout** | **Kick after 5 min** | Auto-kick unverified users. Clean, prevents ghost muted accounts. Rejoin = fresh verify |
| 4 | **Verification message** | **Inline + auto-delete** | Post in group with verify button, auto-delete after verify or timeout. Matches PTB pattern |
| 5 | **Error reporting** | **Pino + Sentry** | Pino for structured logs, Sentry for real-time alerts. Reuse existing Sentry infra from PTB |
| 6 | **Service messages** | **Skipped** | Not a configurable feature. Implementation detail only |
| 7 | **Testing** | **Business logic + API mocking** | 30-40 tests with mocked Telegram API calls. Covers critical paths + edge cases |
| 8 | **Realtime** | **Phase 5 (Multi-Bot)** | Not needed for single-bot. Add InsForge Socket.IO client when dashboard integration starts |
| 9 | **Logging library** | **pino 10** | Fastest, JSON-structured, low overhead |
| 10 | **Testing framework** | **vitest 4** | ESM-native, Bun-compatible, fastest |
| 11 | **ORM** | **None** | Direct InsForge REST via native `fetch()`. No Prisma, no `@insforge/sdk` |
| 12 | **Redis client** | **ioredis 5.9** | Same pattern as Python bot, ratelimiter plugin compatible |
| 13 | **Config validation** | **zod 4** | Type inference, composable schemas |
| 14 | **Cache key namespace** | **`nezuko:v2:` prefix** | Clear versioning, no conflicts with Python bot |
| 15 | **CI/CD** | **GitHub Actions** | Separate workflow for `apps/grammy/` (Phase 7) |
| 16 | **Max channels per group** | **5** | More than 5 makes verification UX painful (must join ALL). Easy to raise later |
| 17 | **Command set** | **8 commands** | `/start`, `/help`, `/protect`, `/unprotect`, `/channels`, `/settings`, `/verify`, `/stats`. Removed `/status` |
| 18 | **Update delivery** | **Long polling only** | No public URL needed. grammY `runner` handles concurrency. Simple Docker deployment |
| 19 | **Docker image** | **3-stage build** | Stage 1: Bun install (fast). Stage 2: Node tsc build. Stage 3: `node:22-slim` runtime (~120MB) |
| 20 | **CI/CD scope** | **Lint + Type + Test + Docker build** | Manual deploy for now. Auto-deploy (CD) added after bot is proven stable |
| 21 | **Cache strategy** | **3-layer hybrid** | L1: `chat-members` plugin (event-driven). L2: Redis 6h TTL (derived verification). L3: 15min sync job |
| 22 | **chat-members plugin** | **Added to stack** | Official grammY plugin for automatic `getChatMember` caching. Cache-first, API-fallback |
| 23 | **Multi-channel verification** | **Join ALL channels** | Must be member of every linked channel to pass. Core value proposition. Matches PTB |
| 24 | **Admin validation** | **chat-members plugin** | Admin status cached automatically via `chat_member` events. Falls back to API on miss. Zero extra code |
| 25 | **Bot removed from group** | **Soft-disable, never delete** | Set `enabled=false`, keep ALL data (channels, settings, stats) in DB. Dashboard shows group tagged as "bot removed". If re-added, protection resumes instantly |
| 26 | **Supergroup migration** | **Handle event + error fallback** | Listen for `migrate_to_chat_id` event, update group ID in InsForge. Also catch 400 errors with `migrate_to_chat_id` as fallback for race condition. ~20 lines |
| 27 | **allowed_updates** | **4 types** | `["message", "callback_query", "chat_member", "my_chat_member"]`. No `chat_join_request` for v1 |
| 28 | **Rate limiter** | **grammY defaults** | `1 per 1s` per user, silent ignore on exceed. Redis-backed via ioredis |
| 29 | **Graceful shutdown** | **4-step enhanced** | 1) `handle.stop()` 2) `await handle.task()` with 8s timeout 3) `Promise.allSettled` cleanup (InsForge status→offline, Redis quit, Sentry flush) 4) `process.exit(0)`. Docker SIGKILL-safe |
| 30 | **Bot owner features** | **Skipped for v1** | No bot owner concept. All admin commands are group-admin scoped. Owner features deferred |
| 31 | **Error message tone** | **Friendly with emoji** | "❌ Oops! Join @channel first!" style. Matches PTB bot. Keeps group chat vibe light |
| 32 | **Bot permission detection** | **3-layer defense** | L1: Check `can_restrict_members` + `can_delete_messages` on `/protect` setup. L2: Listen for `my_chat_member` demotion → disable group + notify. L3: Catch 403 on each mute/kick action gracefully |
| 33 | **Architecture v2** | **4 critical fixes applied** | Added `sequentialize` (first middleware), error boundaries per composer, callback query answerer, removed all Prisma references. Flattened database layer, split channels composer, added migration composer |
| 34 | **Realtime architecture** | **InsForge Realtime (Socket.IO)** | Two systems: Telegram→Bot via grammY `run()`, Bot↔Dashboard via InsForge Realtime. DB triggers as event bus. 5 channels. `socket.io-client` for bot, `@insforge/sdk` for dashboard. ~200ms latency. See §17 |
| 35 | **`/verify` command** | **Status check only** | `/verify` replies "You're verified ✅" or "Not verified — join @channel1". Informational only, no unmute. The inline button is the primary verification flow |
| 36 | **Bot added to group** | **Welcome message** | On `my_chat_member` (added as admin), send one-time "Hi! I'm Nezuko 🌸 — use `/protect @channel` to enable verification". Only when added as admin, not regular member |
| 37 | **Existing members on `/protect`** | **New joins only** | Existing members are grandfathered in. Only people who join AFTER `/protect` get muted + verified. `member-sync` can passively log status but never retroactively mute |

---

## 20. Appendix: Official Code References

All code examples in this PRD are sourced from the **grammY official documentation** stored in our skill files:

### Guide References

| File | Section Used In |
|---|---|
| `guide/introduction.md` | §2.1 Overview |
| `guide/getting-started.md` | §5.1 Bot Creation |
| `guide/basics.md` | §5.6 API Calls |
| `guide/context.md` | §2.4, §5.6 Context |
| `guide/middleware.md` | §5.2 Middleware |
| `guide/filter-queries.md` | §2.2, §5.4 Filters |
| `guide/commands.md` | §5.3 Commands |
| `guide/api.md` | §5.6 API Calls |
| `guide/deployment-types.md` | §13.1 Long Polling |
| `guide/errors.md` | §11.1-11.3 Errors |
| `guide/files.md` | Referenced for file handling |
| `guide/reactions.md` | §9.1 allowed_updates |

### Plugin References

| File | Section Used In |
|---|---|
| `plugins/auto-retry.md` | §6.1 Rate Limits |
| `plugins/parse-mode.md` | §6.1 Formatting |
| `plugins/hydrate.md` | §6.1 Enrichment |
| `plugins/runner.md` | §6.1, §12.2 Concurrency |
| `plugins/ratelimiter.md` | §6.1 Flood Protection |
| `plugins/commands.md` | §6.1 Command Groups |
| `plugins/keyboard.md` | §5.5 Inline Keyboards |
| `plugins/router.md` | §6.2 (not selected) |
| `plugins/session.md` | §6.2 (not selected) |
| `plugins/transformer-throttler.md` | §6.2 (not selected) |
| `plugins/chat-members.md` | Referenced for member tracking |

### Advanced References

| File | Section Used In |
|---|---|
| `advanced/middleware.md` | §5.2 Middleware Tree |
| `advanced/transformers.md` | §5.7 Transformers |
| `advanced/scaling.md` | §12.2 Concurrency |
| `advanced/reliability.md` | §11.4 Graceful Shutdown |
| `advanced/flood.md` | §6.1 auto-retry |
| `advanced/structuring.md` | §8 Project Structure |
| `advanced/deployment.md` | §14.2 Testing |

---

## 21. Architecture & Flow Diagrams

### Diagram 1 — Bot Startup Sequence

> **v2** — Updated for `run()`, InsForge REST, realtime connect, 4-step shutdown

```mermaid
sequenceDiagram
    participant Main as main.ts
    participant Config as loadConfig()
    participant DB as InsForge REST
    participant Cache as createCache()
    participant Factory as createBot()
    participant RT as InsForge Realtime
    participant TG as Telegram API
    participant Services as Background Services

    Main->>Config: Load & validate env (Zod)
    Config-->>Main: Config object

    Main->>DB: createInsForgeClient(baseUrl, anonKey)
    DB-->>Main: InsForgeClient (fetch-based)

    Main->>Cache: Connect (ioredis → Redis)
    Cache-->>Main: CacheClient + chatMembersAdapter

    Main->>Factory: createBot(token, {db, cache, logger})
    Factory->>Factory: Transformers: auto-retry, parseMode(HTML)
    Factory->>Factory: MW 1: sequentialize (per chat)
    Factory->>Factory: MW 2: ratelimiter (1/1s, Redis)
    Factory->>Factory: MW 3: hydrate + hydrateReply
    Factory->>Factory: MW 4: chatMembers (Redis adapter)
    Factory->>Factory: MW 5: contextEnricher (db, cache, logger)
    Factory->>Factory: Composers with errorBoundary: admin, channels, migration, events, verify, fallback
    Factory->>Factory: bot.catch() global error handler
    Factory-->>Main: Bot<NezukoContext>

    Main->>Services: startStatusWriter(api, db, botId) → 30s interval
    Main->>Services: startMemberSync(api, db, botId) → 15min interval
    Main->>Services: startHealthServer(port) → HTTP /health

    Main->>RT: realtime.connect() via Socket.IO
    alt WebSocket connected
        RT-->>Main: true
        Main->>RT: subscribe("commands", "bot_instances")
        Note over Main,RT: ✅ Instant command dispatch enabled
    else WebSocket unavailable
        RT-->>Main: false
        Note over Main: ⚠️ 30s polling fallback
    end

    Main->>TG: run(bot, {allowed_updates}) via @grammyjs/runner
    TG-->>Main: botInfo (username, id)

    Note over Main,TG: 🟢 Bot running — concurrent long polling (500 updates)

    Main->>Main: Register process.once(SIGINT/SIGTERM)
    Note over Main: 4-step shutdown: stop runner → await task (8s max) → cleanup → exit
```

### Diagram 2 — Middleware Pipeline (Update Processing)

> **v2** — Correct middleware order with `sequentialize`, `chatMembers`, error boundaries

```mermaid
flowchart TD
    TG["📡 Telegram API<br/>(getUpdates via runner)"] --> |"Update JSON"| Bot["🤖 Bot Instance"]

    Bot --> T1["⚙️ Transformer: auto-retry<br/>(outgoing API calls)"]
    Bot --> T2["⚙️ Transformer: parseMode<br/>(default HTML)"]

    Bot --> M1["🔒 MW 1: sequentialize<br/>(per-chat queue — MUST be first)"]
    M1 --> M2["🛡️ MW 2: ratelimiter<br/>(1 req/1s per user, Redis)"]
    M2 --> M3["🔗 MW 3: hydrateReply + hydrate<br/>(msg.editText, msg.delete)"]
    M3 --> M4["👥 MW 4: chatMembers<br/>(cache getChatMember in Redis)"]
    M4 --> M5["📦 MW 5: contextEnricher<br/>(inject db, cache, logger, botId)"]

    M5 --> Router{"🌳 Composer Tree<br/>(filter queries)"}

    Router -->|"/start, /help,<br/>/protect, /settings"| Admin["📋 adminComposer<br/>(errorBoundary)"]
    Router -->|"/channels, /verify,<br/>/stats"| Channels["📢 channelsComposer<br/>(errorBoundary)"]
    Router -->|"chat_member join/leave,<br/>my_chat_member"| Events["👋 eventsComposer<br/>(errorBoundary)"]
    Router -->|"migrate_to_chat_id"| Migration["🔄 migrationComposer<br/>(errorBoundary)"]
    Router -->|"callback_query:verify:*"| Verify["✅ verifyComposer<br/>(errorBoundary)"]
    Router -->|"unmatched callbacks"| Fallback["🔇 fallbackComposer<br/>(no boundary — always answers)"]

    Admin --> Response["📤 Response<br/>(via Telegram API)"]
    Channels --> Response
    Events --> Response
    Migration --> Response
    Verify --> Response
    Fallback --> Response

    Bot --> ErrorHandler["❌ bot.catch()<br/>(GrammyError / HttpError — safety net)"]

    style TG fill:#2196F3,color:#fff
    style Bot fill:#4CAF50,color:#fff
    style M1 fill:#ff5722,color:#fff
    style Router fill:#FF9800,color:#fff
    style ErrorHandler fill:#f44336,color:#fff
```

### Diagram 3 — New Member Join → Verification → Unmute (Complete Flow)

```mermaid
sequenceDiagram
    participant User as 👤 New User
    participant TG as Telegram
    participant Bot as 🤖 Nezuko Bot
    participant Cache as 🔴 Redis
    participant DB as 🗄️ Database
    participant Channel as 📢 Channel

    User->>TG: Joins protected group
    TG->>Bot: Update: message:new_chat_members

    Note over Bot: EC-1: Skip if member.is_bot
    Note over Bot: EC-5: Iterate new_chat_members array
    Note over Bot: EC-9: Skip if !member.id

    Bot->>TG: getChatMember(groupId, userId)
    TG-->>Bot: ChatMember status

    alt User is admin/creator (EC-17)
        Note over Bot: Skip — don't mute admins
    else User is regular member
        Bot->>TG: restrictChatMember(groupId, userId, {can_send_messages: false})
        Note over Bot: ⚠️ EC-19: Catch 400 if missing permission

        Bot->>DB: getGroupChannels(groupId)
        DB-->>Bot: Channel[] (linked channels)

        Bot->>TG: sendMessage with InlineKeyboard
        Note over TG: 📩 "Welcome! Join channels<br/>and click ✅ Verify"
        TG-->>User: Verification message shown

        Note over Bot: setTimeout(5min) → auto-delete message
    end

    rect rgb(240, 248, 255)
        Note over User,Channel: User joins required channels...
        User->>Channel: Subscribes to @channel1
        User->>Channel: Subscribes to @channel2
    end

    User->>TG: Clicks "✅ Verify" button
    TG->>Bot: Update: callback_query data="verify:-100123"

    Note over Bot: EC-11: Check debounce (Redis 3s TTL)

    Bot->>Cache: GET verify_debounce:{userId}
    Cache-->>Bot: null (no debounce)
    Bot->>Cache: SET verify_debounce:{userId} "1" EX 3

    loop For each linked channel
        Bot->>Cache: GET member:{channelId}:{userId}
        alt Cache hit
            Cache-->>Bot: "1" (cached member)
        else Cache miss
            Bot->>TG: getChatMember(channelId, userId)
            Note over Bot: EC-42: Catch 400 USER_ID_INVALID
            Note over Bot: EC-43: Accept "restricted" as valid
            Note over Bot: EC-45: Catch 403 channel inaccessible
            TG-->>Bot: ChatMember status
            Bot->>Cache: SET member:{channelId}:{userId} "1" EX 300
        end
    end

    alt All channels verified ✅
        Bot->>TG: restrictChatMember(groupId, userId, {all permissions: true})
        Bot->>Cache: SET verified:{groupId}:{userId} "1" EX 3600
        Bot->>DB: logVerification(groupId, userId, "verified")
        Bot->>TG: answerCallbackQuery("✅ Verified!")
        Bot->>TG: deleteMessage (verification message)
        Note over Bot: EC-14: Catch if message already deleted
    else Missing channels ❌
        Bot->>TG: answerCallbackQuery("❌ Please join: @channel1, @channel2")
        Note over Bot: EC-12: Catch QUERY_ID_INVALID if expired
    end
```

### Diagram 4 — `/protect @channel` Command Flow

```mermaid
flowchart TD
    Cmd["/protect @channel"] --> ChatCheck{"Chat type?"}

    ChatCheck -->|"private"| Reject1["⚠️ Only works in groups"]
    ChatCheck -->|"group (basic)"| Reject2["⚠️ Must be supergroup<br/>(EC-29)"]
    ChatCheck -->|"supergroup ✅"| AdminCheck

    AdminCheck{"Is sender admin?"} -->|"No (EC-30)"| Reject3["⚠️ Only admins can use this"]
    AdminCheck -->|"Yes ✅"| ArgCheck

    ArgCheck{"Has @channel arg?"} -->|"No"| Reject4["Usage: /protect @channel"]
    ArgCheck -->|"Yes ✅"| ChannelValidate

    ChannelValidate["Validate channel..."] --> ChannelExists{"Does channel exist?<br/>(EC-26)"}
    ChannelExists -->|"No (400 error)"| Reject5["❌ Channel not found"]
    ChannelExists -->|"Yes ✅"| BotInChannel

    BotInChannel{"Bot admin in channel?<br/>(EC-27)"} -->|"No"| Reject6["❌ Add me as admin<br/>in the channel first"]
    BotInChannel -->|"Yes ✅"| AlreadyLinked

    AlreadyLinked{"Already linked?<br/>(EC-28)"} -->|"Yes"| Reject7["ℹ️ Already linked"]
    AlreadyLinked -->|"No ✅"| MaxCheck

    MaxCheck{"Channels < 5?<br/>(EC-33)"} -->|"No"| Reject8["⚠️ Max 5 channels per group"]
    MaxCheck -->|"Yes ✅"| BotAdmin

    BotAdmin{"Bot admin in group?<br/>(EC-31)"} -->|"No"| Reject9["⚠️ Make me admin first"]
    BotAdmin -->|"Yes ✅"| Save

    Save["💾 Save to DB:<br/>ProtectedGroup +<br/>EnforcedChannel +<br/>GroupChannelLink"] --> Success["✅ Channel linked!<br/>New members must join<br/>@channel to chat"]

    style Reject1 fill:#ffcdd2
    style Reject2 fill:#ffcdd2
    style Reject3 fill:#ffcdd2
    style Reject4 fill:#ffcdd2
    style Reject5 fill:#ffcdd2
    style Reject6 fill:#ffcdd2
    style Reject7 fill:#fff9c4
    style Reject8 fill:#ffcdd2
    style Reject9 fill:#ffcdd2
    style Save fill:#c8e6c9
    style Success fill:#a5d6a7
```

### Diagram 5 — Multi-Bot Dashboard Mode

```mermaid
flowchart TD
    Main["main.ts"] --> ModeCheck{"DASHBOARD_MODE?"}

    ModeCheck -->|"false"| SingleBot["🤖 Single-Bot Mode<br/>Load BOT_TOKEN from .env"]
    SingleBot --> CreateBot1["createBot(token, deps)"]
    CreateBot1 --> Start1["run(bot) — concurrent long polling"]

    ModeCheck -->|"true"| DashboardMode["🏢 Dashboard Mode<br/>Load from database"]

    DashboardMode --> FetchTokens["DB: Fetch bot_instances<br/>WHERE status = 'active'"]
    FetchTokens --> DecryptLoop["For each bot token..."]

    DecryptLoop --> Decrypt["🔐 AES-256-GCM Decrypt<br/>(EC-55: catch crypto errors)"]
    Decrypt --> Validate["Validate token format<br/>(EC-53: catch invalid tokens)"]

    Validate --> CreateBotN["createBot(token, deps)"]
    CreateBotN --> Registry["📋 BotRegistry<br/>(Map<botId, BotInstance>)"]
    Registry --> Runner["🏃 @grammyjs/runner<br/>+ sequentialize per chat"]

    Runner --> ConflictCheck{"409 Conflict?<br/>(EC-54)"}
    ConflictCheck -->|"Yes"| Skip["⏭️ Skip — another process<br/>already polling this token"]
    ConflictCheck -->|"No ✅"| Running["🟢 Bot running"]

    subgraph "Realtime Listeners"
        WS1["🔌 bot_instance_changed<br/>(start/stop/restart)"]
        WS2["🔌 command_updated<br/>(admin commands from dashboard)"]
    end

    WS1 --> Lifecycle["BotLifecycle<br/>start / stop / restart"]
    Lifecycle --> Registry

    WS2 --> CommandWorker["CommandWorker<br/>Execute admin commands"]

    subgraph "Per-Bot Services"
        S1["⏰ StatusWriter (30s)"]
        S2["🔄 MemberSync (15min)"]
    end

    Running --> S1
    Running --> S2

    style SingleBot fill:#e3f2fd
    style DashboardMode fill:#fff3e0
    style Registry fill:#e8f5e9
    style Runner fill:#f3e5f5
```

### Diagram 6 — Message Filtering Pipeline

```mermaid
flowchart TD
    MSG["📨 Incoming Message"] --> Self{"From bot itself?<br/>(EC-36)"}
    Self -->|"Yes"| Pass1["✅ Allow"]

    Self -->|"No"| SenderChat{"Has sender_chat?<br/>(EC-39)"}
    SenderChat -->|"Yes (channel post)"| Pass2["✅ Allow"]

    SenderChat -->|"No"| HasFrom{"Has ctx.from?<br/>(EC-40)"}
    HasFrom -->|"No (service msg)"| Pass3["✅ Allow"]

    HasFrom -->|"Yes"| Protected{"Group is protected?<br/>(channels.length > 0)"}
    Protected -->|"No"| Pass4["✅ Allow"]

    Protected -->|"Yes"| AdminCheck{"Sender is admin?<br/>(EC-35)"}
    AdminCheck -->|"Yes"| Pass5["✅ Allow"]

    AdminCheck -->|"No"| CacheCheck["🔴 Redis: GET<br/>verified:{groupId}:{userId}"]
    CacheCheck --> CacheHit{"Cache hit?"}
    CacheHit -->|"Yes = '1'"| Pass6["✅ Allow"]

    CacheHit -->|"No / Redis down (EC-59)"| DBCheck["🗄️ DB: isUserVerified<br/>(groupId, userId)"]
    DBCheck --> DBResult{"Verified in DB?"}
    DBResult -->|"Yes"| CacheWrite["Write to Redis<br/>EX 3600 (1 hour)"]
    CacheWrite --> Pass7["✅ Allow"]

    DBResult -->|"No"| Delete["🗑️ deleteMessage()<br/>(catch errors)"]
    Delete --> Note["EC-70: Catch 400 if >48h old"]

    style Pass1 fill:#c8e6c9
    style Pass2 fill:#c8e6c9
    style Pass3 fill:#c8e6c9
    style Pass4 fill:#c8e6c9
    style Pass5 fill:#c8e6c9
    style Pass6 fill:#c8e6c9
    style Pass7 fill:#c8e6c9
    style Delete fill:#ffcdd2
```

### Diagram 7 — Error Handling Architecture

```mermaid
flowchart TD
    Update["📡 Incoming Update"] --> MW["Middleware Pipeline"]

    MW --> |"Error thrown"| BotCatch["bot.catch(err)"]

    BotCatch --> TypeCheck{"Error type?"}

    TypeCheck -->|"GrammyError"| APIError["Telegram API Error"]
    TypeCheck -->|"HttpError"| NetError["Network Error"]
    TypeCheck -->|"Other"| BugError["🐛 Application Bug"]

    APIError --> CodeCheck{"error_code?"}
    CodeCheck -->|"400"| BadRequest["Bad Request<br/>(invalid params, expired query)"]
    CodeCheck -->|"403"| Forbidden["Forbidden<br/>(bot kicked, no perms)"]
    CodeCheck -->|"409"| Conflict["Conflict<br/>(another poller active)"]
    CodeCheck -->|"429"| RateLimit["Rate Limit<br/>(auto-retry handles)"]

    Forbidden --> MarkInactive["Mark group inactive in DB"]
    Conflict --> StopBot["Stop this bot instance"]
    RateLimit --> AutoRetry["⚙️ auto-retry plugin<br/>waits retry_after seconds"]

    NetError --> RetryNet["⚙️ auto-retry plugin<br/>exponential backoff"]

    BugError --> LogError["📝 Log full stack trace<br/>(pino structured logging)"]

    subgraph "Per-Composer Error Boundaries"
        EB1["adminComposer.errorBoundary()"]
        EB2["channelsComposer.errorBoundary()"]
        EB3["migrationComposer.errorBoundary()"]
        EB4["eventsComposer.errorBoundary()"]
        EB5["verifyComposer.errorBoundary()"]
    end

    EB1 --> UserMsg1["Reply: ⚠️ Error, try again"]
    EB2 --> UserMsg2["Reply: ⚠️ Error, try again"]
    EB3 --> SilentLog1["Silent log<br/>(migration is internal)"]
    EB4 --> SilentLog2["Silent log<br/>(don't spam group)"]
    EB5 --> Callback["answerCallbackQuery<br/>(⚠️ Error, try again)"]

    MW --> EB1
    MW --> EB2
    MW --> EB3
    MW --> EB4
    MW --> EB5

    style BotCatch fill:#f44336,color:#fff
    style AutoRetry fill:#4CAF50,color:#fff
    style RetryNet fill:#4CAF50,color:#fff
    style MarkInactive fill:#FF9800,color:#fff
    style StopBot fill:#f44336,color:#fff
    style LogError fill:#9C27B0,color:#fff
```

---

## 22. Pinned Dependency Versions (Latest as of March 2026)

All dependencies pinned to their **exact latest stable versions**. No wildcards, no `^`, no `~`.

### 22.1 Core Dependencies

| Package | Version | Released | Purpose |
|---|---|---|---|
| `grammy` | **1.40.1** | Feb 28, 2026 | Telegram Bot framework (Bot API 9.4) |
| `@grammyjs/auto-retry` | **2.0.2** | Mar 2025 | Retry 429/500/network errors |
| `@grammyjs/hydrate` | **1.6.0** | Oct 2025 | `msg.editText()`, `msg.delete()` |
| `@grammyjs/parse-mode` | **2.2.1** | Feb 9, 2026 | Default HTML, `replyWithHTML`, `fmt` |
| `@grammyjs/runner` | **2.0.3** | 2023 (stable) | Concurrent update processing |
| `@grammyjs/ratelimiter` | **1.2.1** | Mar 2025 | User-level flood protection |
| `@grammyjs/commands` | **1.3.0** | Feb 10, 2026 | Command groups, scoping, localization |
| `@grammyjs/chat-members` | **1.x** | Latest | Automatic getChatMember cache (Redis adapter) |
| `ioredis` | **5.9.3** | Feb 12, 2026 | Redis client |
| `pino` | **10.3.1** | Feb 9, 2026 | Structured JSON logging |
| `zod` | **4.3.6** | Jan 22, 2026 | Runtime type validation |
| `@sentry/node` | **9.x** | Latest | Error reporting + performance monitoring |
| `socket.io-client` | **4.8.x** | Latest | InsForge Realtime WebSocket client (Phase 5) |

> **Note**: No Prisma, no `@insforge/sdk` for DB. Database access uses native `fetch()` to InsForge REST API (see §10).
> **Phase 5 adds**: `socket.io-client` for InsForge Realtime (same Socket.IO protocol). Dashboard uses `@insforge/sdk` `.realtime` module — bot uses raw client for lighter footprint.

### 22.2 Dev Dependencies

| Package | Version | Released | Purpose |
|---|---|---|---|
| `typescript` | **5.9.x** | Latest | TypeScript compiler |
| `vitest` | **4.0.18** | Jan 22, 2026 | Test framework (ESM-native) |
| `@types/node` | **22.x** | Latest | Node.js type definitions |
| `prettier` | **3.5.x** | Latest | Code formatter |
| `eslint` | **9.x** | Latest | Linter (flat config) |
| `pino-pretty` | **13.x** | Latest | Dev log formatting |

### 22.3 Runtime

| Tool | Version | Purpose |
|---|---|---|
| **Bun** | **1.3.10** | **Dev only**: package manager + `bun run --watch` |
| **Node.js** | **22.x LTS** | **Production**: Docker runtime (stability + ioredis compat) |
| **Redis** | **7.4+** | Cache + ratelimiter backend |

### 22.4 package.json (Exact Versions)

```json
{
  "name": "nezuko-grammy-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "grammy": "1.40.1",
    "@grammyjs/auto-retry": "2.0.2",
    "@grammyjs/hydrate": "1.6.0",
    "@grammyjs/parse-mode": "2.2.1",
    "@grammyjs/runner": "2.0.3",
    "@grammyjs/ratelimiter": "1.2.1",
    "@grammyjs/commands": "1.3.0",
    "@grammyjs/chat-members": "1.3.0",
    "ioredis": "5.9.3",
    "pino": "10.3.1",
    "zod": "4.3.6"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "4.0.18",
    "@types/node": "22.13.8",
    "prettier": "3.5.3",
    "eslint": "9.22.0",
    "pino-pretty": "13.0.0"
  }
}
```

### 22.5 Version Selection Rationale

| Choice | Why This Version |
|---|---|
| **No Prisma** | InsForge REST from day one — no schema sync, no ORM overhead, matches Python bot pattern |
| **Native `fetch()`** over `@insforge/sdk` | Server-side bot needs low-level HTTP control; SDK is browser-focused |
| **Zod 4** over 3 | Better performance, new features, stable since Nov 2025 |
| **Pino 10** over 9 | Faster serialization, improved transport API |
| **Vitest 4** over 3 | ESM-native, Bun-compatible, faster watch mode |
| **ioredis 5.9** over 5.8 | Bug fixes, Redis 7 command support |
| **Bun dev + Node prod** | Bun for fast dev iteration; Node.js 22 in Docker for ioredis stability |

---

## 23. Comprehensive Edge Case Catalog

Every edge case below has been researched from Telegram Bot API documentation, community bug reports, Stack Overflow, GitHub issues, and our own PTB bot's production experience. Each edge case includes the **scenario**, **impact**, and **grammY handling code**.

### 23.1 New Member Join — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-1 | **Bot itself joins group** | Bot receives `new_chat_members` with itself in the array — must not mute itself | Filter: `if (member.id === ctx.me.id) continue;` |
| EC-2 | **Multiple users join simultaneously** | `new_chat_members` can be an ARRAY of users, not just one | Loop: `for (const member of ctx.msg.new_chat_members)` |
| EC-3 | **Bot joins via added by admin** | Bot receives `new_chat_members` with itself, may not be admin yet | Check `my_chat_member` update, not `new_chat_members` for self-joins |
| EC-4 | **User rejoins after being kicked** | User was previously kicked and unbanned — `getChatMember` may still return `"left"` briefly | Re-check membership with small delay (500ms) |
| EC-5 | **Forwarded join (added by another user)** | User A adds User B — `from` is User A, `new_chat_members` contains User B | Always iterate `new_chat_members`, don't use `ctx.from` for the new member |
| EC-6 | **Group migration (basic → supergroup)** | chat_id CHANGES. Old `new_chat_members` listener breaks | Handle `migrate_from_chat_id` / `migrate_to_chat_id` updates, update DB |
| EC-7 | **Privacy mode enabled (non-admin bot)** | Bot does NOT receive `new_chat_members` if not admin | Always ensure bot is admin — fail loudly if not |
| EC-8 | **Massive raid (100+ joins in seconds)** | Bot sees many `new_chat_members` updates rapidly | `ratelimiter` + batch restrict API calls |
| EC-9 | **User joins but has no `from.id`** | Some Telegram clients in edge cases don't provide full user info | Null check: `if (!member.id) continue;` |
| EC-10 | **User joins via invite link** | Up to 15-20% of `chat_member` updates may be missed by Telegram | Use `new_chat_members` as primary, `chat_member` as secondary |

```typescript
// ── EC-1, EC-2, EC-5, EC-9: Safe new member iteration ──
eventsComposer.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.msg.new_chat_members) {
    // EC-1: Skip bots (including ourselves)
    if (member.is_bot) continue;
    // EC-9: Ensure we have a valid user ID
    if (!member.id) continue;
    // Process...
  }
});

// ── EC-6: Group migration handling ──
bot.on("message", async (ctx) => {
  if (ctx.msg.migrate_to_chat_id) {
    const oldId = ctx.chat.id;
    const newId = ctx.msg.migrate_to_chat_id;
    ctx.log.info(`Group migrated: ${oldId} → ${newId}`);
    await ctx.db.migrateGroupId(oldId, newId);
  }
});

// ── EC-7: Admin check on startup ──
async function ensureBotIsAdmin(bot: Bot<NezukoContext>, chatId: number): Promise<boolean> {
  try {
    const me = await bot.api.getChatMember(chatId, bot.botInfo.id);
    return me.status === "administrator" || me.status === "creator";
  } catch {
    return false;
  }
}
```

### 23.2 Verification (Callback Query) — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-11 | **User clicks verify MULTIPLE TIMES rapidly** | Bot processes verification N times, sends N API calls | Debounce: track `lastVerifyTime` per user in Redis with 3s TTL |
| EC-12 | **Callback query expires (>15 seconds old)** | `answerCallbackQuery` throws `QUERY_ID_INVALID` | Catch `GrammyError` with code 400, silently ignore |
| EC-13 | **User clicks verify button from a DIFFERENT group** | `verify:chatId` matches but user isn't in that group | Validate: `ctx.callbackQuery.message?.chat.id === groupId` |
| EC-14 | **Verification message was deleted** | User clicks button on a deleted message — `deleteMessage` fails | Catch and ignore `400: message to delete not found` |
| EC-15 | **Channel made private after link** | `getChatMember` throws `403: Forbidden` on private channel | Catch 403, treat as "channel unreachable", inform admin |
| EC-16 | **Bot removed from channel** | `getChatMember` on the channel fails with 403 | Catch 403, mark channel as inactive, skip in verification |
| EC-17 | **User is already a group admin** | Admin joins but gets muted by bot — conflicts with admin rights | Check if user is admin BEFORE muting: skip if `admin/creator` |
| EC-18 | **User left channel DURING verification** | Between getChatMember calls, user leaves one channel | Check ALL channels atomically, report all missing at once |
| EC-19 | **Bot lacks `can_restrict_members` permission** | `restrictChatMember` fails with 403 | Catch, notify admin: "I need Restrict Members permission" |
| EC-20 | **Callback data doesn't match expected format** | Malformed `callback_data` crashes regex | Regex already handles via `/^verify:(-?\d+)$/` — non-match falls through |

```typescript
// ── EC-11: Debounce rapid verify clicks ──
verifyComposer.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const debounceKey = `verify_debounce:${userId}`;

  // Prevent double-processing within 3 seconds
  const existing = await ctx.cache.get(debounceKey);
  if (existing) {
    await ctx.answerCallbackQuery({ text: "⏳ Processing..." });
    return;
  }
  await ctx.cache.set(debounceKey, "1", "EX", 3);

  // ... normal verification logic ...
});

// ── EC-12: Handle expired callback queries ──
try {
  await ctx.answerCallbackQuery({ text: "✅ Verified!" });
} catch (e) {
  if (e instanceof GrammyError && e.error_code === 400) {
    // Query expired — just ignore
    return;
  }
  throw e;
}

// ── EC-15, EC-16: Handle channel access errors ──
async function checkChannelMembership(api: Api, channelId: number, userId: number) {
  try {
    const member = await api.getChatMember(channelId, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (e) {
    if (e instanceof GrammyError) {
      if (e.error_code === 403) return null; // Channel unreachable
      if (e.error_code === 400) return null; // User not found / invalid
    }
    throw e; // Re-throw unexpected errors
  }
}

// ── EC-17: Skip admin verification ──
eventsComposer.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.msg.new_chat_members) {
    if (member.is_bot) continue;

    // EC-17: Don't mute admins
    try {
      const chatMember = await ctx.api.getChatMember(ctx.chat.id, member.id);
      if (["administrator", "creator"].includes(chatMember.status)) continue;
    } catch { /* proceed with caution */ }

    // ... mute and send verification ...
  }
});

// ── EC-19: Handle missing permissions gracefully ──
try {
  await ctx.api.restrictChatMember(groupId, userId, {
    permissions: { can_send_messages: false },
  });
} catch (e) {
  if (e instanceof GrammyError && e.error_code === 400) {
    await ctx.reply("⚠️ I need <b>Restrict Members</b> permission to work!");
    return;
  }
  throw e;
}
```

### 23.3 Leave Detection — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-21 | **User kicked by admin (not left voluntarily)** | `left_chat_member` fires for both kicks and voluntary leaves | Check `chat_member` update for more details (kicked vs left) |
| EC-22 | **User leaves channel but bot doesn't get update** | Telegram doesn't guarantee `chat_member` delivery for channels | Periodic re-verification via member_sync job (15 min) |
| EC-23 | **User blocked the bot** | Bot can't send DM after they leave | Catch `403: bot was blocked by the user`, don't retry |
| EC-24 | **`left_chat_member` service message already deleted** | Another bot/admin deleted it before us | Catch `400: message to delete not found` |
| EC-25 | **Admin removes user** | `left_chat_member` fires but it was admin action | Check if `from.id !== left_chat_member.id` to distinguish |

```typescript
// ── EC-24: Safe service message deletion ──
eventsComposer.on("message:left_chat_member", async (ctx) => {
  // Delete "X left the group" service message, ignore if already gone
  await ctx.deleteMessage().catch(() => {});

  const leftUser = ctx.msg.left_chat_member;
  if (leftUser.is_bot) return;

  // EC-22: Invalidate verification cache
  await ctx.cache.del(`verified:${ctx.chat.id}:${leftUser.id}`);
});
```

### 23.4 Protection Setup (`/protect`) — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-26 | **Channel username doesn't exist** | `getChat("@nonexistent")` throws 400 | Catch, reply "Channel not found" |
| EC-27 | **Bot is not admin in the channel** | Can't verify members of that channel | `getChatMember(channelId, botId)` — check we're admin |
| EC-28 | **Channel already linked** | Duplicate `/protect @channel` command | Check DB first, reply "Already linked" if exists |
| EC-29 | **Group not a supergroup** | `restrictChatMember` doesn't work in basic groups | Check `ctx.chat.type === "supergroup"`, suggest migration |
| EC-30 | **User running /protect is NOT admin** | Non-admin tries to set up protection | Verify via `getChatMember(chatId, fromId)` — require `administrator/creator` |
| EC-31 | **Bot lacks admin rights in the group** | Can't restrict members | Check own admin status first, reply with instructions |
| EC-32 | **Channel is private (no username)** | Can't generate invite link in verification message | Use channel title only, or store invite link separately |
| EC-33 | **Max channels per group limit** | Linking too many channels makes verification tedious | Enforce a reasonable limit (e.g., max 5 channels per group) |
| EC-34 | **Same channel linked to 50+ different groups** | Database fan-out, performance concerns | No hard limit but monitor; index `group_channel_links(channel_id)` |

```typescript
// ── EC-26, EC-27: Validate channel before linking ──
async function validateChannel(api: Api, channelUsername: string, botId: number) {
  // EC-26: Does the channel exist?
  let chat;
  try {
    chat = await api.getChat(channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`);
  } catch (e) {
    if (e instanceof GrammyError && e.error_code === 400) {
      return { error: `Channel ${channelUsername} not found.` };
    }
    throw e;
  }

  // EC-27: Is the bot an admin in this channel?
  try {
    const botMember = await api.getChatMember(chat.id, botId);
    if (!["administrator", "creator"].includes(botMember.status)) {
      return { error: `I need to be an admin in ${channelUsername} first.` };
    }
  } catch {
    return { error: `Can't access ${channelUsername}. Add me as admin.` };
  }

  return { chat }; // Valid!
}

// ── EC-29: Enforce supergroup requirement ──
adminComposer.command("protect", async (ctx) => {
  if (ctx.chat.type !== "supergroup") {
    await ctx.reply("⚠️ Protection only works in supergroups. Please convert this group first.");
    return;
  }
  // ...
});

// ── EC-33: Max channels limit ──
const MAX_CHANNELS_PER_GROUP = 5;
const existingCount = await ctx.db.getGroupChannelCount(ctx.chat.id);
if (existingCount >= MAX_CHANNELS_PER_GROUP) {
  await ctx.reply(`⚠️ Maximum ${MAX_CHANNELS_PER_GROUP} channels per group. Remove one first.`);
  return;
}
```

### 23.5 Message Filtering — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-35 | **Admin sends message but isn't verified** | Admin's messages get deleted | Always allow admins — check admin status before filtering |
| EC-36 | **Bot's own messages get filtered** | Bot deletes its own replies | Skip if `ctx.from?.id === ctx.me.id` |
| EC-37 | **Media messages (photos, videos, stickers)** | Only filtering `:text` misses media spam | Filter ALL message types, not just text |
| EC-38 | **Forwarded messages** | Forwarded content from unverified users | Same filter — check sender, not original author |
| EC-39 | **Channel auto-forward posts** | Linked channel posts appear as messages | Skip messages where `sender_chat` exists (channel auto-posts) |
| EC-40 | **Service messages (pinned, changed title)** | Service messages have no restriction | Service messages can't be filtered — they're from Telegram |
| EC-41 | **User verified in one group but not another** | Cache key must include group ID | Key format: `verified:{groupId}:{userId}` |

```typescript
// ── EC-35, EC-36, EC-39: Comprehensive message filter ──
eventsComposer.on("message", async (ctx) => {
  // EC-36: Never filter our own messages
  if (ctx.from?.id === ctx.me.id) return;

  // EC-39: Skip auto-forwarded channel posts
  if (ctx.msg.sender_chat) return;

  // EC-40: Skip service messages (no text, no media, just service)
  if (!ctx.from) return;

  // Only filter in protected groups
  const channels = await ctx.db.getGroupChannels(ctx.chat.id);
  if (channels.length === 0) return;

  // EC-35: Always allow admins
  try {
    const chatMember = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if (["administrator", "creator"].includes(chatMember.status)) return;
  } catch { /* proceed with caution */ }

  // EC-41: Group-specific verification
  const isVerified = await ctx.cache.get(`verified:${ctx.chat.id}:${ctx.from.id}`);
  if (isVerified) return;

  const dbVerified = await ctx.db.isUserVerified(ctx.chat.id, ctx.from.id);
  if (dbVerified) {
    await ctx.cache.set(`verified:${ctx.chat.id}:${ctx.from.id}`, "1", "EX", 3600);
    return;
  }

  // Not verified — delete
  await ctx.deleteMessage().catch(() => {});
});
```

### 23.6 getChatMember API — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-42 | **`USER_ID_INVALID` (400 error)** | Bot has never "seen" this user | Catch 400, treat as "not a member" |
| EC-43 | **User has "restricted" status** | User IS a member but with restrictions — still counts as joined | Accept: `["member", "administrator", "creator", "restricted"]` |
| EC-44 | **Transient API inconsistency** | `getChatMember` returns stale data briefly after join/leave | Add small delay (300ms) before checking, or use cache invalidation |
| EC-45 | **User ID is correct but channel is private** | Bot can't check private channels it's not admin of | Catch 403, mark channel as inaccessible |
| EC-46 | **Rate limited on getChatMember** | Rapid checks across many users/channels | Batch with delays, use `auto-retry` plugin |
| EC-47 | **Telegram API temporarily down** | All `getChatMember` calls fail with `HttpError` | `auto-retry` handles; inform user to try again later |

```typescript
// ── EC-42, EC-43, EC-45: Robust membership check ──
const VALID_MEMBER_STATUSES = ["member", "administrator", "creator", "restricted"];

async function isMember(api: Api, chatId: number, userId: number): Promise<boolean | null> {
  try {
    const member = await api.getChatMember(chatId, userId);
    // EC-43: "restricted" users ARE members (just with limited perms)
    return VALID_MEMBER_STATUSES.includes(member.status);
  } catch (e) {
    if (e instanceof GrammyError) {
      // EC-42: User not found / never interacted
      if (e.error_code === 400) return false;
      // EC-45: Bot can't access channel
      if (e.error_code === 403) return null;
    }
    if (e instanceof HttpError) {
      // EC-47: Network/API down
      return null;
    }
    throw e;
  }
}
```

### 23.7 Bot Permissions — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-48 | **Bot demoted (admin → member)** | All restrict/delete operations fail | Listen to `my_chat_member` for status changes |
| EC-49 | **Bot removed from group entirely** | Bot gets `my_chat_member` with status `"left"/"kicked"` | Clean up: mark group inactive, stop services |
| EC-50 | **Bot added back after being removed** | Old data in DB but new session | Re-check all linked channels, re-mute pending users |
| EC-51 | **Group owner transfers ownership** | No API notification — only `chat_member` updates | Re-validate admin list periodically |
| EC-52 | **Another admin bot conflicts** | Two bots trying to mute/unmute same user | Use unique message identifiers, ignore foreign button clicks |

```typescript
// ── EC-48, EC-49: Monitor own status changes ──
bot.on("my_chat_member", async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status;
  const chatId = ctx.chat.id;

  if (newStatus === "administrator") {
    ctx.log.info(`Promoted to admin in ${chatId}`);
    // Re-initialize protection for this group
  } else if (newStatus === "member") {
    ctx.log.warn(`Demoted from admin in ${chatId} — protection disabled`);
    await ctx.db.setGroupActive(chatId, false);
  } else if (newStatus === "left" || newStatus === "kicked") {
    ctx.log.info(`Removed from ${chatId} — cleaning up`);
    await ctx.db.setGroupActive(chatId, false);
    await ctx.cache.del(`verified:${chatId}:*`); // Pattern delete
  }
});
```

### 23.8 Multi-Bot Mode — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-53 | **Invalid/revoked bot token in DB** | `new Bot(token)` throws immediately | Validate token format, catch `GrammyError` on `bot.api.getMe()` |
| EC-54 | **Same token used by another process** | `getUpdates` conflict — `409 Conflict` | Detect 409, refuse to start, warn admin |
| EC-55 | **Token decryption fails** | AES-GCM with wrong key → authentication tag invalid | Catch `ERR_CRYPTO_*`, log, skip bot |
| EC-56 | **50+ bots running simultaneously** | Memory/CPU exhaustion | Cap max instances, use `runner` with configured concurrency |
| EC-57 | **Bot token rotated while running** | Old token stops working mid-session | Listen for realtime `bot_instance_changed` event, restart |
| EC-58 | **Dashboard sends "stop" command for running bot** | Must gracefully stop without affecting others | Per-bot `AbortController` or `runner.stop()` isolation |

### 23.9 Cache & Database — Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-59 | **Redis connection lost** | All cache reads fail → every message triggers DB lookups | Graceful degradation: skip cache, go direct to DB. Reconnect auto. |
| EC-60 | **Redis returns stale data** | User left channel but cache says verified for 1 hour | Short TTL (5 min for member checks, 1 hour for verification) |
| EC-61 | **DB connection lost** | All operations fail | Retry with exponential backoff; if persistent, mark bot unhealthy |
| EC-62 | **Telegram ID exceeds INT32** | Telegram IDs like `8265490825` overflow INT32 (max 2.1B) | BIGINT in Prisma (`BigInt`), BIGINT in InsForge SQL |
| EC-63 | **Concurrent DB writes for same user** | Two `new_chat_members` updates for same user | Use `upsert` (not insert), add unique constraints |

```typescript
// ── EC-59: Graceful Redis degradation ──
async function getFromCacheOrDb(
  cache: CacheClient, db: DatabaseClient,
  key: string, dbFallback: () => Promise<boolean>
): Promise<boolean> {
  try {
    const cached = await cache.get(key);
    if (cached !== null) return cached === "1";
  } catch {
    // Redis down — fall through to DB
  }
  return dbFallback();
}

// ── EC-62: BigInt handling ──
// In Prisma schema: telegramId BigInt @unique
// In TypeScript: use BigInt or number (safe up to 2^53 - 1 = ~9 quadrillion)
// Telegram IDs are currently < 10B, safe as JavaScript number
```

### 23.10 Telegram API — Platform-Level Edge Cases

| # | Edge Case | Impact | Handling |
|---|---|---|---|
| EC-64 | **Telegram API returns 500** | Internal server error | `auto-retry` plugin handles with exponential backoff |
| EC-65 | **API returns 429 (flood limit)** | Too many requests | `auto-retry` waits `retry_after` seconds automatically |
| EC-66 | **API returns 502/504 (gateway error)** | Transient infrastructure issue | `auto-retry` with `rethrowHttpErrors: false` |
| EC-67 | **Long polling timeout** | No updates for a long time | grammY handles reconnection internally |
| EC-68 | **Duplicate updates** | Same update_id received twice | grammY's internal `offset` tracking prevents this |
| EC-69 | **Bot API 9.4+ new fields** | New fields in Update objects | grammY v1.40.1 supports all Bot API 9.4 types |
| EC-70 | **`deleteMessage` on message older than 48h** | Telegram API rejects — bots can only delete messages < 48h old | Catch 400, skip silently or notify admin |

---

### 23.11 Edge Case Summary

| Category | Count | Critical | High | Medium |
|---|---|---|---|---|
| New Member Join | 10 | 2 (EC-6, EC-7) | 4 | 4 |
| Verification | 10 | 2 (EC-11, EC-19) | 5 | 3 |
| Leave Detection | 5 | 0 | 2 | 3 |
| Protection Setup | 9 | 1 (EC-29) | 4 | 4 |
| Message Filtering | 7 | 1 (EC-35) | 3 | 3 |
| getChatMember | 6 | 1 (EC-47) | 2 | 3 |
| Bot Permissions | 5 | 2 (EC-48, EC-49) | 2 | 1 |
| Multi-Bot Mode | 6 | 1 (EC-54) | 3 | 2 |
| Cache & Database | 5 | 1 (EC-62) | 2 | 2 |
| Telegram API | 7 | 0 | 2 | 5 |
| **TOTAL** | **70** | **11** | **29** | **30** |

> All 11 critical edge cases are addressed with concrete grammY code above.

---

> **Document Total**: 2,970+ lines | **Sections**: 23 | **Sub-sections**: 80+ | **Code Examples**: 60+ | **Mermaid Diagrams**: 7 | **Edge Cases**: 70 | **Decisions**: 22 | **Official Sources**: 30+
>
> **Stack**: All dependencies pinned to exact latest March 2026 versions (§22)
>
> **Next Step**: Review open questions in §19, then begin Phase 1: Foundation

