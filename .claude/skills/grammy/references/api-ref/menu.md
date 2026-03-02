# Menu API Reference

**Package:** `@grammyjs/menu`

Create interactive inline keyboard menus with dynamic navigation.

## `Menu`

Main class for creating menus.

```ts
const menu = new Menu("my-menu", { autoAnswer: true });
```

### Constructor Options

- `autoAnswer` (boolean) - Auto-answer callback queries
- `oneTimeKeyboard` (boolean) - Hide keyboard after use

### Builder Methods

- `.text(label, handler)` - Text button
- `.url(label, url)` - URL button
- `.webApp(label, url)` - Web App button
- `.switchInline(label, query?)` - Switch to inline mode
- `.switchInlineCurrent(label, query?)` - Switch inline in current chat
- `.row()` - Start new row
- `.submenu(label, menuId, options?)` - Open submenu
- `.back(label?)` - Go back to parent menu
- `.copyText(label, text)` - Copy text button (Telegram 7.7+)

### Dynamic Menus

```ts
menu.dynamic((ctx) => {
  const range = new MenuRange();
  for (const item of items) {
    range.text(item.name, (ctx) => handleItem(ctx, item.id)).row();
  }
  return range;
});
```

## `MenuRange`

Builder for dynamic menu ranges.

Same builder methods as `Menu`, plus:

- `.add(buttons)` - Add raw button objects
- `.append(other)` - Append another range

## Usage

```ts
const mainMenu = new Menu("main")
  .text("Option A", (ctx) => ctx.reply("A"))
  .row()
  .text("Option B", (ctx) => ctx.reply("B"));

bot.use(mainMenu);
bot.command("menu", (ctx) => {
  ctx.reply("Choose:", { reply_markup: mainMenu });
});
```

## Submenus

```ts
const settingsMenu = new Menu("settings")
  .text("Toggle", toggleSetting)
  .row()
  .back("Go Back");

const mainMenu = new Menu("main")
  .submenu("Settings", "settings")
  .row()
  .text("Done", closeMenu);

mainMenu.register(settingsMenu);
```

---

See `references/plugins/menu.md` for detailed usage guide.
