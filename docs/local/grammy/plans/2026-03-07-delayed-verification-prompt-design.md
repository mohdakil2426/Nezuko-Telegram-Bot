# Delayed Verification Prompt Design

Date: 2026-03-07
Status: Approved for planning
Scope: `apps/grammy` verification enforcement behavior

## Problem

When a user rapidly joins and leaves a required channel, the bot can send repeated verification prompts into linked groups. This creates group noise and poor UX.

The current behavior sends prompts from channel-side `chat_member` leave handling. That means a membership flap can create visible prompts even when the user never tries to speak in the group.

## Goal

Keep enforcement strict while reducing group spam.

The bot should:

- stay silent when a user leaves a required channel
- keep the user unverified and restricted in the background
- enforce on the first blocked group message
- send exactly one active prompt per user per group

## Approved Behavior

### Channel leave

When a user leaves or is kicked from a required channel:

- invalidate verified cache for all linked groups
- update required-channel membership cache to negative
- do not send a verification prompt into any group
- do not fan out prompts across linked groups

### First blocked group message

When an unverified user sends a message in a protected group:

- delete that message immediately
- call `restrictChatMember` again to recover from missed or failed earlier restriction
- send exactly one verification prompt for that user in that group

### Repeated blocked messages

If the same user keeps sending messages while still unverified:

- keep deleting the messages
- do not send additional prompts while an active prompt already exists

### Verification success

When the user verifies successfully:

- unmute/unrestrict the user
- delete the active verification prompt immediately
- ignore prompt-delete failure if the prompt is already gone

### Group leave

When the user leaves the group before verifying:

- clear active prompt state for that `(groupId, userId)`

### Rejoin before speaking

If the user rejoins the required channel before speaking again in the group:

- allow the next verification check to pass
- do not show a prompt if the user is already valid again

### Missed channel leave event

If Telegram does not deliver the required-channel leave event:

- rely on the existing message-path revalidation fallback
- delete the first blocked message
- restrict again
- send one prompt

## Recommended Architecture

### Prompt state

Add Redis-backed prompt tracking per `(groupId, userId)`.

Store:

- prompt message id
- optional prompt chat id for symmetry
- TTL aligned with message lifetime

Suggested key shape:

`verification_prompt:{groupId}:{userId}`

This is distinct from short-lived idempotency locks. The idempotency lock prevents duplicate concurrent work for seconds. The prompt key represents visible active state for minutes.

### Prompt lifecycle helpers

Create small helpers in the bot runtime to:

- get active prompt state
- store prompt state after sending
- clear prompt state
- delete-and-clear prompt state safely

These helpers should degrade gracefully when Redis is unavailable. In degraded mode, enforcement still works, but prompt dedupe may be weaker.

### Channel-side enforcement change

Update required-channel `chat_member` handling so it no longer calls the prompt-sending path. It should only invalidate state and optionally apply silent restriction.

### Message-path enforcement change

Keep the current message-path revalidation, but extend the failure branch:

1. delete message
2. restrict user
3. check for existing prompt
4. send prompt only if none exists

This becomes the only normal path that creates a verification prompt for silently-invalid users.

## Error Handling

- If message delete fails, continue with restriction and prompt logic.
- If `restrictChatMember` fails, still try to send the prompt.
- If prompt send fails, log and continue.
- If prompt delete fails on verification, treat as harmless and continue.
- If Redis is unavailable, enforcement must still proceed without crashing.

## Files Expected To Change

- `apps/grammy/src/composers/events.ts`
- `apps/grammy/src/composers/verify.ts`
- `apps/grammy/src/core/constants.ts`
- `apps/grammy/src/core/cache.ts`
- `apps/grammy/src/types.ts` only if a helper type is useful
- `tests/grammy/integration/composers/events.test.ts`
- `tests/grammy/helpers/mock-update.ts` if more update shapes are needed
- new unit tests for prompt-state helpers if extracted into a separate module

## Testing Plan

Add coverage for:

- channel leave does not send a group prompt
- first blocked message deletes + restricts + sends one prompt
- repeated blocked messages do not create extra prompts
- successful verification deletes active prompt state
- group leave clears active prompt state
- prompt-delete failure on verification is ignored
- missed channel leave still recovers on message-path revalidation

## Tradeoff Summary

### Chosen approach

Silent leave handling plus message-triggered prompting with prompt dedupe.

### Why this was chosen

- lowest group noise
- fast visible enforcement on first attempted message
- preserves existing safety net from Phase 110
- avoids multi-group prompt fan-out from one channel leave event

### Rejected alternatives

- immediate prompting on channel leave: too noisy
- silent enforcement with no prompt ever: too confusing for users

## Next Step

Create the implementation plan and then update the runtime code in `apps/grammy`.
