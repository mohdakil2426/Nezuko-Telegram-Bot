# Commands API Reference

**Package:** `@grammyjs/commands`

Manage bot commands with descriptions and scopes.

## `CommandGroup`

Group and manage bot commands.

```ts
import { CommandGroup } from "@grammyjs/commands";

const commands = new CommandGroup().add(
  ["start", "Start the bot"],
  ["help", "Show help"],
  ["settings", "Open settings"]
);
```

### Adding Commands

```ts
commands
  .add("start", "Start the bot")
  .add("help", "Show help", { prefix: false }) // No / prefix
  .addLocalized("start", { en: "Start", de: "Starten" });
```

### Scopes

Control where commands appear:

```ts
commands
  // All chats (default)
  .add("public", "Public command")

  // Private chats only
  .add("dm", "DM only", { scope: "private" })

  // Specific chat
  .add("admin", "Admin command", { scope: { chat_id: -100123456789 } });
```

### Localized Commands

```ts
commands.add("order", {
  en: "Place an order",
  de: "Bestellung aufgeben",
  ru: "Сделать заказ",
});
```

## Setting Commands

```ts
// Set all commands at once
await commands.setCommands(bot);

// Or use middleware
bot.use(commands);
```

## Command Info

```ts
// Get command list
const list = commands.toString();
// /start - Start the bot
// /help - Show help

// Get localized list
const deList = commands.toString("de");
```

## Integration with Filters

```ts
const myCommands = new CommandGroup()
  .add("start", "Start")
  .add("help", "Help");

bot.use(myCommands);

// Commands automatically invoke handlers
myCommands.on("start", (ctx) => ctx.reply("Welcome!"));
```

## Menu Commands

Menu commands appear in the UI menu (≡):

```ts
commands.add("menu", "Open menu", { menu: true });
```

---

See `references/plugins/commands.md` and `references/guide/commands.md` for usage guides.
