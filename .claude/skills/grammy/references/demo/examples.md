# grammY Example Bots

Minimal, runnable examples for common grammY patterns. Use these as copy-paste starting points.

---

## 1. Echo Bot (minimal)

```ts
import { Bot } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => ctx.reply("Hello! Send me any message."));
bot.on("message:text", (ctx) => ctx.reply(ctx.message.text));

bot.catch(console.error);
bot.start();
```

---

## 2. Inline Keyboard + Callback Query

```ts
import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("menu", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("Option A", "option_a")
    .text("Option B", "option_b");
  await ctx.reply("Choose:", { reply_markup: keyboard });
});

bot.callbackQuery("option_a", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You chose A!");
});

bot.callbackQuery("option_b", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You chose B!");
});

bot.start();
```

---

## 3. Session — Per-User Counter

```ts
import { Bot, Context, session, SessionFlavor } from "grammy";

interface SessionData { count: number; }
type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial: () => ({ count: 0 }) }));

bot.command("count", async (ctx) => {
  ctx.session.count++;
  await ctx.reply(`Clicked ${ctx.session.count} times`);
});

bot.start();
```

---

## 4. Conversation — Multi-Step Form

```ts
import { Bot, Context } from "grammy";
import {
  Conversation, ConversationFlavor,
  conversations, createConversation,
} from "@grammyjs/conversations";

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

async function registration(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("What's your name?");
  const { message: { text: name } } = await conversation.waitFor("message:text");

  await ctx.reply(`Hi ${name}! How old are you?`);
  const { message: { text: age } } = await conversation.waitFor("message:text");

  await ctx.reply(`Registered: ${name}, age ${age}`);
}

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);
bot.use(conversations());
bot.use(createConversation(registration));

bot.command("register", (ctx) => ctx.conversation.enter("registration"));
bot.start();
```

---

## 5. Dynamic Menu

```ts
import { Bot, Context } from "grammy";
import { Menu } from "@grammyjs/menu";

const bot = new Bot<Context>(process.env.BOT_TOKEN!);

const mainMenu = new Menu("main-menu")
  .text("Ping", (ctx) => ctx.reply("Pong!"))
  .row()
  .text("About", (ctx) => ctx.reply("I am a grammY bot."));

bot.use(mainMenu);
bot.command("menu", (ctx) => ctx.reply("Main menu:", { reply_markup: mainMenu }));
bot.start();
```

---

## 6. Webhook (Express)

```ts
import { Bot, webhookCallback } from "grammy";
import express from "express";

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command("start", (ctx) => ctx.reply("Hello!"));

const app = express();
app.use(express.json());
app.post(`/webhook/${process.env.BOT_TOKEN}`, webhookCallback(bot, "express"));
app.listen(3000, () => console.log("Listening on port 3000"));
```

---

## 7. Inline Mode (@bot query)

```ts
import { Bot, InlineQueryResultBuilder } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim() || "grammY";
  const result = InlineQueryResultBuilder
    .article(`result-${Date.now()}`, `Search: ${query}`)
    .text(`You searched for: ${query}`);
  await ctx.answerInlineQuery([result], { cache_time: 10 });
});

bot.start();
```

---

## 8. File Download

```ts
import { Bot } from "grammy";
import fs from "fs";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.on(":document", async (ctx) => {
  const file = await ctx.getFile();
  const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
  await ctx.reply(`Download your file at: ${url}`);
});

bot.start();
```

---

## 9. Rate Limiting Per User

```ts
import { Bot } from "grammy";
import { limit } from "@grammyjs/ratelimiter";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(limit({
  timeFrame: 2000,
  limit: 3,
  onLimitExceeded: (ctx) => ctx?.reply("Slow down!"),
  keyGenerator: (ctx) => ctx.from?.id.toString(),
}));

bot.on("message", (ctx) => ctx.reply("OK"));
bot.start();
```

---

## 10. Production-Ready Bot (all essentials)

```ts
import { Bot, GrammyError, HttpError } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";

const bot = new Bot(process.env.BOT_TOKEN!);

// Prevent concurrent processing of messages from the same user
bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));

bot.command("start", (ctx) => ctx.reply("Hello!"));
bot.on("message:text", (ctx) => ctx.reply(ctx.message.text));

// Production error handler
bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error("Bot API error:", e.description);
  else if (e instanceof HttpError) console.error("Network error:", e);
  else console.error("Unexpected error:", e);
});

// Use runner for concurrent long polling
run(bot);
```

---

For more examples, see the official [grammY examples repo](https://github.com/grammyjs/examples).
