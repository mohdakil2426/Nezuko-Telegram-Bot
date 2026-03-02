# Parse Mode API Reference

**Package:** `@grammyjs/parse-mode`

Build formatted messages with tagged template literals.

## Installation

```ts
import { parseMode } from "@grammyjs/parse-mode";

bot.use(parseMode());
```

## Formatting Functions

Import the formatting helpers:

```ts
import { fmt, bold, italic, code, link, mention } from "@grammyjs/parse-mode";
```

### `fmt` tagged template

Creates a formatted string with entities.

```ts
ctx.reply(fmt`
${bold("Welcome")} to the bot!

${italic("Here are the commands:")}
${code("/start")} - Start the bot
`);
```

### Formatting Helpers

| Function | Usage | Result |
|----------|-------|--------|
| `bold(text)` | `fmt`${bold("text")}`` | **text** |
| `italic(text)` | `fmt`${italic("text")}`` | *text* |
| `underline(text)` | `fmt`${underline("text")}`` | __text__ |
| `strikethrough(text)` | `fmt`${strikethrough("text")}`` | ~~text~~ |
| `spoiler(text)` | `fmt`${spoiler("text")}`` | ||text|| |
| `code(text)` | `fmt`${code("text")}`` | `text` |
| `pre(language)(code)` | `fmt`${pre("ts")("code")}`` | ```ts code ``` |
| `link(text, url)` | `fmt`${link("click", "url")}`` | [click](url) |
| `mention(text, userId)` | `fmt`${mention("user", 123)}`` | [user](tg://user?id=123) |
| `cashtag(text)` | `fmt`${cashtag("BTC")}`` | $BTC |
| `hashtag(text)` | `fmt`${hashtag("grammy")}`` | #grammy |

### Nested Formatting

```ts
const formatted = fmt`
${bold(`Welcome ${italic(ctx.from.first_name)}!`)}

${link("Click here", "https://example.com")} to ${underline("continue")}.
`;

ctx.reply(formatted);
```

## Formatting Object

Access the raw formatting result:

```ts
const formatted = fmt`${bold("Hello")} World`;

console.log(formatted.text); // "Hello World"
console.log(formatted.entities); // [{ type: "bold", offset: 0, length: 5 }]
```

## Using with API Directly

```ts
import { fmt, bold } from "@grammyjs/parse-mode";

const formatted = fmt`${bold("Important")}: Please read`;

await bot.api.sendMessage(chatId, formatted.text, {
  entities: formatted.entities,
});
```

## HTML-Style Alternative

```ts
import { parseMode } from "@grammyjs/parse-mode";

bot.use(parseMode("HTML"));

ctx.reply("<b>Bold</b> and <i>italic</i>");
```

Available HTML tags:
- `<b>`, `<strong>` - Bold
- `<i>`, `<em>` - Italic
- `<u>` - Underline
- `<s>`, `<strike>`, `<del>` - Strikethrough
- `<code>` - Inline code
- `<pre>` - Code block
- `<a href="url">` - Link
- `<tg-spoiler>` - Spoiler

## MarkdownV2-Style

```ts
bot.use(parseMode("MarkdownV2"));

ctx.reply("*Bold* and _italic_");
```

---

See `references/plugins/parse-mode.md` for detailed usage guide.
