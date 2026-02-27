## ADDED Requirements

### Requirement: PTB Defaults class configured
The bot SHALL configure `Defaults(parse_mode=ParseMode.HTML)` in the `ApplicationBuilder` so all messages default to HTML parse mode.

#### Scenario: Message sent without explicit parse_mode
- **WHEN** a handler calls `context.bot.send_message()` without specifying `parse_mode`
- **THEN** the message SHALL be parsed as HTML

### Requirement: All handlers use HTML parse mode
All bot handlers SHALL use HTML formatting only. Any existing Markdown formatting SHALL be converted to HTML.

#### Scenario: Welcome message uses HTML
- **WHEN** the `/start` command is executed
- **THEN** the response SHALL use HTML tags (`<b>`, `<i>`, `<code>`) instead of Markdown (`*`, `_`, `` ` ``)

### Requirement: Explicit parse_mode removed from handlers
Handlers that currently pass `parse_mode=ParseMode.HTML` explicitly SHALL remove the parameter since it will be set as default.

#### Scenario: Handler code simplified
- **WHEN** a handler previously had `parse_mode=ParseMode.HTML`
- **THEN** the parameter SHALL be removed to use the default
