# Router API Reference

**Package:** `@grammyjs/router`

Route updates to different handlers based on route strings.

## `Router`

Route updates using a route resolver function.

```ts
import { Router } from "@grammyjs/router";

const router = new Router((ctx) => {
  // Return route name based on context
  return ctx.session?.step ?? "idle";
});
```

### Route Handlers

```ts
// Handle specific route
router.route("idle", (ctx) => {
  ctx.reply("Send /start to begin");
});

// Another route
router.route("awaiting-name", async (ctx) => {
  ctx.session.name = ctx.message?.text;
  ctx.session.step = "awaiting-age";
  await ctx.reply("Now send your age:");
});
```

### Middleware Integration

```ts
// Use as middleware
bot.use(session({ initial: () => ({ step: "idle" }) }));
bot.use(router);

// Or manually route
bot.on("message", (ctx) => {
  const route = ctx.session.step;
  router.middleware()(ctx, () => Promise.resolve());
});
```

### Other Routes

Handle unmatched updates:

```ts
router.other((ctx) => {
  ctx.reply("Unknown state. Send /start to reset.");
});
```

## State Machine Example

```ts
interface SessionData {
  step: "idle" | "name" | "age" | "confirm";
  name?: string;
  age?: number;
}

const router = new Router<ConversationContext>((ctx) => ctx.session.step);

router.route("idle", (ctx) => {
  ctx.reply("Send /register to start");
});

router.route("name", (ctx) => {
  ctx.session.name = ctx.message?.text;
  ctx.session.step = "age";
  ctx.reply("What is your age?");
});

router.route("age", (ctx) => {
  ctx.session.age = parseInt(ctx.message?.text || "0");
  ctx.session.step = "confirm";
  ctx.reply(`Confirm: ${ctx.session.name}, ${ctx.session.age}?`);
});

router.route("confirm", (ctx) => {
  if (ctx.message?.text?.toLowerCase() === "yes") {
    ctx.reply("Registered!");
    ctx.session.step = "idle";
  } else {
    ctx.reply("Cancelled.");
    ctx.session.step = "idle";
  }
});

router.other((ctx) => {
  ctx.reply("Unknown state. Send /start");
});

bot.command("register", (ctx) => {
  ctx.session.step = "name";
  ctx.reply("What is your name?");
});

bot.use(router);
```

## Comparison with `bot.route`

Built-in `bot.route` is simpler:

```ts
bot.route("session-step", {
  name: (ctx) => { /* ... */ },
  age: (ctx) => { /* ... */ },
});
```

Router plugin is better for:
- Complex routing logic
- Reusable route handlers
- Integration with other middleware

---

See `references/plugins/router.md` for detailed usage guide.
