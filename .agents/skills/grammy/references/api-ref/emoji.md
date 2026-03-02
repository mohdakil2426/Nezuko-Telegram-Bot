# Emoji API Reference

**Package:** `@grammyjs/emoji`

Use emojis easily with type safety and IDE autocomplete.

## `emoji`

Emoji mapping object with all Unicode emojis.

```ts
import { emoji } from "@grammyjs/emoji";

ctx.reply(`${emoji.thumbs_up} Great job!`);
```

## Usage

### Static Emoji

```ts
import { emoji } from "@grammyjs/emoji";

ctx.reply(`
${emoji.wave} Hello!
${emoji.rocket} Let's get started
${emoji.check_mark} Done
`);
```

### With Parse Mode

```ts
import { fmt, bold } from "@grammyjs/parse-mode";
import { emoji } from "@grammyjs/emoji";

ctx.reply(fmt`${emoji.fire} ${bold("Hot deals!")}`);
```

## Available Emoji Categories

### Faces & People
- `emoji.grinning_face` - 😀
- `emoji.thumbs_up` - 👍
- `emoji.thumbs_down` - 👎
- `emoji.wave` - 👋
- `emoji.ok_hand` - 👌

### Symbols
- `emoji.check_mark` - ✅
- `emoji.cross_mark` - ❌
- `emoji.warning` - ⚠️
- `emoji.prohibited` - 🚫
- `emoji.red_circle` - 🔴
- `emoji.green_circle` - 🟢

### Objects
- `emoji.rocket` - 🚀
- `emoji.fire` - 🔥
- `emoji.star` - ⭐
- `emoji.gem` - 💎

### Activities
- `emoji.party_popper` - 🎉
- `emoji.basketball` - 🏀
- `emoji.video_game` - 🎮

## Emoji Constants

Use the `emojis` object for arrays:

```ts
import { emojis } from "@grammyjs/emoji";

// Array of numbers
emojis.numbers[5]; // 5️⃣

// Array of colors
emojis.hearts[0]; // ❤️ (red)
```

## Full List

All emojis from Unicode 14.0+ are available. Use IDE autocomplete to explore:

```ts
emoji.[PRESS CTRL+SPACE FOR AUTOCOMPLETE]
```

---

See `references/plugins/emoji.md` for detailed usage guide.
