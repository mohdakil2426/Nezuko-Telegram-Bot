---
name: grammy
description: Expert grammY Telegram bot framework assistant. Use this skill whenever the user is building, debugging, or extending a Telegram bot with grammY (TypeScript/JavaScript). Covers the full grammY ecosystem, core bot setup, middleware, context, context flavors, filter queries, sessions, conversations, inline keyboards, menus, inline queries, file handling, webhooks, long polling, error handling, all official plugins, scaling, and hosting/deployment. Trigger on any mention of grammY, Telegram bot development, @grammyjs packages, Bot API types, or questions about bot architecture patterns. Also trigger when users ask about TypeScript Telegram bots, grammy sessions not working, conversations plugin, bot scaling, or webhook setup — even if they don't say "grammY" explicitly.
---

# grammY Skill

You are an expert in the **grammY** Telegram bot framework for TypeScript/JavaScript.

## Golden Rule

**Read the relevant reference file before answering — never guess API signatures or method names.**

---

## Reference Files

All documentation is in `references/`. Read the right file for the task.

### Guide (`references/guide/`)

| File | When to read |
|------|-------------|
| `getting-started.md` | New bot from scratch |
| `basics.md` | Sending messages, Other options object |
| `context.md` | ctx shortcuts, flavors, customizing context |
| `commands.md` | Deep linking, command scopes |
| `filter-queries.md` | `bot.on()`, colon syntax, combining filters |
| `middleware.md` | Middleware chain, `next()`, composition |
| `files.md` | Uploading / downloading files |
| `errors.md` | BotError, GrammyError, HttpError, error boundaries |
| `reactions.md` | Message reactions |
| `deployment-types.md` | Webhooks vs long polling |
| `api.md` | Raw Bot API, `ctx.api.*`, transformers |
| `introduction.md` | How Telegram bots work (overview) |

### Advanced (`references/advanced/`)

| File | When to read |
|------|-------------|
| `scaling.md` | Concurrency, runner, sequentialize |
| `reliability.md` | Retries, error resilience |
| `flood.md` | Rate limiting, flood control |
| `middleware.md` | Deep middleware internals |
| `structuring.md` | Large bot file organization |
| `transformers.md` | API transformers |
| `deployment.md` | Production deployment best practices |
| `business.md` | Telegram Business account features |
| `proxy.md` | Bot API proxy setup |

### Plugins (`references/plugins/`)

| File | Plugin | Key use |
|------|--------|---------|
| `session.md` | Session (built-in) | Per-user/chat storage |
| `keyboard.md` | Keyboard (built-in) | Inline & reply keyboards |
| `inline-query.md` | Inline Query (built-in) | `@bot` inline mode |
| `media-group.md` | Media Group (built-in) | Album sending |
| `conversations.md` | `@grammyjs/conversations` | Multi-step flows |
| `menu.md` | `@grammyjs/menu` | Dynamic button menus |
| `commands.md` | `@grammyjs/commands` | Command management |
| `router.md` | `@grammyjs/router` | Routing by state |
| `i18n.md` | `@grammyjs/i18n` | Localization / translations |
| `parse-mode.md` | `@grammyjs/parse-mode` | Markdown / HTML formatting |
| `hydrate.md` | `@grammyjs/hydrate` | Methods on returned objects |
| `runner.md` | `@grammyjs/runner` | Concurrent long polling |
| `auto-retry.md` | `@grammyjs/auto-retry` | Auto flood-wait retry |
| `transformer-throttler.md` | `@grammyjs/transformer-throttler` | Outgoing rate limit |
| `ratelimiter.md` | `@grammyjs/ratelimiter` | Per-user rate limiting |
| `files.md` | `@grammyjs/files` | File download helpers |
| `emoji.md` | `@grammyjs/emoji` | Emoji constants |
| `chat-members.md` | `@grammyjs/chat-members` | Member tracking |
| `entity-parser.md` | `@grammyjs/entity-parser` | Parse message entities |
| `autoquote.md` | `@grammyjs/autoquote` | Auto-reply quoting |
| `fluent.md` | `@grammyjs/fluent` | Fluent i18n alternative |
| `stateless-question.md` | `@grammyjs/stateless-question` | Questions without session |

### API Reference (`references/api-ref/`)

Start with `references/api-ref/INDEX.md` for orientation.

| File | Module |
|------|--------|
| `core.md` | `Bot`, `Context`, `Composer`, `Api`, `Keyboard`, `InlineKeyboard`, `session`, `webhookCallback` |
| `types.md` | All Telegram Bot API types (`grammy/types`) |
| `conversations.md` | Conversations plugin exports |
| `menu.md` | Menu plugin exports |
| `runner.md` | Runner plugin exports |
| `storages.md` | MongoDB, Redis, PostgreSQL, Supabase adapters |
| _(others)_ | Named by plugin — check INDEX.md |

### Demo (`references/demo/`)

| File | Content |
|------|--------|
| `examples.md` | 10 complete, runnable grammY bots (echo, sessions, conversations, menus, webhooks, inline mode, rate limiting, production setup) |

### Hosting (`references/hosting/`)

One file per platform: `deno-deploy.md`, `cloudflare-workers.md`, `vercel.md`, `fly.md`, `heroku.md`, `vps.md`, etc.

---

## Quick Task Routing

The most common tasks and where to start:

- **New bot** → `guide/getting-started.md` → `guide/basics.md`
- **Handling commands / filters** → `guide/filter-queries.md`, `guide/commands.md`
- **Sessions** → `plugins/session.md`
- **Multi-step conversations** → `plugins/conversations.md` + `api-ref/conversations.md`
- **Inline keyboards / buttons** → `plugins/keyboard.md`
- **Dynamic menus** → `plugins/menu.md`
- **Inline mode** (`@bot query`) → `plugins/inline-query.md`
- **Files / media** → `guide/files.md`, `plugins/files.md`
- **TypeScript context types** → `guide/context.md` (Context Flavors section)
- **Error handling** → `guide/errors.md`
- **Webhooks** → `guide/deployment-types.md`, relevant `hosting/` file
- **Concurrency / scaling** → `advanced/scaling.md`, `api-ref/runner.md`
- **Internationalization** → `plugins/i18n.md`
- **Rate limiting** → `advanced/flood.md`, `plugins/ratelimiter.md`, `plugins/auto-retry.md`
- **Large bot structure** → `advanced/structuring.md`
- **Copy-paste examples** → `demo/examples.md` (10 runnable bots)

---

## Critical Patterns to Know

These are the most common sources of confusion or bugs in grammY. Know them well.

### Middleware Order Matters

Register middleware in this exact order — order determines execution:

```ts
bot.use(sequentialize(...));  // if needed
bot.use(session(...));         // BEFORE any handler that reads ctx.session
bot.use(conversations());      // BEFORE createConversation
bot.use(createConversation(myConvo));
bot.use(menu);                 // BEFORE handlers that use the menu
bot.on("message", handler);
```

### Context Flavors (TypeScript)

Plugins add properties to `ctx` via **context flavors**. Always compose them correctly:

```ts
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

// Additive flavors: combine with &
type MyContext = Context & SessionFlavor<MySession> & ConversationFlavor;

// Transformative flavors: nest them
type MyContext = HydrateFlavor<Context>;

// Mixing both kinds:
type MyContext = HydrateFlavor<Context & SessionFlavor<MySession>>;

const bot = new Bot<MyContext>("");
```

Check each plugin's docs for whether it uses additive (`Type & Flavor`) or transformative (`Flavor<Type>`) composition.

### The Golden Rule of Conversations

Inside a conversation builder function, the function **re-runs from the start on every new update** (replay engine). Any code that has side effects (DB reads/writes, `Math.random()`, `Date.now()`) must be wrapped:

```ts
// ❌ Wrong — runs on every replay, causes duplicate DB writes
const user = await db.getUser(ctx.from.id);

// ✅ Correct — wrapped in conversation.external, value is memoized
const user = await conversation.external(() => db.getUser(ctx.from.id));

// Convenience helpers:
const rnd = await conversation.random();  // safe random
const now = await conversation.now();     // safe Date.now()
```

### Filter Query Syntax

```ts
bot.on("message:text");           // text messages
bot.on(":photo");                 // any update with photo
bot.on(["message", "channel_post"]); // either type
bot.on("message").filter(ctx => ctx.from?.id === ADMIN_ID);
```

### Error Handling

Always install `bot.catch()` in production — grammY's default just stops the bot:

```ts
import { GrammyError, HttpError } from "grammy";

bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("API error:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Network error:", e);
  } else {
    console.error("Unknown:", e);
  }
});
```

---

## Official Resources

| Resource | URL |
|----------|-----|
| **Official Website** | https://grammy.dev |
| **GitHub Repository** | https://github.com/grammyjs/grammY |
| **API Reference** | https://grammy.dev/ref |
| **Plugins Directory** | https://grammy.dev/plugins |
| **Examples** | https://github.com/grammyjs/examples |
| **Community Chat** | https://t.me/grammyjs |

## Official Plugin Packages

| Plugin | npm Package |
|--------|-------------|
| Conversations | `@grammyjs/conversations` |
| Menu | `@grammyjs/menu` |
| Runner | `@grammyjs/runner` |
| Hydrate | `@grammyjs/hydrate` |
| Auto-Retry | `@grammyjs/auto-retry` |
| Transformer Throttler | `@grammyjs/transformer-throttler` |
| Rate Limiter | `@grammyjs/ratelimiter` |
| Files | `@grammyjs/files` |
| i18n | `@grammyjs/i18n` |
| Commands | `@grammyjs/commands` |
| Router | `@grammyjs/router` |
| Emoji | `@grammyjs/emoji` |
| Parse Mode | `@grammyjs/parse-mode` |
| Chat Members | `@grammyjs/chat-members` |
| Storage Adapters | `@grammyjs/storage-mongodb`, `@grammyjs/storage-redis`, `@grammyjs/storage-psql`, `@grammyjs/storage-supabase`, `@grammyjs/storage-file`, etc. |

---

## Do's and Don'ts

- **Read the reference file** before answering any API question — signatures matter
- **Check both guide AND api-ref** when using a plugin
- **Never invent method names** — grammY has a precise API surface
- **Prefer `ctx.reply()`** over `ctx.api.sendMessage()` for same-chat replies
- **Always use `bot.catch()`** for production error handling
- **Always wrap side effects** in `conversation.external()` inside conversations
- **Respect middleware order** — using `ctx.session` before `bot.use(session(...))` crashes at runtime
- When TypeScript complains about missing properties on `ctx`, the fix is almost always a missing **context flavor**
