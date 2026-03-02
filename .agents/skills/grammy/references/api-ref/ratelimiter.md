# Ratelimiter API Reference

**Package:** `@grammyjs/ratelimiter`

Restrict users who spam your bot.

## `limit()`

Apply rate limiting to users.

```ts
import { limit } from "@grammyjs/ratelimiter";

bot.use(limit());
```

### Options

```ts
limit({
  // Time window in seconds (default: 2)
  timeFrame: 2,

  // Max requests per time frame (default: 1)
  limit: 1,

  // Storage key function (default: chat_id)
  keyGenerator: (ctx) => ctx.from?.id.toString() ?? "unknown",

  // Handler when limit exceeded
  onLimitExceeded: async (ctx) => {
    await ctx.reply("You're sending too many messages!");
  },

  // Storage (default: in-memory)
  storage: new MemorySessionStorage(),
});
```

## Redis Storage

Use Redis for multi-instance bots:

```ts
import { RedisAdapter } from "@grammyjs/storage-redis";
import { IORedis } from "ioredis";

const redis = new IORedis();

bot.use(limit({
  timeFrame: 5,
  limit: 3,
  storage: new RedisAdapter({ instance: redis, ttl: 5 }),
}));
```

## User-Specific Limits

```ts
const VIP_USERS = [123456];

bot.use(limit({
  keyGenerator: (ctx) => ctx.from?.id.toString() ?? "unknown",
  onLimitExceeded: async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId && VIP_USERS.includes(userId)) {
      // VIP users bypass limit
      return next();
    }
    await ctx.reply("Please slow down.");
  },
}));
```

## Sliding Window Algorithm

The ratelimiter uses a sliding window to track requests:

```
Time:  0s    1s    2s    3s    4s    5s
User:  [1]   [2]   [3]   X     [4]   [5]
              ^-- 3rd request in 2s window, blocked
```

---

See `references/plugins/ratelimiter.md` for detailed usage guide.
