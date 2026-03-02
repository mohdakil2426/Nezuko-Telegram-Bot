# Transformer Throttler API Reference

**Package:** `@grammyjs/transformer-throttler`

Slow down outgoing API requests to avoid rate limits.

## `throttler()`

Create throttler transformer with rate limiting.

```ts
import { throttler } from "@grammyjs/transformer-throttler";

bot.api.config.use(throttler);
```

### Options

```ts
import { Bottleneck } from "bottleneck";

const throttler = new Bottleneck({
  // Maximum concurrent requests
  maxConcurrent: 1,

  // Minimum time between requests (ms)
  minTime: 1000, // 1 request per second
});

bot.api.config.use(throttler);
```

## Rate Limits

Telegram Bot API rate limits:

- **General**: ~30 messages/second per chat
- **Same chat**: 1 message/second
- **Same group**: 20 messages/minute
- **Albums**: 1 album/second

## Configuration Examples

### Conservative (prevents most rate limits)

```ts
const throttler = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000,
});
```

### Aggressive (allows bursts)

```ts
const throttler = new Bottleneck({
  maxConcurrent: 10,
  minTime: 100,
  reservoir: 30,
  reservoirRefreshAmount: 30,
  reservoirRefreshInterval: 1000,
});
```

## Per-User Throttling

```ts
const throttlers = new Map();

bot.api.config.use(async (prev, method, payload, signal) => {
  const chatId = payload.chat_id;
  if (!throttlers.has(chatId)) {
    throttlers.set(chatId, new Bottleneck({ minTime: 1000 }));
  }
  return throttlers.get(chatId).schedule(() => prev(method, payload, signal));
});
```

---

See `references/plugins/transformer-throttler.md` and `references/advanced/flood.md` for usage guides.
