# Types Reference

**Package:** `grammy/types`

TypeScript type definitions from the Telegram Bot API.

## Key Types

### Messages
- `Message` - A message in a chat
- `MessageEntity` - Special entity in message text (bold, links, etc.)
- `Update` - Incoming update from Telegram

### User & Chat
- `User` - Telegram user
- `Chat` - A chat (private, group, supergroup, channel)
- `ChatMember` - Member of a chat

### Input Media
- `InputMediaPhoto` - Photo to be sent
- `InputMediaVideo` - Video to be sent
- `InputMediaAudio` - Audio file to be sent
- `InputMediaDocument` - Document to be sent

### Inline
- `InlineQuery` - Incoming inline query
- `InlineQueryResult` - Result for inline query
- `CallbackQuery` - Incoming callback query from inline keyboard

### Payments
- `LabeledPrice` - Portion of price
- `ShippingOption` - Shipping option
- `PreCheckoutQuery` - Pre-checkout query

### Stickers
- `Sticker` - Sticker
- `StickerSet` - Sticker set
- `InputSticker` - Sticker to be added

## Usage

```ts
import { Context, SessionFlavor } from "grammy";
import { Message, User } from "grammy/types";

// Access types via context
bot.on("message", (ctx) => {
  const message: Message = ctx.message;
  const from: User | undefined = ctx.from;
});
```

---

Full reference: https://core.telegram.org/bots/api
