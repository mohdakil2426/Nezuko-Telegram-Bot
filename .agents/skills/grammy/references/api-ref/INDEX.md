# grammY API Reference

This folder contains API reference documentation for grammY modules. These are brief reference docs complementing the detailed guides.

> For comprehensive usage examples, see the plugin guides in `references/plugins/`.

## Core API

| File | Module | Key Exports |
|------|--------|-------------|
| `core.md` | `grammy` | `Bot`, `Context`, `Composer`, `Api`, `Keyboard`, `InlineKeyboard`, `session`, `webhookCallback` |
| `types.md` | `grammy/types` | All Telegram Bot API types |

## Plugin APIs

| File | Package | Key Exports |
|------|---------|-------------|
| `conversations.md` | `@grammyjs/conversations` | `conversations`, `createConversation`, `Conversation`, `ConversationFlavor` |
| `menu.md` | `@grammyjs/menu` | `Menu`, `MenuRange` |
| `runner.md` | `@grammyjs/runner` | `run`, `runner`, `sequentialize` |
| `hydrate.md` | `@grammyjs/hydrate` | `hydrate`, `HydrateFlavor` |
| `auto-retry.md` | `@grammyjs/auto-retry` | `autoRetry` |
| `transformer-throttler.md` | `@grammyjs/transformer-throttler` | `throttler` |
| `ratelimiter.md` | `@grammyjs/ratelimiter` | `limit` |
| `files.md` | `@grammyjs/files` | `FileAdapter` |
| `i18n.md` | `@grammyjs/i18n` | `I18n` |
| `commands.md` | `@grammyjs/commands` | `CommandGroup` |
| `router.md` | `@grammyjs/router` | `Router` |
| `emoji.md` | `@grammyjs/emoji` | `emoji` |
| `parse-mode.md` | `@grammyjs/parse-mode` | `parseMode` |
| `chat-members.md` | `@grammyjs/chat-members` | `chatMembers` |
| `storages.md` | Various | MongoDB, Redis, PostgreSQL, Supabase adapters |

---

## Getting Started

Choose the guide in `references/plugins/` or `references/guide/` for detailed usage instructions.
