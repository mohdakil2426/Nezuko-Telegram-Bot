# grammY Bot Coding Standards

This document defines the style, conventions, and best practices for developing Telegram bots using the grammY framework. All contributions should follow these rules unless otherwise noted.

---

## 1. General Code Style

- **Favor clarity over brevity** - Write readable, self-documenting code
- **Keep functions and handlers small and focused** - One responsibility per function
- **Avoid repeating logic** - Use shared helpers, utilities, and middleware
- **Remove unused variables, imports, code paths, and files**
- **Use TypeScript strict mode** - Enable all strict compiler options
- **Always `await` promises** - Use ESLint `no-floating-promises` rule to enforce

---

## 2. Naming Conventions

Use descriptive names. Avoid abbreviations unless well-known.

| Item                     | Convention              | Example                                                  |
| ------------------------ | ----------------------- | -------------------------------------------------------- |
| Bot instance             | `bot` (lowercase)       | `const bot = new Bot(token);`                            |
| Context object           | `ctx` (always)          | `bot.on("message", (ctx) => ...)`                        |
| Variables                | `camelCase`             | `chatId`, `messageId`, `fileId`                          |
| Functions/Methods        | `camelCase`             | `handleMessage`, `sendNotification`                      |
| Classes/Types/Interfaces | `PascalCase`            | `MyContext`, `SessionData`, `UserConfig`                 |
| Constants                | `UPPER_SNAKE_CASE`      | `BOT_DEVELOPER`, `MAX_RETRIES`                           |
| Type aliases             | `PascalCase`            | `type MyContext = Context & SessionFlavor<SessionData>;` |
| Plugin packages          | `@grammyjs/kebab-case`  | `@grammyjs/conversations`                                |
| Plugin flavors           | `PascalCase` + `Flavor` | `SessionFlavor`, `ConversationFlavor`                    |
| File names               | `kebab-case.ts`         | `user-handler.ts`, `rate-limiter.ts`                     |

### Session Data Naming

```typescript
// Use descriptive property names
interface SessionData {
  step: "idle" | "name" | "age" | "confirm"; // Union types for state machines
  pizzaCount: number;
  userName?: string; // Optional for data that may not exist yet
}
```

---

## 3. Formatting Rules

- **Indentation**: 2 spaces (consistent across the project)
- **Line length**: Max 100 characters
- **Encoding**: UTF-8, no BOM
- **End files with a newline**
- **Semicolons**: Required
- **Quotes**: Prefer double quotes for strings, single quotes for single characters

### Braces and Spacing

```typescript
// Opening brace on same line (K&R style)
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}

// Space after keywords
if (ctx.message) {
  // ...
}

// One blank line between top-level functions
async function handleStart(ctx: MyContext) {
  // ...
}

async function handleHelp(ctx: MyContext) {
  // ...
}
```

---

## 4. Import Patterns

### Node.js (TypeScript)

```typescript
// Named imports from grammY core
import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy";

// Type-only imports
import type { Message, User } from "grammy/types";

// Plugin imports
import {
  conversations,
  createConversation,
  Conversation,
  ConversationFlavor,
} from "@grammyjs/conversations";
import { Menu } from "@grammyjs/menu";
import { run, sequentialize } from "@grammyjs/runner";
```

### Deno

```typescript
import { Bot } from "https://deno.land/x/grammy/mod.ts";
import type { Message } from "https://deno.land/x/grammy/types.ts";
```

### Import Organization

```typescript
// 1. Node.js built-in modules
import { readFile } from "fs/promises";

// 2. External packages (grammY first, then others)
import { Bot, Context } from "grammy";
import { conversations } from "@grammyjs/conversations";

// 3. Internal modules (use relative or aliased paths)
import { handleStart } from "./handlers/start";
import { SessionData } from "@/types/session";
```

---

## 5. Bot Initialization Patterns

### Basic Bot Creation

```typescript
const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);
```

### Bot with Custom Context Type

```typescript
import { Bot, Context, SessionFlavor } from "grammy";

interface SessionData {
  count: number;
  step: "idle" | "active";
}

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);
```

### Bot with Multiple Flavors (Additive)

```typescript
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { HydrateFlavor } from "@grammyjs/hydrate";

// Additive flavors: combine with &
type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

// Transformative flavors: nest them
type MyContext = HydrateFlavor<Context>;

// Combined: transformative wrapping additive
type MyContext = HydrateFlavor<Context & SessionFlavor<SessionData> & ConversationFlavor>;

const bot = new Bot<MyContext>(token);
```

### Bot with Custom API Root (Local Bot API Server)

```typescript
const bot = new Bot(token, {
  client: {
    apiRoot: "http://localhost:8081",
  },
});
```

---

## 6. Handler Registration Patterns

### Command Handlers

```typescript
// Single command
bot.command("start", async (ctx) => {
  await ctx.reply("Welcome!");
});

// Multiple commands with same handler
bot.command(["help", "h"], async (ctx) => {
  await ctx.reply("Help text...");
});

// Command with arguments
bot.command("add", async (ctx) => {
  const item = ctx.match; // "apple pie" for "/add apple pie"
  await ctx.reply(`Adding: ${item}`);
});

// Deep linking
bot.command("start", async (ctx) => {
  const payload = ctx.match; // "referral123" from ?start=referral123
  if (payload) {
    await ctx.reply(`Welcome! Referred by: ${payload}`);
  }
});
```

### Message Handlers (Filter Query Syntax)

```typescript
// Text messages
bot.on("message:text", async (ctx) => {
  await ctx.reply(ctx.message.text);
});

// Photos
bot.on("message:photo", async (ctx) => {
  await ctx.reply("Nice photo!");
});

// Any message with text (shorthand)
bot.on(":text", async (ctx) => {
  /* ... */
});

// Documents
bot.on(":document", async (ctx) => {
  /* ... */
});

// Combined filters (OR)
bot.on(["message", "edited_message"], async (ctx) => {
  /* ... */
});

// Combined filters (AND) - chain .on() calls
bot.on("::url").on(":forward_origin", async (ctx) => {
  /* ... */
});

// Entity-based filters
bot.on("message:entities:url", async (ctx) => {
  /* ... */
});
bot.on("::email", async (ctx) => {
  /* ... */
});
bot.on(["::hashtag", "::mention"], async (ctx) => {
  /* ... */
});
```

### Callback Query Handlers

```typescript
// Specific callback data
bot.callbackQuery("button-a", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You chose A!");
});

// Regex pattern
bot.callbackQuery(/item-(\d+)/, async (ctx) => {
  const id = ctx.match[1];
  await ctx.answerCallbackQuery({ text: `Selected item ${id}` });
});

// Catch-all for unknown callbacks
bot.on("callback_query:data", async (ctx) => {
  console.log("Unknown callback:", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery(); // Remove loading animation
});
```

### Reaction Handlers

```typescript
// Single emoji
bot.reaction("🎉", (ctx) => ctx.reply("Whoop whoop!"));

// Multiple emojis
bot.reaction(["👍", "👎"], (ctx) => ctx.reply("Nice thumb!"));

// Paid reaction
bot.reaction({ type: "paid" }, (ctx) => ctx.reply("Thanks!"));
```

### Inline Query Handlers

```typescript
import { InlineQueryResultBuilder } from "grammy";

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim() || "default";
  const result = InlineQueryResultBuilder.article(`result-${Date.now()}`, `Search: ${query}`).text(
    `You searched for: ${query}`
  );
  await ctx.answerInlineQuery([result], { cache_time: 10 });
});
```

---

## 7. Context Usage Patterns

### Preferred Shortcuts

```typescript
// ❌ Avoid verbose access
const chatId = ctx.chat?.id;
const text = ctx.message?.text;

// ✅ Use shortcuts
const chatId = ctx.chatId;
const text = ctx.msg.text; // Works for message, edited_message, channel_post, etc.
const msgId = ctx.msgId;
```

### Entity Extraction

```typescript
// All entities
const entities = ctx.entities();

// Specific entity types
const emails = ctx.entities("email");
const urls = ctx.entities(["url", "text_link"]);
```

### Type Narrowing with has Checks

```typescript
// Type-safe callback query checking
if (ctx.hasCallbackQuery(/item-\d+/)) {
  const data: string = ctx.callbackQuery.data;
  // TypeScript knows callbackQuery exists
}

// Type-safe command checking
if (ctx.hasCommand("start")) {
  // Handle start command
}
```

### Session Access

```typescript
// Read session
const count = ctx.session.count;

// Write session
ctx.session.count++;

// Lazy session (requires await)
const session = await ctx.session;
```

---

## 8. Sending Messages Patterns

### Use ctx.reply() in Handlers (Preferred)

```typescript
// ✅ Preferred - same-chat reply
await ctx.reply("Hello!");

// ❌ Avoid in handlers
await bot.api.sendMessage(ctx.chatId, "Hello!");
```

### Message Formatting

```typescript
// HTML
await ctx.reply("<b>Bold</b> and <i>italic</i>", { parse_mode: "HTML" });

// MarkdownV2
await ctx.reply("*Bold* and _italic_", { parse_mode: "MarkdownV2" });

// Using parse-mode plugin
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
await ctx.replyWithHTML("<b>Bold</b>");
await ctx.replyWithMarkdown("*Bold*");
```

### Reply to Specific Message

```typescript
await ctx.reply("Replying to you", {
  reply_parameters: { message_id: ctx.msg.message_id },
});
```

### Edit and Delete Messages

```typescript
// Edit message text
await ctx.editMessageText("Updated text");

// Delete message
await ctx.deleteMessage();

// With hydrated objects (using @grammyjs/hydrate)
const message = await ctx.reply("Processing...");
await message.editText("Done!");
await message.delete();
```

---

## 9. Middleware Patterns

### Middleware Function Signature

```typescript
import { Context, NextFunction } from "grammy";

async function responseTime(ctx: Context, next: NextFunction): Promise<void> {
  const before = Date.now();
  await next(); // CRITICAL: Always await next()
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}
```

### Registering Middleware

```typescript
bot.use(responseTime);
bot.use(session({ initial: () => ({ count: 0 }) }));
```

### Middleware Order Matters

**Register middleware in this exact order:**

```typescript
// 1. Sequentialize (if needed for concurrent processing)
bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));

// 2. Session (BEFORE any handler that reads ctx.session)
bot.use(session({ initial: () => ({ count: 0 }) }));

// 3. Conversations (BEFORE createConversation)
bot.use(conversations());
bot.use(createConversation(myConversation));

// 4. Menus (BEFORE handlers that use the menu)
bot.use(mainMenu);

// 5. Handlers (most specific first)
bot.command("start", handleStart);
bot.on("message:text", handleText);
```

### Custom Middleware Factory

```typescript
function onlyAdmin(onFail: Middleware<MyContext>): Middleware<MyContext> {
  return async (ctx, next) => {
    const member = await ctx.getChatMember(ctx.from?.id!);
    if (member.status === "administrator" || member.status === "creator") {
      return next();
    }
    return onFail(ctx, next);
  };
}

// Usage
bot.use(onlyAdmin((ctx) => ctx.reply("Admins only!")));
```

---

## 10. Session Patterns

### Basic Session Setup

```typescript
interface SessionData {
  count: number;
  step: "idle" | "active";
}

function initial(): SessionData {
  return { count: 0, step: "idle" };
}

bot.use(session({ initial }));
```

### Session with Custom Key

```typescript
// Per chat (default)
bot.use(
  session({
    initial: () => ({ count: 0 }),
    getSessionKey: (ctx) => ctx.chat?.id.toString(),
  })
);

// Per user
bot.use(
  session({
    initial: () => ({ count: 0 }),
    getSessionKey: (ctx) => ctx.from?.id.toString(),
  })
);

// Per user-chat combination
bot.use(
  session({
    initial: () => ({ count: 0 }),
    getSessionKey: (ctx) => (ctx.from && ctx.chat ? `${ctx.from.id}/${ctx.chat.id}` : undefined),
  })
);
```

### Multi-Session Pattern

```typescript
bot.use(
  session({
    type: "multi",
    user: {
      storage: new MemorySessionStorage(),
      initial: () => ({ preferences: {} }),
      getSessionKey: (ctx) => ctx.from?.id.toString(),
    },
    chat: {
      storage: new MemorySessionStorage(),
      initial: () => ({ settings: {} }),
      getSessionKey: (ctx) => ctx.chat?.id.toString(),
    },
  })
);

// Access: ctx.session.user, ctx.session.chat
```

### Storage Adapters

```typescript
// Memory (development)
import { MemorySessionStorage } from "grammy";
storage: new MemorySessionStorage<SessionData>();

// Free cloud storage (hobby projects)
import { freeStorage } from "@grammyjs/storage-free";
storage: freeStorage<SessionData>(bot.token);

// Redis
import { RedisAdapter } from "@grammyjs/storage-redis";
storage: new RedisAdapter<SessionData>({ url: "redis://localhost:6379" });

// MongoDB
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
storage: new MongoDBAdapter<SessionData>({ url: "mongodb://localhost:27017" });

// PostgreSQL
import { PsqlAdapter } from "@grammyjs/storage-psql";
storage: new PsqlAdapter<SessionData>({ connectionString: "postgresql://..." });

// File system
import { FileAdapter } from "@grammyjs/storage-file";
storage: new FileAdapter({ dirName: "sessions" });
```

### Session Safety with Sequentialize

**CRITICAL**: Use `sequentialize()` before `session()` to prevent write-after-read hazards:

```typescript
bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));
bot.use(session({ initial }));
```

---

## 11. Keyboard and Menu Patterns

### Inline Keyboard (Builder Pattern)

```typescript
import { InlineKeyboard } from "grammy";

const keyboard = new InlineKeyboard()
  .text("Button A", "callback-a")
  .text("Button B", "callback-b")
  .row()
  .url("Visit Website", "https://example.com");

await ctx.reply("Choose an option:", { reply_markup: keyboard });
```

### Inline Keyboard (Functional Pattern)

```typescript
const keyboard = InlineKeyboard.from([
  [InlineKeyboard.text("A", "a"), InlineKeyboard.text("B", "b")],
  [InlineKeyboard.text("C", "c")],
]);
```

### Reply Keyboard

```typescript
import { Keyboard } from "grammy";

const keyboard = new Keyboard()
  .text("Yes")
  .row()
  .text("No")
  .resized() // Resize to button content
  .oneTime() // Hide after first use
  .persistent() // Always show when system keyboard hidden
  .placeholder("Choose an option");

await ctx.reply("Decide:", { reply_markup: keyboard });
```

### Dynamic Menu

```typescript
import { Menu } from "@grammyjs/menu";

const menu = new Menu("main-menu")
  .text("Ping", (ctx) => ctx.reply("Pong!"))
  .row()
  .text("About", (ctx) => ctx.reply("I am a grammY bot."));

bot.use(menu); // Register BEFORE handlers

bot.command("menu", async (ctx) => {
  await ctx.reply("Main menu:", { reply_markup: menu });
});
```

### Menu with Dynamic Labels

```typescript
const toggleMenu = new Menu("toggle").text(
  (ctx) => (ctx.session.enabled ? "✅ Enabled" : "❌ Disabled"),
  async (ctx) => {
    ctx.session.enabled = !ctx.session.enabled;
    await ctx.menu.update();
  }
);

bot.use(toggleMenu);
```

### Menu Navigation

```typescript
const mainMenu = new Menu("main")
  .text("Home", (ctx) => ctx.reply("Home!"))
  .row()
  .submenu("Settings", "settings");

const settingsMenu = new Menu("settings")
  .text("Toggle", (ctx) => ctx.reply("Toggled!"))
  .row()
  .back("Go Back");

mainMenu.register(settingsMenu); // Link submenus

bot.use(mainMenu); // Only register root menu
```

---

## 12. Conversation Patterns (Multi-Step Flows)

### Basic Conversation

```typescript
import {
  Conversation,
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

async function greeting(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("What's your name?");
  const {
    message: { text: name },
  } = await conversation.waitFor("message:text");

  await ctx.reply(`Hello, ${name}! How old are you?`);
  const {
    message: { text: age },
  } = await conversation.waitFor("message:text");

  await ctx.reply(`Registered: ${name}, age ${age}`);
}

bot.use(conversations());
bot.use(createConversation(greeting));

bot.command("register", (ctx) => ctx.conversation.enter("greeting"));
```

### Conversation Golden Rules

**CRITICAL**: Inside a conversation, the function re-runs from the start on every new update (replay engine). Any code with side effects must be wrapped:

```typescript
// ❌ Wrong - runs on every replay, causes duplicate DB writes
const user = await db.getUser(ctx.from.id);

// ✅ Correct - wrapped in conversation.external, value is memoized
const user = await conversation.external(() => db.getUser(ctx.from.id));

// Convenience helpers
const random = await conversation.random(); // Safe random
const now = await conversation.now(); // Safe Date.now()
```

### Waiting for Updates

```typescript
// Wait for specific update
const { message } = await conversation.waitFor("message:text");

// Wait with timeout
const result = await conversation.waitFor("message:text", {
  maxMilliseconds: 60000,
});

// Wait for callback query
const ctx = await conversation.waitForCallbackQuery("button-data");
```

---

## 13. Error Handling Patterns

### Global Error Handler (Long Polling)

```typescript
import { GrammyError, HttpError } from "grammy";

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);

  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Bot API error:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Network error:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
```

### Error Boundaries for Modules

```typescript
function errorHandler(err: BotError, next: NextFunction) {
  console.error("Error in module:", err);
  // Optionally call next() to continue middleware chain
}

bot.errorBoundary(errorHandler).use(composer);
```

### Custom Error Class

```typescript
class BotDomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: number
  ) {
    super(message);
    this.name = "BotDomainError";
    Error.captureStackTrace(this, this.constructor);
  }
}
```

---

## 14. File Handling Patterns

### Receiving Files

```typescript
bot.on("message:document", async (ctx) => {
  const document = ctx.msg.document;
  const fileId = document.file_id;

  const file = await ctx.getFile();
  const path = file.file_path; // Valid for at least 1 hour

  const url = `https://api.telegram.org/file/bot${token}/${path}`;
});
```

### Sending Files

```typescript
import { InputFile } from "grammy";

// From path
await ctx.replyWithPhoto(new InputFile("/path/to/photo.jpg"));

// From URL
await ctx.replyWithPhoto(new InputFile("https://example.com/image.png"));

// From buffer
const buffer = Buffer.from([65, 66, 67]);
await ctx.replyWithDocument(new InputFile(buffer, "file.txt"));

// From stream
import { createReadStream } from "fs";
await ctx.replyWithVideo(new InputFile(createReadStream("/path/to/video.mp4")));
```

### With @grammyjs/files Plugin

```typescript
import { hydrateFiles, FileFlavor } from "@grammyjs/files";

type MyContext = FileFlavor<Context>;
bot.api.config.use(hydrateFiles(bot.token));

bot.on(":video", async (ctx) => {
  const file = await ctx.getFile();
  const path = await file.download(); // Downloads to temp file
  const url = file.getUrl(); // Gets download URL
});
```

---

## 15. Internationalization (i18n) Patterns

### Basic i18n Setup

```typescript
import { I18n, I18nFlavor } from "@grammyjs/i18n";

type MyContext = Context & I18nFlavor;

const i18n = new I18n<MyContext>({
  defaultLocale: "en",
  directory: "locales",
});

bot.use(i18n);

// locales/en/bot.ftl
// welcome = Welcome to the bot!
// hello = Hello, { $name }!

bot.command("start", async (ctx) => {
  await ctx.reply(ctx.t("welcome"));
  await ctx.reply(ctx.t("hello", { name: ctx.from.first_name }));
});
```

### i18n with Sessions

```typescript
interface SessionData {
  __language_code?: string; // Reserved for i18n
}

const i18n = new I18n<MyContext>({
  defaultLocale: "en",
  useSession: true,
  directory: "locales",
});

// Change language
await ctx.i18n.setLocale("de");
```

---

## 16. Rate Limiting Patterns

### Per-User Rate Limiting

```typescript
import { limit } from "@grammyjs/ratelimiter";

bot.use(
  limit({
    timeFrame: 2000, // 2 seconds
    limit: 3, // 3 requests per time frame
    keyGenerator: (ctx) => ctx.from?.id.toString(),
    onLimitExceeded: async (ctx) => {
      await ctx.reply("Slow down! Too many requests.");
    },
  })
);
```

### Auto-Retry for Flood Control

```typescript
import { autoRetry } from "@grammyjs/auto-retry";

bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 5,
  })
);
```

### Outgoing Rate Throttling

```typescript
import { apiThrottler } from "@grammyjs/transformer-throttler";

bot.api.config.use(
  apiThrottler({
    global: {
      reservoir: 30,
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 1000,
    },
  })
);
```

---

## 17. Deployment Patterns

### Long Polling

```typescript
// Basic
bot.start();

// With graceful shutdown
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
await bot.start();

// With runner (concurrent processing)
import { run, sequentialize } from "@grammyjs/runner";

bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));
run(bot);
```

### Webhooks

```typescript
import { webhookCallback } from "grammy";
import express from "express";

const app = express();
app.use(express.json());

// Use bot token as secret path
app.use(`/${bot.token}`, webhookCallback(bot, "express"));

app.listen(3000);

// Register webhook
await bot.api.setWebhook(`https://your-domain.com/${bot.token}`);
```

### Platform-Specific Webhook Adapters

```typescript
// Express
webhookCallback(bot, "express");

// Fastify
webhookCallback(bot, "fastify");

// Standard HTTP (Deno, Vercel Edge)
webhookCallback(bot, "std/http");

// Cloudflare Workers
webhookCallback(bot, "cloudflare-mod");

// HTTPS
webhookCallback(bot, "https");
```

### Environment Configuration

```typescript
// Always check for required env vars
const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

// Optimize by caching bot info
const bot = new Bot(token, {
  botInfo: {
    id: 123456789,
    is_bot: true,
    first_name: "MyBot",
    username: "my_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  },
});
```

---

## 18. Project Structure

### Recommended Structure for Small Bots

```
src/
├── bot.ts           # Main entry point
├── handlers/
│   ├── start.ts     # /start command handler
│   └── messages.ts  # Message handlers
├── middleware/
│   └── logging.ts   # Custom middleware
├── types/
│   └── session.ts   # Type definitions
└── utils/
    └── helpers.ts   # Utility functions
```

### Recommended Structure for Large Bots

```
src/
├── bot.ts                    # Main entry, bot initialization
├── features/                 # Feature modules
│   ├── registration/
│   │   ├── index.ts          # Export Composer for this feature
│   │   ├── handlers.ts       # Feature handlers
│   │   └── types.ts          # Feature-specific types
│   └── admin/
│       ├── index.ts
│       ├── handlers.ts
│       └── middleware.ts
├── middleware/               # Shared middleware
│   ├── auth.ts
│   └── logging.ts
├── services/                 # External services
│   └── database.ts
├── types/                    # Shared types
│   ├── context.ts
│   └── session.ts
└── utils/                    # Shared utilities
    └── formatting.ts
```

### Module Extraction Pattern

```typescript
// features/registration/index.ts
import { Composer } from "grammy";
import type { MyContext } from "@/types/context";

export const registration = new Composer<MyContext>();

registration.command("register", async (ctx) => {
  // Handler logic
});

// bot.ts
import { registration } from "./features/registration";

const bot = new Bot<MyContext>(token);
bot.use(registration);
```

---

## 19. TypeScript Best Practices

### Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "moduleResolution": "node16"
  }
}
```

### Context Flavor Types

```typescript
// Additive flavors (use &)
type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

// Transformative flavors (use nesting)
type MyContext = HydrateFlavor<Context>;

// Combined
type MyContext = HydrateFlavor<Context & SessionFlavor<SessionData>>;
```

### Optional Chaining and Nullish Coalescing

```typescript
// Consistent use of optional chaining
const userId = ctx.from?.id;
const chatId = ctx.chat?.id.toString();

// Use nullish coalescing for defaults
const key = ctx.from?.id.toString() ?? "unknown";
```

### Type Guards and Assertions

```typescript
// Type guard function
function isPrivateChat(ctx: Context): ctx is Context & { chat: { type: "private" } } {
  return ctx.chat?.type === "private";
}

// Usage
if (isPrivateChat(ctx)) {
  await ctx.reply("Private message!");
}
```

---

## 20. Testing Patterns

### Mock API Requests

```typescript
// Test with bot.handleUpdate
await bot.handleUpdate({
  update_id: 1,
  message: {
    message_id: 1,
    from: { id: 1, is_bot: false, first_name: "Test" },
    chat: { id: 1, type: "private", first_name: "Test" },
    date: Date.now(),
    text: "/start",
  },
});
```

### Type Testing

```typescript
import { expectTypeOf } from "vitest";

test("MyContext has session property", () => {
  expectTypeOf<MyContext>().toHaveProperty("session");
  expectTypeOf<MyContext["session"]>().toEqualTypeOf<SessionData>();
});
```

---

## 21. Code Review Checklist

When reviewing grammY bot code, verify:

### Middleware

- [ ] Middleware registered in correct order
- [ ] `sequentialize()` used before `session()` for concurrent processing
- [ ] All middleware functions `await next()`
- [ ] Session accessed only after session middleware is registered

### Handlers

- [ ] Command handlers registered before catch-all message handlers
- [ ] Filter queries use correct syntax (`:text`, `message:photo`)
- [ ] Callback queries always call `answerCallbackQuery()`
- [ ] Handler functions are `async` when using `await`

### TypeScript

- [ ] Custom context type defined when using plugins
- [ ] Context flavors properly composed (additive vs transformative)
- [ ] No `any` types - use `unknown` with type guards
- [ ] Session interface defined with correct types

### Error Handling

- [ ] `bot.catch()` installed for long polling
- [ ] GrammyError and HttpError differentiated in error handler
- [ ] Conversation side effects wrapped in `conversation.external()`

### Security

- [ ] Bot token read from environment variable
- [ ] Webhook uses secret path (not just `/webhook`)
- [ ] Admin-only commands have proper authorization checks
- [ ] User input validated before use

---

## 22. Common Anti-Patterns to Avoid

### ❌ Wrong Middleware Order

```typescript
// WRONG - session accessed before middleware
bot.on("message", (ctx) => ctx.session.count++);
bot.use(session({ initial: () => ({ count: 0 }) }));
```

### ❌ Missing await next()

```typescript
// WRONG - breaks middleware chain
async function middleware(ctx: Context, next: NextFunction) {
  console.log("before");
  next(); // Missing await!
  console.log("after");
}
```

### ❌ Command After Catch-All

```typescript
// WRONG - text handler catches command first
bot.on(":text", (ctx) => ctx.reply("Text!"));
bot.command("start", (ctx) => ctx.reply("Command!")); // Never reached!
```

### ❌ Unwrapped Side Effects in Conversations

```typescript
// WRONG - duplicate DB writes on replay
async function convo(conversation: Conversation, ctx: Context) {
  await db.logMessage(ctx.msg.text); // Runs multiple times!
}
```

### ❌ Direct Token in Code

```typescript
// WRONG - token hardcoded
const bot = new Bot("123456:ABC-DEF...");

// CORRECT - from environment
const bot = new Bot(process.env.BOT_TOKEN!);
```

---

## 23. Official Resources

| Resource          | URL                                  |
| ----------------- | ------------------------------------ |
| Official Website  | https://grammy.dev                   |
| GitHub Repository | https://github.com/grammyjs/grammY   |
| API Reference     | https://grammy.dev/ref               |
| Plugins Directory | https://grammy.dev/plugins           |
| Examples          | https://github.com/grammyjs/examples |
| Community Chat    | https://t.me/grammyjs                |

---

## 24. Changes to This Guide

Style evolves. Propose improvements by opening an issue or sending a patch updating this document.
