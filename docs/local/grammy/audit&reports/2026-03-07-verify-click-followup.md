# Verify Click Follow-up Audit (2026-03-07)

## Issue

Users who rejoined a required channel could still need multiple presses on the inline `Verify` button before the bot unmuted them.

## Root Cause

Two behaviors compounded each other in the verify callback hot path:

1. `apps/grammy/src/services/verification.ts` performed only one fresh `getChatMember` call after bypassing negative cache. If Telegram had not yet fully propagated the channel rejoin, that first call could still return `left`.
2. `apps/grammy/src/composers/verify.ts` set a debounce key before work started and acquired a `verify` idempotency lock with the default 15 second TTL. Neither guard was released when the callback completed, so a just-failed click forced follow-up clicks into artificial waiting.

## Fix

- Scoped verify debounce by `(groupId, userId)` instead of only `userId`.
- Reduced verify debounce from 3 seconds to 1 second.
- Released the verify debounce key and verify idempotency lock when the callback finishes.
- Added short fresh membership retries for explicit verify checks:
  - `VERIFY_FRESH_CHECK_RETRIES=2`
  - `VERIFY_FRESH_CHECK_RETRY_DELAY_MS=350`

## Result

- One verify click now survives short Telegram membership propagation lag after a user rejoins a required channel.
- Completed verify attempts no longer leave a sticky 15 second callback lock behind.
- Runtime test coverage now asserts first-click success when the first channel membership read is stale and the second fresh read is correct.

## Validation

- `cd apps/grammy && bun run type-check`
- `cd apps/grammy && bun run lint`
- `cd apps/grammy && bun run test`
- `cd apps/grammy && bun run build`
