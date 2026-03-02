---
name: grammy
description: Expert grammY Telegram bot framework assistant. Use this skill whenever the user is building, debugging, or extending a Telegram bot with grammY (TypeScript/JavaScript). Covers the full grammY ecosystem core bot setup, middleware, context, filter queries, sessions, conversations, inline keyboards, menus, file handling, webhooks, long polling, error handling, all official plugins, and hosting/deployment. Trigger on any mention of grammY, Telegram bot development, @grammyjs packages, Bot API types, or questions about bot architecture patterns.
---

# grammY Skill

You are an expert in the **grammY** Telegram bot framework for TypeScript/JavaScript.

## Reference Files

All documentation is available in `references/`. Read the relevant files before answering — do not guess APIs.

### Documentation (from grammy.dev — English only)

| Category | Folder | Key topics |
|----------|--------|------------|
| **Guide** | `references/guide/` | Getting started, basics, context, commands, filter queries, middleware, files, errors, reactions, games, deployment types, API |
| **Advanced** | `references/advanced/` | Middleware deep-dive, structuring large bots, scaling, reliability, flood control, deployment, transformers, proxy, business accounts |
| **Plugins** | `references/plugins/` | All official plugins: sessions, conversations, menus, inline keyboards, parse-mode, hydrate, runner, auto-retry, throttler, ratelimiter, files, i18n, commands, router, emoji, chat members, media groups, entity parser, autoquote, fluent, stateless questions, console-time |
| **Hosting** | `references/hosting/` | Deno Deploy, Cloudflare Workers, Vercel, Firebase, Fly.io, Heroku, Supabase, Zeabur, VPS |
| **Resources** | `references/resources/` | FAQ, ecosystem comparison, about grammY |
| **Demo** | `references/demo/` | Example projects and code samples |

### API Reference (from grammy.dev/ref/ — dynamically generated, not in repo)

All API references are in `references/api-ref/`. Start with `references/api-ref/INDEX.md` for an overview.

| File | Module |
|------|--------|
| `core.md` | Core — `Bot`, `Context`, `Composer`, `Api`, `Keyboard`, `InlineKeyboard`, `session`, `webhookCallback`, etc. |
| `types.md` | All Telegram Bot API types (`grammy/types`) |
| `conversations.md` | Conversations plugin |
| `menu.md` | Menu plugin |
| `runner.md` | Runner plugin |
| `hydrate.md` | Hydrate plugin |
| `auto-retry.md` | Auto-retry plugin |
| `transformer-throttler.md` | Throttler plugin |
| `ratelimiter.md` | Ratelimiter plugin |
| `files.md` | Files plugin |
| `i18n.md` | i18n plugin |
| `commands.md` | Commands plugin |
| `router.md` | Router plugin |
| `emoji.md` | Emoji plugin |
| `parse-mode.md` | Parse-mode plugin |
| `chat-members.md` | Chat-members plugin |
| `storages.md` | All storage adapters (MongoDB, Redis, PostgreSQL, Supabase, etc.) |

---

## Key Guide Files to Read First

For most tasks, start by reading the relevant guide file:

- **New bot setup** → `references/guide/getting-started.md`, `references/guide/basics.md`
- **Context & middleware** → `references/guide/context.md`, `references/guide/middleware.md`
- **Commands** → `references/guide/commands.md`, `references/plugins/commands.md`
- **Filter queries** → `references/guide/filter-queries.md`
- **Sessions** → `references/plugins/session.md`
- **Conversations** → `references/plugins/conversations.md`, `references/api-ref/conversations.md`
- **Inline keyboards / menus** → `references/plugins/keyboard.md`, `references/plugins/menu.md`
- **Files** → `references/guide/files.md`, `references/plugins/files.md`
- **Error handling** → `references/guide/errors.md`
- **Webhooks / long polling** → `references/guide/deployment-types.md`, `references/hosting/`
- **Scaling / concurrency** → `references/advanced/scaling.md`, `references/advanced/reliability.md`, `references/api-ref/runner.md`
- **Formatting messages** → `references/plugins/parse-mode.md`

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

## Official Plugins (GitHub)

| Plugin | Repository | npm Package |
|--------|------------|-------------|
| **Conversations** | https://github.com/grammyjs/conversations | `@grammyjs/conversations` |
| **Menu** | https://github.com/grammyjs/menu | `@grammyjs/menu` |
| **Runner** | https://github.com/grammyjs/runner | `@grammyjs/runner` |
| **Hydrate** | https://github.com/grammyjs/hydrate | `@grammyjs/hydrate` |
| **Auto-Retry** | https://github.com/grammyjs/auto-retry | `@grammyjs/auto-retry` |
| **Transformer Throttler** | https://github.com/grammyjs/transformer-throttler | `@grammyjs/transformer-throttler` |
| **Rate Limiter** | https://github.com/grammyjs/ratelimiter | `@grammyjs/ratelimiter` |
| **Files** | https://github.com/grammyjs/files | `@grammyjs/files` |
| **i18n** | https://github.com/grammyjs/i18n | `@grammyjs/i18n` |
| **Commands** | https://github.com/grammyjs/commands | `@grammyjs/commands` |
| **Router** | https://github.com/grammyjs/router | `@grammyjs/router` |
| **Emoji** | https://github.com/grammyjs/emoji | `@grammyjs/emoji` |
| **Parse Mode** | https://github.com/grammyjs/parse-mode | `@grammyjs/parse-mode` |
| **Chat Members** | https://github.com/grammyjs/chat-members | `@grammyjs/chat-members` |
| **Storage Adapters** | https://github.com/grammyjs/storages | Various storage packages |
| **Fluent** | https://github.com/grammyjs/fluent | `@grammyjs/fluent` |

## Storage Adapters

| Adapter | Repository | Package |
|---------|------------|---------|
| **MongoDB** | https://github.com/grammyjs/storages/tree/main/packages/mongodb | `@grammyjs/storage-mongodb` |
| **Redis** | https://github.com/grammyjs/storages/tree/main/packages/redis | `@grammyjs/storage-redis` |
| **PostgreSQL** | https://github.com/grammyjs/storages/tree/main/packages/psql | `@grammyjs/storage-psql` |
| **Supabase** | https://github.com/grammyjs/storages/tree/main/packages/supabase | `@grammyjs/storage-supabase` |
| **Firebase** | https://github.com/grammyjs/storages/tree/main/packages/firebase | `@grammyjs/storage-firebase` |
| **DynamoDB** | https://github.com/grammyjs/storages/tree/main/packages/dynamodb | `@grammyjs/storage-dynamodb` |
| **Cloudflare** | https://github.com/grammyjs/storages/tree/main/packages/cloudflare | `@grammyjs/storage-cloudflare` |
| **File** | https://github.com/grammyjs/storages/tree/main/packages/file | `@grammyjs/storage-file` |
| **Free Storage** | https://github.com/grammyjs/storage-free | `@grammyjs/storage-free` |

---

## Important grammY Conventions

- `bot.command("start", ctx => ...)` — handle commands
- `bot.on("message:text", ctx => ...)` — filter queries use colon syntax
- `ctx.reply(...)` — always replies to current chat
- `ctx.api.sendMessage(chatId, ...)` — explicit chat targeting
- `session()` middleware must be registered before handlers that use `ctx.session`
- `conversations()` middleware must be registered before `createConversation()`
- For webhooks: use `webhookCallback(bot, "framework-name")`
- For long polling: `bot.start()`

---

## Do's and Don'ts

- Always check the actual reference file for method signatures before answering API questions
- When using plugins, check both the guide doc AND the api-ref doc
- Do not invent method names — grammY has a specific API surface
- Prefer `ctx.reply()` over `ctx.api.sendMessage()` for simplicity
- Always use `bot.catch()` for production error handling
