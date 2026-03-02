# Auto-Retry API Reference

**Package:** `@grammyjs/auto-retry`

Automatically retry failed API requests.

## `autoRetry()`

Create the auto-retry transformer.

```ts
import { autoRetry } from "@grammyjs/auto-retry";

bot.api.config.use(autoRetry());
```

### Options

```ts
autoRetry({
  // Max number of retries (default: 3)
  maxRetryAttempts: 3,

  // Initial retry delay in ms (default: 3000)
  retryDelay: 3000,

  // Maximum delay in ms (default: 3600000 = 1 hour)
  maxDelay: 3600000,

  // Backoff multiplier (default: 2)
  backoffMultiplier: 2,

  // Retry on network errors (default: true)
  retryOnNetworkErrors: true,

  // Do not retry these error codes
  doNotRetry: [400, 401, 403, 404],
});
```

## Retry Conditions

The plugin retries on:

1. **429 Too Many Requests** - Waits for `retry_after` seconds
2. **5xx Server Errors** - Uses exponential backoff
3. **Network Errors** - Connection failures, timeouts

## Example

```ts
bot.api.config.use(autoRetry({
  maxRetryAttempts: 5,
  retryDelay: 5000, // Start with 5 second delay
}));

// Will automatically retry if rate limited
await ctx.reply("Important message!");
```

## Webhook Considerations

For webhooks, keep retry delays short to avoid timeout:

```ts
autoRetry({
  maxRetryAttempts: 2,
  maxDelay: 5000, // Max 5 second delay
});
```

---

See `references/plugins/auto-retry.md` and `references/advanced/flood.md` for usage guides.
