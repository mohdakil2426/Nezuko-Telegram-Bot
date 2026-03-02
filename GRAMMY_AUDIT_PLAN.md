# 🚀 Nezuko grammY Bot — Production-Ready PRD & Implementation Blueprint

> **Version**: 2.0 | **Date**: 2026-03-03  
> **Scope**: Build `apps/grammy/` from scratch using grammY best practices — NOT a migration  
> **Philosophy**: Reference existing features, rebuild with grammY-native architecture  
> **grammY Version**: v1.40.1 (Bot API 9.4) | **Runtime**: Node.js + bun  

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Why grammY — Deep Framework Analysis](#2-why-grammy--deep-framework-analysis)
3. [grammY Pros, Cons & Comparison](#3-grammy-pros-cons--comparison)
4. [Architecture — Built for grammY](#4-architecture--built-for-grammy)
5. [grammY Core Concepts Deep Dive](#5-grammy-core-concepts-deep-dive)
6. [Plugin Selection & Configuration](#6-plugin-selection--configuration)
7. [Context Type System](#7-context-type-system)
8. [Project Structure](#8-project-structure)
9. [Module-by-Module Blueprint](#9-module-by-module-blueprint)
10. [Database Strategy (Local → InsForge)](#10-database-strategy-local--insforge)
11. [Error Handling & Reliability](#11-error-handling--reliability)
12. [Scaling & Concurrency](#12-scaling--concurrency)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Testing Strategy](#14-testing-strategy)
15. [Quality Gates](#15-quality-gates)
16. [Implementation Phases](#16-implementation-phases)
17. [Dashboard Compatibility (Future)](#17-dashboard-compatibility-future)
18. [Risk Assessment](#18-risk-assessment)
19. [Open Questions](#19-open-questions)
20. [Appendix: Official Code References](#20-appendix-official-code-references)

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
| **session** | DB-first architecture — no per-chat state needed | Nezuko stores everything in the database |
| **conversations** | No multi-step conversation flows | Verification is single-action, not a flow |
| **menu** | Inline keyboards are simple enough | No dynamic nested menus needed |
| **i18n / fluent** | Single language (English) | Can add later if i18n is needed |
| **transformer-throttler** | `auto-retry` is better | Throttler docs say "Consider using auto-retry instead" |
| **entity-parser** | Not displaying messages outside Telegram | Entity parser docs say "Probably NEVER" needed |
| **autoquote** | Not needed for verification bot | Auto-quoting adds noise in group chats |

---

## 7. Context Type System

### 7.1 Custom Context Design

```typescript
// apps/grammy/src/types.ts
import { Context, Api } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";
import { ParseModeFlavor } from "@grammyjs/parse-mode";
import { CommandsFlavor } from "@grammyjs/commands";
import type { DatabaseClient } from "./core/database";
import type { CacheClient } from "./core/cache";

/**
 * Custom context properties injected via middleware.
 * Available on every ctx object after contextEnricher runs.
 */
interface NezukoContextFlavor {
  /** Database client — Prisma (dev) or InsForge (prod) */
  db: DatabaseClient;
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
    Context & NezukoContextFlavor & CommandsFlavor
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

```
apps/grammy/
├── src/
│   ├── main.ts                          # Entry point — creates Bot, starts polling
│   ├── config.ts                        # Zod-validated environment config
│   ├── types.ts                         # NezukoContext + all shared types
│   │
│   ├── core/                            # Framework-level infrastructure
│   │   ├── bot-factory.ts               # Creates Bot<NezukoContext> with plugins
│   │   ├── cache.ts                     # Redis client (ioredis)
│   │   ├── constants.ts                 # Shared constants
│   │   ├── database.ts                  # Database abstraction (Prisma/InsForge)
│   │   ├── encryption.ts               # AES-256-GCM token decryption
│   │   └── uptime.ts                   # Uptime tracker
│   │
│   ├── middleware/                       # Custom grammY middleware
│   │   ├── context-enricher.ts          # Injects db/cache/logger into ctx
│   │   ├── admin-guard.ts              # Filter: only chat admins
│   │   └── group-only.ts              # Filter: only group/supergroup chats
│   │
│   ├── composers/                       # Feature modules (each exports a Composer)
│   │   ├── admin.ts                     # /start, /help, /protect, /unprotect, /settings
│   │   ├── events.ts                   # new_member, left_member, message filter
│   │   ├── verify.ts                   # Callback query handler for verification
│   │   └── fallback.ts                # Catch-all callback query answerer
│   │
│   ├── services/                        # Business logic (framework-agnostic)
│   │   ├── verification.ts             # Membership check + cache logic
│   │   ├── protection.ts              # Mute/unmute/restrict API calls
│   │   ├── channel-linker.ts          # Link/unlink channels to groups
│   │   ├── status-writer.ts           # Heartbeat interval
│   │   ├── member-sync.ts            # Count sync interval
│   │   └── batch-verification.ts     # Batch verify multiple users
│   │
│   ├── database/                        # Data access layer
│   │   ├── repositories/              # Repository pattern
│   │   │   ├── group.repo.ts          # Protected groups CRUD
│   │   │   ├── channel.repo.ts        # Enforced channels CRUD
│   │   │   ├── link.repo.ts           # Group↔Channel links CRUD
│   │   │   ├── verification.repo.ts   # Verification logs
│   │   │   └── bot-status.repo.ts     # Bot status heartbeat
│   │   ├── prisma/                    # Prisma schema + migrations (dev only)
│   │   │   ├── schema.prisma          # SQLite schema
│   │   │   └── migrations/            # Auto-generated
│   │   └── insforge/                  # InsForge SDK adapter (prod only)
│   │       └── adapter.ts             # Implements same interface as Prisma
│   │
│   ├── utils/                          # Pure utility functions
│   │   ├── auto-delete.ts             # Delete messages after delay
│   │   ├── logger.ts                  # pino structured logging
│   │   ├── ui.ts                      # Message text builders
│   │   └── health.ts                  # HTTP health endpoint
│   │
│   └── multi-bot/                      # Dashboard mode (Phase 2)
│       ├── bot-manager.ts             # Multi-bot coordinator
│       ├── bot-registry.ts            # Instance storage
│       ├── bot-lifecycle.ts           # Start/stop instances
│       └── realtime-client.ts         # InsForge WS subscriber
│
├── prisma/
│   └── schema.prisma                   # Shared schema (symlinked or copied)
├── package.json
├── tsconfig.json
├── .env                                # Local env vars
├── .env.example                        # Template
└── vitest.config.ts                    # Test configuration
```

### 8.2 Why This Structure

| Decision | Rationale |
|---|---|
| **`composers/` not `handlers/`** | grammY uses `Composer` class — naming reflects the framework |
| **`services/` are framework-agnostic** | Business logic doesn't import `grammy` — testable in isolation |
| **`database/repositories/`** | Repository pattern enables swapping Prisma ↔ InsForge |
| **`middleware/` is separate** | Custom middleware is distinct from composers (handlers) |
| **`multi-bot/` is isolated** | Dashboard mode is a separate concern — Phase 2 only |
| **No `core/loader.ts`** | grammY doesn't need a loader — `bot.use(composer)` is enough |

---

## 9. Module-by-Module Blueprint

### 9.1 Entry Point — `main.ts`

```typescript
// apps/grammy/src/main.ts
import { createBot } from "./core/bot-factory";
import { loadConfig } from "./config";
import { createDatabase } from "./core/database";
import { createCache } from "./core/cache";
import { createLogger } from "./utils/logger";
import { startStatusWriter } from "./services/status-writer";
import { startMemberSync } from "./services/member-sync";
import { startHealthServer } from "./utils/health";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const db = await createDatabase(config);
  const cache = createCache(config.redisUrl);

  logger.info("Starting Nezuko grammY bot...");

  const bot = createBot(config.botToken, { db, cache, logger });

  // Start background services
  const statusInterval = startStatusWriter(bot.api, db, config.botId);
  const syncInterval = startMemberSync(bot.api, db, config.botId);
  startHealthServer(config.healthPort);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    clearInterval(statusInterval);
    clearInterval(syncInterval);
    await bot.stop();
    await cache.quit();
    await db.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Source: grammy/references/guide/deployment-types.md
  // Long polling — simpler, no SSL, works everywhere
  await bot.start({
    onStart: (botInfo) => {
      logger.info(`Bot @${botInfo.username} started (ID: ${botInfo.id})`);
    },
    // Source: grammy/references/guide/reactions.md
    allowed_updates: ["message", "callback_query", "chat_member",
                      "chat_join_request", "my_chat_member"],
  });
}

main().catch(console.error);
```

### 9.2 Bot Factory — `core/bot-factory.ts`

```typescript
// apps/grammy/src/core/bot-factory.ts
import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { limit } from "@grammyjs/ratelimiter";
import { contextEnricher } from "../middleware/context-enricher";
import { adminComposer } from "../composers/admin";
import { eventsComposer } from "../composers/events";
import { verifyComposer } from "../composers/verify";
import { fallbackComposer } from "../composers/fallback";
import type { NezukoContext } from "../types";

interface BotDeps {
  db: DatabaseClient;
  cache: CacheClient;
  logger: Logger;
}

export function createBot(token: string, deps: BotDeps): Bot<NezukoContext> {
  const bot = new Bot<NezukoContext>(token);

  // ── Transformers (outgoing API call middleware) ──
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }));
  bot.api.config.use(parseMode("HTML"));

  // ── Middleware (incoming update processing) ──
  bot.use(hydrateReply);
  bot.use(hydrate());
  bot.use(limit({ timeFrame: 2000, limit: 3 }));
  bot.use(contextEnricher(deps));

  // ── Composers (handler tree) ──
  bot.use(adminComposer);
  bot.use(eventsComposer);
  bot.use(verifyComposer);
  bot.use(fallbackComposer);

  // ── Global Error Handler ──
  // Source: grammy/references/guide/errors.md
  bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;
    deps.logger.error({ err: e, updateId: ctx.update.update_id },
      `Error handling update ${ctx.update.update_id}`);

    if (e instanceof GrammyError) {
      deps.logger.error(`Bot API error: ${e.description}`);
    } else if (e instanceof HttpError) {
      deps.logger.error(`Network error: ${e.message}`);
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

## 10. Database Strategy (Local → InsForge)

### 10.1 Development: Prisma + SQLite

During development, we use **Prisma ORM** with **SQLite** for zero-config local development:

```prisma
// apps/grammy/prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model ProtectedGroup {
  id                  Int       @id @default(autoincrement())
  telegramId          BigInt    @unique // BIGINT for Telegram IDs
  title               String
  memberCount         Int       @default(0)
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  channels            GroupChannelLink[]
  verificationLogs    VerificationLog[]
}

model EnforcedChannel {
  id                  Int       @id @default(autoincrement())
  telegramId          BigInt    @unique
  username            String
  title               String
  subscriberCount     Int       @default(0)
  createdAt           DateTime  @default(now())
  groups              GroupChannelLink[]
}

model GroupChannelLink {
  id                  Int             @id @default(autoincrement())
  groupId             Int
  channelId           Int
  group               ProtectedGroup  @relation(fields: [groupId], references: [id])
  channel             EnforcedChannel @relation(fields: [channelId], references: [id])
  createdAt           DateTime        @default(now())

  @@unique([groupId, channelId])
}

model VerificationLog {
  id                  Int             @id @default(autoincrement())
  groupId             Int
  userId              BigInt
  status              String          // "verified" | "failed" | "pending"
  latencyMs           Int?
  group               ProtectedGroup  @relation(fields: [groupId], references: [id])
  createdAt           DateTime        @default(now())
}

model BotStatus {
  id                  Int       @id @default(autoincrement())
  botId               BigInt    @unique
  status              String    @default("online")
  uptimeSeconds       Int       @default(0)
  protectedGroups     Int       @default(0)
  enforcedChannels    Int       @default(0)
  lastHeartbeat       DateTime  @default(now())
}

model Owner {
  id                  Int       @id @default(autoincrement())
  telegramId          BigInt    @unique
  username            String?
  createdAt           DateTime  @default(now())
}
```

### 10.2 Repository Interface (Swappable Backend)

```typescript
// apps/grammy/src/database/repositories/types.ts
export interface GroupRepository {
  getGroupChannels(groupTelegramId: number): Promise<Channel[]>;
  isUserVerified(groupId: number, userId: number): Promise<boolean>;
  createGroup(telegramId: number, title: string): Promise<Group>;
  linkChannel(groupId: number, channelId: number): Promise<void>;
  unlinkChannel(groupId: number, channelId: number): Promise<void>;
  logVerification(groupId: number, userId: number, status: string): Promise<void>;
  upsertBotStatus(data: BotStatusData): Promise<void>;
}
```

### 10.3 Production: InsForge SDK Adapter

When ready for production, swap the database backend:

```typescript
// apps/grammy/src/database/insforge/adapter.ts
import { createClient } from "@insforge/sdk";
import type { GroupRepository } from "../repositories/types";

export function createInsForgeAdapter(baseUrl: string, anonKey: string): GroupRepository {
  const client = createClient({ baseUrl, anonKey });

  return {
    async getGroupChannels(groupTelegramId: number) {
      const { data } = await client.database
        .from("group_channel_links")
        .select("*, enforced_channels(*)")
        .eq("group_telegram_id", groupTelegramId);
      return data ?? [];
    },
    // ... other methods using @insforge/sdk
  };
}
```

### 10.4 Environment-Based Switching

```typescript
// apps/grammy/src/core/database.ts
export async function createDatabase(config: Config): Promise<GroupRepository> {
  if (config.useInsForge) {
    const { createInsForgeAdapter } = await import("../database/insforge/adapter");
    return createInsForgeAdapter(config.insforgeUrl, config.insforgeAnonKey);
  } else {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    const { createPrismaAdapter } = await import("../database/prisma/adapter");
    return createPrismaAdapter(prisma);
  }
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

### Phase 5: Multi-Bot Mode (10 hours) — P1

| Task | File | Description |
|---|---|---|
| 5.1 | `src/multi-bot/bot-registry.ts` | Instance storage map |
| 5.2 | `src/multi-bot/bot-lifecycle.ts` | Start/stop individual bots |
| 5.3 | `src/multi-bot/bot-manager.ts` | Coordinator (dashboard commands) |
| 5.4 | `src/core/encryption.ts` | AES-256-GCM token decryption |
| 5.5 | Update `src/main.ts` | Dashboard mode detection |

### Phase 6: Testing (10 hours) — P0

| Task | File | Description |
|---|---|---|
| 6.1 | `tests/grammy/helpers/*` | Test utilities, mock factories |
| 6.2 | `tests/grammy/unit/services/*` | Unit tests for all services |
| 6.3 | `tests/grammy/unit/middleware/*` | Middleware unit tests |
| 6.4 | `tests/grammy/integration/composers/*` | Handler integration tests |
| 6.5 | `tests/grammy/integration/bot-factory.test.ts` | Full bot creation test |

### Phase 7: Polish & Production (4 hours) — P1

| Task | File | Description |
|---|---|---|
| 7.1 | `Dockerfile` | Multi-stage Docker build |
| 7.2 | `src/database/insforge/adapter.ts` | InsForge adapter (when ready) |
| 7.3 | Error message polish | Consistent, user-friendly messages |
| 7.4 | Documentation | README, inline docs |

### Total Estimated Effort: ~60 hours

```
Phase 1: Foundation          ████████░░  8h
Phase 2: Core Infrastructure ██████████░ 10h
Phase 3: Core Bot Logic      ████████████ 12h
Phase 4: Background Services ██████░░░░  6h
Phase 5: Multi-Bot Mode      ██████████░ 10h
Phase 6: Testing             ██████████░ 10h
Phase 7: Polish              ████░░░░░░  4h
                             ──────────
                             Total: 60h
```

---

## 17. Dashboard Compatibility (Future)

When connecting to InsForge, the grammY bot must produce **identical database writes** to maintain dashboard compatibility:

| Table | Key Fields | Write Pattern |
|---|---|---|
| `bot_status` | `bot_id`, `status`, `uptime_seconds` | UPSERT every 30s |
| `protected_groups` | `telegram_id`, `title`, `member_count` | UPSERT on /protect |
| `enforced_channels` | `telegram_id`, `username`, `subscriber_count` | UPSERT on /protect |
| `group_channel_links` | `group_id`, `channel_id` | INSERT on /protect, DELETE on /unprotect |
| `verification_log` | `user_id`, `group_id`, `status` | INSERT on each verify |
| `owners` | `telegram_id`, `username` | UPSERT on first interaction |

### Switchover Plan

1. **Parallel Running**: Both Python and grammY bots run simultaneously (different tokens)
2. **Database Verification**: Compare DB writes from both bots
3. **Token Swap**: Switch the production token to grammY bot
4. **Monitor**: Watch dashboard for 48 hours
5. **Cleanup**: Deprecate Python bot

---

## 18. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Prisma ↔ InsForge schema mismatch | Medium | High | Repository interface abstracts both; integration tests |
| grammY plugin version conflicts | Low | Medium | Pin exact versions in package.json |
| Redis cache key conflicts with Python bot | Medium | Medium | Namespace keys: `grammy:verified:...` |
| Telegram rate limits during testing | Medium | Low | auto-retry + separate test bot token |
| TypeScript strict mode reveals design issues | High | Low | Fix at compile time — this is a feature, not a bug |
| Multi-bot mode race conditions | Medium | High | `sequentialize` middleware + per-chat isolation |
| Database migration complexity | Low | Medium | Prisma handles SQLite; InsForge adapter is separate |

---

## 19. Open Questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | **Logging library** | pino vs winston vs consola | **pino** — fastest, JSON-structured, low overhead |
| 2 | **Health check server** | hono vs native http vs fastify | **hono** — 14KB, same adapter as webhookCallback |
| 3 | **Testing framework** | vitest vs jest vs bun test | **vitest** — fastest, ESM-native, bun-compatible |
| 4 | **Prisma vs Drizzle** | Prisma vs Drizzle ORM | **Prisma** — better DX, auto migrations, bigger ecosystem |
| 5 | **Redis client** | ioredis vs redis | **ioredis** — same as Python bot, ratelimiter compatible |
| 6 | **Config validation** | zod vs env-var vs dotenv-safe | **zod** — type inference, composable, used in web too |
| 7 | **Cache key namespace** | `grammy:` vs `nezuko:` prefix | **`nezuko:v2:`** — clear versioning |
| 8 | **InsForge SDK import** | Direct `@insforge/sdk` vs wrapper | **Wrapper** via repository pattern (already planned) |
| 9 | **Error reporting** | Sentry vs custom | **Sentry** (same as Python bot), add later |
| 10 | **CI/CD** | GitHub Actions | Separate workflow for `apps/grammy/` |

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

> **Document Total**: ~1,500 lines | **Code Examples**: 40+ | **Official Sources**: 30+ reference files
>
> **Next Step**: Review the open questions in §19, then begin Phase 1: Foundation

