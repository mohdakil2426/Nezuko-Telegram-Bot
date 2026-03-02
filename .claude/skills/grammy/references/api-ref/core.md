# Core API Reference

**Package:** `grammy`

The core grammY package exports the main classes and functions for building Telegram bots.

## `Bot`

Main class for creating a bot instance.

```ts
const bot = new Bot("YOUR_BOT_TOKEN");
```

### Methods

- `bot.start()` - Start the bot with long polling
- `bot.stop()` - Stop the bot
- `bot.use(...middleware)` - Register middleware
- `bot.command(name, handler)` - Handle commands
- `bot.on(filter, handler)` - Handle updates matching filter
- `bot.hears(text, handler)` - Handle messages matching text/regex
- `bot.catch(errorHandler)` - Set error handler
- `bot.api` - Raw API client

## `Context`

Context object passed to middleware. Contains:

- `ctx.update` - Raw update from Telegram
- `ctx.message` - Message object (if present)
- `ctx.callbackQuery` - Callback query (if present)
- `ctx.inlineQuery` - Inline query (if present)
- `ctx.chat` - Chat where update occurred
- `ctx.from` - User who triggered the update
- `ctx.match` - Regex match result

### Action Methods

- `ctx.reply(text, options)` - Reply to current chat
- `ctx.answerCallbackQuery()` - Answer callback query
- `ctx.editMessageText(text)` - Edit message text
- `ctx.deleteMessage()` - Delete message
- `ctx.forwardMessage(chatId)` - Forward message

## `Composer`

Compose middleware. Used to split bot into modules.

```ts
const composer = new Composer();
composer.command("start", handler);
bot.use(composer);
```

## `Api`

Raw Telegram Bot API client available via `bot.api` or `ctx.api`.

All official Telegram Bot API methods are available:
- `api.sendMessage(chatId, text, options)`
- `api.sendPhoto(chatId, photo, options)`
- `api.getMe()`
- `api.getUpdates(options)`
- And 100+ more methods

## `Keyboard` / `InlineKeyboard`

Builders for reply and inline keyboards.

```ts
const keyboard = new Keyboard()
  .text("Option A").row()
  .text("Option B");

const inlineKeyboard = new InlineKeyboard()
  .text("Click me", "callback-data");
```

## `session`

Built-in session middleware.

```ts
bot.use(session({ initial: () => ({ count: 0 }) }));
```

## `webhookCallback`

Create webhook handler for serverless platforms.

```ts
const handleUpdate = webhookCallback(bot, "std/http");
```

---

See `references/guide/basics.md` for usage examples.
