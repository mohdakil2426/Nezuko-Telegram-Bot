# Bot Log Restart Race Audit (2026-03-07)

## Evidence Reviewed

- Local runtime log: `apps/grammy/logs/bot.log`
- Official grammY references consulted:
  - `references/advanced/reliability.md`
  - `references/advanced/scaling.md`
  - `references/plugins/runner.md`
  - `references/guide/errors.md`

## Root Cause

The bot log showed a recovery race inside dashboard-mode bot supervision, not just an external duplicate process:

1. At `12:37:16`, the watchdog logged `Bot runner appears stalled; restarting bot instance`.
2. In the same second, the sync loop logged `Detected new active bot — starting`.
3. The same bot then logged two separate `grammY runner started — long polling active` events at `12:37:19` and `12:37:20`.
4. That duplicate local long-poll start produced a real Telegram `getUpdates` `409 Conflict` and duplicated `Member sync started/completed` entries.

The code path that allowed this was `apps/grammy/src/multi-bot/bot-lifecycle.ts`:

- the watchdog/task recovery path removed the bot from the registry before the restart completed
- the 30-second sync loop in `apps/grammy/src/multi-bot/bot-manager.ts` could observe that temporary gap and start the same bot again
- `stopRunner()` also awaited `runner.task()` directly, so a rejected runner task could abort cleanup during stop/restart handling

## Fix

- Serialized bot lifecycle transitions per `botId` inside `BotLifecycleManager`.
- Routed watchdog/task recovery back through `restartBot(...)` instead of manually clearing registry state first.
- Hardened `stopRunner()` so an already-rejected `runner.task()` does not abort shutdown/restart cleanup.

## Result

- Watchdog, task-failure, sync-loop, manual start, manual stop, and manual restart operations can no longer overlap for the same bot id.
- A single genuine stall no longer creates a second local long-poll runner.
- Cleanup still completes after `getUpdates` conflicts instead of bailing out mid-stop.

## Validation

- `cd apps/grammy && bun run type-check`
- `cd apps/grammy && bun run lint`
- `cd apps/grammy && bun run test`
- `cd apps/grammy && bun run build`
