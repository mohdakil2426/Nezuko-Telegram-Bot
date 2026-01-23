# Design: Channel Verification Bot Architecture

## Context
We are building a Telegram bot to enforce channel membership in a linked group. The bot needs to be performant, reliable, and user-friendly.

## Goals / Non-Goals
- **Goals**:
    - Mute non-members instantly (<1s).
    - Provide clear UI for unmuting.
    - Handle API rate limits.
- **Non-Goals**:
    - Complex administration dashboard (MVP is simple config).
    - Multi-platform support (Telegram only).

## Decisions
- **Decision**: Logic on Message Event
    - **Why**: We need to catch every attempt to speak by a non-member.
    - **Alternative**: Periodic checks (Too slow, allows spam).
- **Decision**: `getChatMember` API Usage
    - **Why**: The official API is the source of truth for membership.
    - **Risk**: API Rate limits. **Mitigation**: Caching (future) or efficient localized checks.
- **Decision**: Ephemeral/Self-Deleting Warnings
    - **Why**: Prevents cluttering the group chat with bot spam.

## Risks / Trade-offs
- **Risk**: Bot kicked from channel.
    - **Mitigation**: Log error, notify admin, fail open (allow messages) to prevent disruption.
- **Risk**: High Traffic Groups.
    - **Mitigation**: Async processing, potential short-term caching of member status.

## Migration Plan
- N/A (Greenfield project).
