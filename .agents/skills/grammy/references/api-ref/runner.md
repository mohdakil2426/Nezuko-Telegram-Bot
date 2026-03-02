# Runner API Reference

**Package:** `@grammyjs/runner`

Run grammY bots with concurrent updates and graceful shutdown.

## `run()`

Main function to start a bot with the runner.

```ts
import { run } from "@grammyjs/runner";

run(bot);
```

### Options

```ts
run(bot, {
  runner: {
    fetch: {
      allowed_updates: ["message", "callback_query"],
    },
    timeoutSeconds: 30,
  },
  sink: {
    timeoutSeconds: 60,
  },
});
```

## `runner()`

Returns a runner instance with more control.

```ts
import { runner } from "@grammyjs/runner";

const { runner: r, handle, stop } = runner(bot);
```

### Runner Methods

- `r.task()` - Get the runner task
- `r.isRunning()` - Check if runner is active
- `stop()` - Stop the runner gracefully

## `sequentialize()`

Ensure updates from the same chat are processed sequentially.

```ts
import { sequentialize } from "@grammyjs/runner";

bot.use(sequentialize(getSessionKey));

function getSessionKey(ctx: Context) {
  return ctx.chat?.id.toString();
}
```

## Concurrency Control

The runner handles multiple updates concurrently:

```ts
const handle = runner(bot, {
  runner: {
    // Fetch 100 updates at once
    fetch: { limit: 100 },
  },
  sink: {
    // Max 500 updates in queue
    maxSize: 500,
  },
});
```

## Graceful Shutdown

```ts
const { runner: r, stop } = runner(bot);

// Handle shutdown
process.on("SIGINT", async () => {
  await stop();
  console.log("Bot stopped gracefully");
});
```

---

See `references/plugins/runner.md` and `references/advanced/scaling.md` for usage guides.
