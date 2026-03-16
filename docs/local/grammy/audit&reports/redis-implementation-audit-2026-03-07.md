# Redis Implementation Audit

Date: 2026-03-07
Auditor: Codex
Scope: Redis audit report for the active grammY runtime in `apps/grammy/`
Audit basis: `memory-bank/*`, `.agents/skills/redis-development/SKILL.md`, `.agents/skills/redis-development/AGENTS.md`

## Scope and Method

This audit reviewed the repository's Redis-related code paths, then narrowed the written findings to the active grammY runtime in `apps/grammy/`. Archived PTB details were intentionally excluded from the final report.

Redis skill areas that materially apply here:

- `data-key-naming`
- `ram-limits`
- `ram-ttl`
- `conn-blocking`
- `conn-pipelining`
- `conn-pooling`
- `conn-timeouts`
- `security-auth`
- `security-network`
- `observe-metrics`
- `observe-commands`

Not materially applicable in this repo:

- Redis Query Engine
- Vector search / RedisVL
- Semantic cache / LangCache
- Streams / Pub/Sub as a primary application transport in the active runtime
- Cluster hash-tag strategy

## Executive Summary

The active grammY Redis implementation is generally solid. It uses consistent key naming, short-lived cache keys for enforcement-critical paths, graceful degradation when Redis is unavailable, pipelined bulk invalidation, and local memory limits in Docker. The main issue in scope is that the `chatMembers` adapter writes Redis entries without TTL, which creates an avoidable memory-growth risk.

## Findings

### 1. `chatmember:` keys in the active grammY runtime never expire

Severity: Medium
Status: Active runtime issue
Skill rules: `ram-ttl`, `ram-limits`

Evidence:

- [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L51) writes chat-member state with `redis.set(...)`
- [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L54) does not attach any TTL
- [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L63) only deletes keys on explicit invalidation

Why this matters:

The active runtime correctly applies TTLs to membership checks, verified state, debouncing, join-request approvals, and idempotency locks. The exception is the `chatMembersAdapter` storage used by `@grammyjs/chat-members`. Those entries are written under `nezuko:v2:chatmember:*` with no expiration, so Redis memory usage can grow monotonically with chat/member churn. This is the clearest mismatch with the Redis rule that cache keys should expire unless they are intentionally durable.

Risk:

- Long-running bots accumulate stale chat-member entries
- Memory pressure shifts more eviction onto unrelated keys under `allkeys-lru`
- The keys most useful for enforcement may get evicted before stale chat-member data does

Recommendation:

- Add a bounded TTL for `chatmember:` entries
- Pick a TTL that matches how stale this plugin state is allowed to become
- If the library needs longer-lived entries, document why these keys are intentionally persistent and add explicit pruning

### 2. Local Docker Redis is intentionally insecure and must stay local-only

Severity: Low
Status: Operational note
Skill rules: `security-auth`, `security-network`, `ram-limits`

Evidence:

- [docker-compose.local.yml](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/docker-compose.local.yml#L10) sets memory limits and eviction policy correctly
- [docker-compose.local.yml](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/docker-compose.local.yml#L12) publishes `6379:6379`

Why this matters:

For local development, this is reasonable. For any shared machine or promoted environment, it violates the Redis security rules because there is no visible password, TLS, or host restriction in this compose file.

Recommendation:

- Keep this file strictly local-development-only
- Do not reuse it for staging or production
- If a shared environment is ever needed, add auth and avoid broad host exposure

## What Is Working Well

### Active grammY runtime strengths

- Consistent namespaced keys via `nezuko:v2:` in [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L24) and [apps/grammy/src/core/constants.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/constants.ts#L49)
- Short TTLs on enforcement-critical cache keys in [apps/grammy/src/core/constants.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/constants.ts#L52)
- Negative membership TTL kept intentionally short in [apps/grammy/src/core/constants.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/constants.ts#L61)
- Explicit bypass of stale negative cache during verification in [apps/grammy/src/services/verification.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/services/verification.ts#L116)
- Pipelined bulk invalidation in [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L164)
- Connection configured to fail fast instead of queueing forever in [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L87)
- Runtime health helpers exposed in [apps/grammy/src/core/cache.ts](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/src/core/cache.ts#L180)
- Local dev Redis has explicit `maxmemory` and `allkeys-lru` in [docker-compose.local.yml](/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/docker-compose.local.yml#L10)

## Rule-by-Rule Outcome

### Active grammY runtime

- `data-key-naming`: Pass
- `ram-limits`: Pass for local dev Redis config
- `ram-ttl`: Partial pass because `chatmember:` keys are non-expiring
- `conn-blocking`: Pass
- `conn-pipelining`: Pass
- `conn-pooling`: Pass for current single shared client pattern
- `conn-timeouts`: Partial pass, with solid connection timeout behavior but no extra per-command timeout layer in the cache wrapper
- `security-auth`: Not enforced in local compose, acceptable only because it is local-only
- `security-network`: Not enforced in local compose, acceptable only because it is local-only
- `observe-metrics`: Partial pass through health helpers and operational logs, but Redis-native slowlog/info instrumentation is not surfaced by app code
- `observe-commands`: Partial pass for the same reason

## Recommended Priority Order

1. Add TTL or cleanup policy for grammY `chatmember:` keys
2. Keep `docker-compose.local.yml` local-only and do not reuse it as a shared-environment Redis template

## Final Verdict

The active Redis implementation is in good shape for the bot’s current workload and aligns with most of the Redis skill guidance. The main gap in the current grammY production path is memory hygiene for `chatmember:` entries.
