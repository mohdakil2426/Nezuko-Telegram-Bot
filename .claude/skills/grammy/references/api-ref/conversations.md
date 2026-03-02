# Conversations API Reference

**Package:** `@grammyjs/conversations`

Conversations let you wait for user input in the middle of your code.

## Functions

### `conversations()`

Install the conversations plugin.

```ts
import { conversations } from "@grammyjs/conversations";
bot.use(conversations());
```

### `createConversation(builder, options?)`

Register a conversation builder function.

```ts
bot.use(createConversation(helloConversation));
```

## Types

### `ConversationFlavor<C>`

Context flavor that adds `ctx.conversation`.

```ts
type MyContext = Context & ConversationFlavor;
```

### `Conversation`

Conversation object passed to builder functions.

```ts
async function greet(conversation: Conversation, ctx: Context) {
  // conversation methods available here
}
```

## Conversation Methods

### Waiting for Updates

- `conversation.wait()` - Wait for any update
- `conversation.waitFor(event)` - Wait for specific event
- `conversation.waitFrom(userId)` - Wait for message from user
- `conversation.waitForMessage()` - Wait for message
- `conversation.waitForCallbackQuery(data?)` - Wait for callback query

### Conversation Control

- `conversation.sleep(ms)` - Wait without processing updates
- `conversation.skip()` - Skip current update
- `conversation.halt()` - Halt the conversation
- `conversation.external(fn)` - Run code outside conversation tracking

### Parallel Conversations

- `conversation.fork(otherConversation)` - Run another conversation in parallel
- `conversation.run(otherConversation)` - Run and wait for completion

## Example

```ts
async function register(conversation: Conversation, ctx: Context) {
  await ctx.reply("What is your name?");
  const nameCtx = await conversation.waitFor("message:text");
  const name = nameCtx.message.text;

  await ctx.reply("What is your age?");
  const ageCtx = await conversation.waitFor("message:text");
  const age = parseInt(ageCtx.message.text);

  await ctx.reply(`Hello ${name}, you are ${age} years old!`);
}

bot.use(createConversation(register));
bot.command("register", async (ctx) => {
  await ctx.conversation.enter("register");
});
```

---

See `references/plugins/conversations.md` for detailed usage guide.
