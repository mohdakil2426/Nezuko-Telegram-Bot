# Hydrate API Reference

**Package:** `@grammyjs/hydrate`

Call API methods directly on API response objects.

## `hydrate()`

Install the hydrate plugin.

```ts
import { hydrate } from "@grammyjs/hydrate";
bot.use(hydrate());
```

## `HydrateFlavor<C>`

Context flavor type.

```ts
type MyContext = Context & HydrateFlavor;
```

## Hydrated API Objects

When hydrate is installed, API response objects get methods added:

### Message

```ts
const message = await ctx.reply("Hello!");

// Instead of:
await ctx.api.editMessageText(ctx.chat.id, message.message_id, "Edited");

// You can do:
await message.editText("Edited");
```

### Available Methods on Messages

- `message.editText(text, options?)`
- `message.editCaption(caption, options?)`
- `message.editReplyMarkup(markup?)`
- `message.editLiveLocation(lat, long, options?)`
- `message.stopLiveLocation(options?)`
- `message.delete()`
- `message.forwardTo(chatId, options?)`
- `message.copyTo(chatId, options?)`
- `message.pin(options?)`
- `message.unpin()`

### Callback Query

```ts
await ctx.callbackQuery.message?.editText("Updated!");
```

### Chat

```ts
// Get chat info with methods attached
const chat = await ctx.getChat();
await chat.leave(); // Leave the chat
```

### User

```ts
// Get user info with methods attached
const user = await ctx.getAuthor();
```

## API Response Hydration

Direct API calls also return hydrated objects:

```ts
const message = await bot.api.sendMessage(chatId, "Hello");
await message.pin(); // Pin the sent message
```

---

See `references/plugins/hydrate.md` for detailed usage guide.
