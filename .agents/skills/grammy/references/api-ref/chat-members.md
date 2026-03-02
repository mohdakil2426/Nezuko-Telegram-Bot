# Chat Members API Reference

**Package:** `@grammyjs/chat-members`

Track chat member status changes (joins, leaves, bans, promotions).

## `chatMembers()`

Install the chat members plugin.

```ts
import { chatMembers } from "@grammyjs/chat-members";
import { MemorySessionStorage } from "grammy";

bot.use(chatMembers(
  new MemorySessionStorage(),
  bot,
));
```

### Storage Adapter

The plugin requires a storage adapter:

```ts
import { MemorySessionStorage } from "grammy";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { PsqlAdapter } from "@grammyjs/storage-psql";

// In-memory (development)
new MemorySessionStorage();

// Redis (production)
new RedisAdapter({ instance: redisClient });

// PostgreSQL (production)
new PsqlAdapter({ pool: pgPool });
```

### Options

```ts
chatMembers(storage, bot, {
  // Enable chat member caching on context
  enableAggressiveStorage: true,

  // Custom key for storage
  storageKey: (ctx) => `chatmembers:${ctx.chat?.id}`,
});
```

## Context Methods

### `ctx.chatMembers.getChatMember(userId)`

Get cached chat member info.

```ts
bot.command("info", async (ctx) => {
  const member = await ctx.chatMembers.getChatMember(ctx.from.id);
  await ctx.reply(`Status: ${member.status}`);
});
```

### `ctx.chatMembers.setChatMember(userId, member)`

Manually update member info.

```ts
await ctx.chatMembers.setChatMember(userId, {
  user: { id: userId, is_bot: false, first_name: "John" },
  status: "member",
});
```

## Events

Listen for member changes:

```ts
bot.on("chat_member", async (ctx) => {
  const oldStatus = ctx.chatMember.old_chat_member.status;
  const newStatus = ctx.chatMember.new_chat_member.status;

  console.log(`${ctx.from.first_name}: ${oldStatus} -> ${newStatus}`);
});
```

### Status Types

- `"member"` - Regular member
- `"administrator"` - Admin
- `"creator"` - Owner
- `"restricted"` - Restricted member
- `"left"` - Left the group
- `"kicked"` - Banned from group

## Detecting Changes

```ts
bot.on("chat_member", async (ctx) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;

  // User joined
  if (old_chat_member.status === "left" && new_chat_member.status === "member") {
    await ctx.reply(`Welcome, ${new_chat_member.user.first_name}!`);
  }

  // User left
  if (new_chat_member.status === "left") {
    console.log(`${new_chat_member.user.first_name} left`);
  }

  // Promoted to admin
  if (old_chat_member.status !== "administrator" && new_chat_member.status === "administrator") {
    await ctx.reply(`Congrats ${new_chat_member.user.first_name}, you're now an admin!`);
  }
});
```

---

See `references/plugins/chat-members.md` for detailed usage guide.
