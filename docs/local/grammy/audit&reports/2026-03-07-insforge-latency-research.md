# InsForge Latency Research Report

Date: 2026-03-07
Project: Nezuko Telegram Bot Platform
Scope: Live latency analysis for the production grammY bot using InsForge telemetry and logs

## Objective

Measure the bot's observed response latency using the telemetry that already exists in production, identify the lowest, highest, and average latencies across the major instrumented paths, and determine whether the primary bottleneck is Telegram API latency, verification logic, or InsForge backend latency.

## Evidence Sources

This report is based on live production data collected on 2026-03-07 from:

1. `api_call_log`
2. `verification_log`
3. `insforge.logs`
4. `postgREST.logs`

These sources were queried through the InsForge MCP tools, not from stale local exports.

## What Is Currently Measured

### 1. Telegram Bot API Call Latency

Stored in `api_call_log.latency_ms`.

This measures the duration of outgoing Telegram API calls made by the bot, such as:

- `sendMessage`
- `deleteMessage`
- `restrictChatMember`
- `getChatMember`
- `answerCallbackQuery`
- `getChatMemberCount`

Important: this is not end-to-end user-perceived latency. It measures individual Telegram API calls, not the full time from receiving an update to finishing all work for that update.

### 2. Verification Flow Latency

Stored in `verification_log.latency_ms`.

This measures the time spent inside the verification path, which includes:

- loading the verification contract
- checking required channel membership
- using Redis cache where applicable
- handling explicit verify checks and message-path rechecks

This is the most useful currently available metric for user-facing verification performance.

### 3. InsForge HTTP Request Duration

Observed in `insforge.logs.body.duration`.

This measures the bot's HTTP requests to InsForge services such as:

- `GET /bot_instances`
- `GET /admin_commands`
- `PATCH /bot_status`
- `PATCH /protected_groups`
- `GET /group_channel_links`
- `GET /enforced_channels`

These values help determine whether InsForge is the main contributor to latency.

### 4. PostgREST Health Signals

Observed in `postgREST.logs`.

These logs do not provide direct per-request bot latency, but they are useful for spotting backend health issues such as schema-cache churn, reload loops, or general instability.

## Methodology

### SQL Used for `api_call_log`

```sql
select count(*) as total_calls,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       round(avg(latency_ms)::numeric, 2) as avg_ms
from api_call_log
where latency_ms is not null;
```

```sql
select bot_id,
       count(*) as calls,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       round(avg(latency_ms)::numeric, 2) as avg_ms
from api_call_log
where latency_ms is not null
  and bot_id is not null
group by bot_id
order by calls desc;
```

```sql
select method,
       count(*) as calls,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       round(avg(latency_ms)::numeric, 2) as avg_ms
from api_call_log
where latency_ms is not null
group by method
order by avg_ms desc, calls desc;
```

```sql
select method,
       round(percentile_cont(0.95) within group (order by latency_ms)::numeric, 2) as p95_ms
from api_call_log
where latency_ms is not null
group by method
order by p95_ms desc;
```

### SQL Used for `verification_log`

```sql
select count(*) as total_verifications,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       round(avg(latency_ms)::numeric, 2) as avg_ms
from verification_log
where latency_ms is not null;
```

```sql
select status,
       count(*) as checks,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       round(avg(latency_ms)::numeric, 2) as avg_ms
from verification_log
where latency_ms is not null
group by status
order by avg_ms desc, checks desc;
```

```sql
select round(percentile_cont(0.95) within group (order by latency_ms)::numeric, 2) as p95_ms
from verification_log
where latency_ms is not null;
```

## Results

## A. Overall Telegram API Call Latency

For the production bot `8716661547`:

- Total recorded calls: 887
- Minimum latency: 174 ms
- Maximum latency: 3068 ms
- Average latency: 479.45 ms

Across all rows in `api_call_log`:

- Total recorded calls: 886-889 during sampling window
- Minimum latency: 1 ms
- Maximum latency: 3068 ms
- Average latency: about 478 ms

The 1 ms rows came from probe-style records, not normal Telegram methods. For the real bot rows, the practical minimum is 174 ms.

## B. Telegram API Latency by Method

### Highest Average Latency Methods

1. `restrictChatMember`
   - Calls: 69
   - Min: 365 ms
   - Max: 1984 ms
   - Avg: 746.42 ms
   - P95: 1097.60 ms

2. `getChatMemberCount`
   - Calls: 206
   - Min: 176 ms
   - Max: 1685 ms
   - Avg: 586.67 ms
   - P95: 972.00 ms

3. `sendMessage`
   - Calls: 158
   - Min: 368 ms
   - Max: 3068 ms
   - Avg: 490.99 ms
   - P95: 852.45 ms

4. `deleteMessage`
   - Calls: 149
   - Min: 178 ms
   - Max: 1157 ms
   - Avg: 462.97 ms
   - P95: 959.45 ms

5. `getChatMember`
   - Calls: 142
   - Min: 177 ms
   - Max: 873 ms
   - Avg: 402.36 ms
   - P95: 736.85 ms

6. `answerCallbackQuery`
   - Calls: 86
   - Min: 340 ms
   - Max: 588 ms
   - Avg: 363.00 ms
   - P95: 398.75 ms

7. `getMe`
   - Calls: 74
   - Min: 174 ms
   - Max: 1427 ms
   - Avg: 227.81 ms
   - P95: 320.70 ms

### Interpretation

- `restrictChatMember` is the slowest Telegram action on average.
- `sendMessage`, `deleteMessage`, and `getChatMember` are all materially slower than `answerCallbackQuery`.
- That matches the real user experience: the callback acknowledgement can be reasonably fast, while the full verification flow still feels slower because unmute/mute/message actions add more network work.

## C. Verification Flow Latency

From `verification_log`:

- Total recorded verifications: 62
- Minimum latency: 341 ms
- Maximum latency: 2714 ms
- Average latency: 1323.63 ms
- P95 latency: 2171.60 ms

### By Verification Status

`verified`
- Checks: 27
- Min: 341 ms
- Max: 1911 ms
- Avg: 1018.30 ms

`restricted`
- Checks: 35
- Min: 355 ms
- Max: 2714 ms
- Avg: 1559.17 ms

### Interpretation

- Successful verification is faster than failed verification.
- Failed verification is slower because it tends to involve more work:
  - checking all required channels before deciding failure
  - follow-up enforcement work on message-path flows
  - prompt creation / mute / logging in some user-visible enforcement paths
- Even successful verification still averages just over 1 second, which is much higher than a single `answerCallbackQuery` call. This confirms the main verification cost is the full flow, not just button acknowledgement.

## D. Recent InsForge Request Durations

Recent live samples from `insforge.logs` show these request durations for the bot-facing backend calls:

### Fast Requests

- `GET /group_channel_links`: 24 ms
- `GET /enforced_channels`: 25 ms
- `POST /admin_logs`: 33 ms
- `GET /health`: 3 ms and 33 ms

### Mid-Range Requests

- `PATCH /protected_groups`: 103 ms
- `POST /api_call_log`: 105 ms
- `PATCH /bot_status`: 85 ms, 122 ms, 181 ms, 227 ms, 300 ms

### Slower Bot Poll/Sync Reads

- `GET /admin_commands`: 204 ms, 221 ms, 223 ms, 258 ms, 275 ms
- `GET /bot_instances`: 201 ms, 236 ms, 237 ms, 239 ms

### Dashboard RPC Examples

These are dashboard-side, not direct bot-response paths, but they help characterize backend performance:

- `POST /get_groups_status`: 374 ms
- `POST /get_dashboard_stats`: 490 ms
- `POST /get_verification_distribution`: 569 ms
- `POST /get_verification_trends`: 486 ms

### Interpretation

InsForge request latency is mostly in the tens to low hundreds of milliseconds for the bot’s direct operational paths.

That means:

- InsForge is not the dominant latency source for verification
- it contributes some cost, but it does not explain 1.3 s average verification time by itself
- the verification path is primarily dominated by Telegram API round trips and orchestration across multiple operations

## E. PostgREST Backend Signals

The sampled `postgREST.logs` do not show a request-latency bottleneck affecting the bot path.

Observed behavior:

- repeated schema cache reload notices
- schema cache query times around 5.5 ms to 32.2 ms
- successful reconnects and reloads

These logs do not indicate a current sustained backend latency problem for the measured bot operations.

## Lowest, Highest, and Average Latency Summary

## 1. Bot Telegram API Calls

For bot `8716661547`:

- Lowest measured: 174 ms
- Highest measured: 3068 ms
- Average measured: 479.45 ms

## 2. Verification Flow

- Lowest measured: 341 ms
- Highest measured: 2714 ms
- Average measured: 1323.63 ms

## 3. Recent InsForge Bot-Facing Requests

Recent sample window:

- Lowest observed: 3 ms (`GET /health`)
- Typical fast operational reads/writes: about 24 ms to 137 ms
- Typical poll/sync reads: about 200 ms to 275 ms
- Highest observed in sampled bot-side operational requests: 300 ms (`PATCH /bot_status`)

If dashboard RPCs are included in the same recent sample:

- Highest observed: 569 ms (`POST /get_verification_distribution`)

## Root-Cause Conclusions

## Main Finding

The primary latency bottleneck is not InsForge REST.

The main cost is the bot’s end-to-end Telegram verification workflow, especially:

- multiple `getChatMember` checks
- moderation actions like `restrictChatMember`
- message operations such as `sendMessage` and `deleteMessage`
- multi-step orchestration in the verification path

## Why Verification Is Slower Than Raw API Calls

The verification average is about 1324 ms, while:

- `getChatMember` averages about 402 ms
- `answerCallbackQuery` averages about 363 ms
- `sendMessage` averages about 491 ms
- `restrictChatMember` averages about 746 ms

This strongly implies the verification path is accumulating several of these costs in sequence or partial sequence.

That matches the current implementation:

- contract resolution
- membership checks for all required channels
- cache logic
- optional retry logic for fresh verify propagation
- enforcement or recovery actions
- database logging

## Practical Performance Ranking

From slowest user-visible areas to fastest:

1. Full verification path
2. Moderation actions such as `restrictChatMember`
3. Group send/delete flows
4. Membership checks
5. Callback acknowledgement itself
6. Most InsForge writes/reads

## Limitations of Current Instrumentation

This report is accurate for currently instrumented telemetry, but there are important gaps:

1. No single end-to-end "update received -> user-visible response finished" metric exists.
2. `api_call_log` measures individual Telegram API methods, not full flows.
3. `verification_log` measures verification logic, but not every other command path.
4. InsForge request logs provide samples, not a built-in full percentile history per endpoint.

## Recommended Next Step

Add explicit end-to-end latency telemetry for the main user journeys:

1. Incoming command -> first reply sent
2. Verify button click -> callback answered
3. Verify button click -> user unmuted
4. Blocked group message -> message deleted
5. Blocked group message -> prompt sent
6. Join request -> approve/decline completed

That would let future reports give:

- true end-to-end min/max/avg/p95
- breakdown by stage
- comparison before and after each optimization

## Final Assessment

As of 2026-03-07:

- the bot’s raw Telegram API operations average about 479 ms
- the full verification flow averages about 1324 ms
- recent InsForge operational requests are mostly under 300 ms

Therefore, the current lowest-latency path is the simple backend/health and small operational requests, the highest-latency path is the full verification flow, and the biggest optimization target remains reducing Telegram-side round trips and total verification orchestration cost rather than blaming InsForge itself.
