# InsForge Fresh DB Setup (Manual)

This folder contains a **clean rebuild migration** for the Nezuko platform database.

- Migration SQL: `001_fresh_insforge_schema.sql`
- Scope: full reset + recreate of app-facing DB objects used by bot/web
- Execution mode: **manual only** (not auto-run)

## Why this exists

This migration is intended to be a **single clean baseline** for the upcoming grammY bot build so you do not carry forward drift from older incremental migrations.

It focuses on:

- Correctness of schema contracts used by bot + dashboard.
- Runtime reliability for realtime events and command processing.
- Security posture (RLS + least-privilege grants).
- Analytics consistency (RPC response shapes expected by current UI/services).

## What this migration includes

- Full drop/recreate for core tables:
  - `owners`
  - `bot_instances`
  - `protected_groups`
  - `enforced_channels`
  - `group_channel_links`
  - `bot_status`
  - `admin_commands`
  - `verification_log`
  - `api_call_log`
  - `admin_logs`
  - `admin_config`
  - `nezuko_secrets`
- Telegram-safe IDs (`BIGINT`) on bot/group/channel/user identifiers.
- Denormalized counter support:
  - `protected_groups.linked_channels_count`
  - `enforced_channels.linked_groups_count`
  - automatic recalc trigger on `group_channel_links`.
- Realtime wiring:
  - channels registration (`dashboard`, `bot_status`, `logs`, `commands`, `bot_instances`)
  - trigger publishers for `verification`, `status_changed`, `new_log`, `command_updated`, `bot_instance_changed`
  - `pg_notify('new_admin_command', bot_id)` trigger for command worker listeners.
- Updated-at automation on mutable tables.
- Analytics RPCs expected by current web service layer:
  - `get_dashboard_stats`
  - `get_verification_trends`
  - `get_user_growth`
  - `get_verification_distribution`
  - `get_cache_breakdown`
  - `get_groups_status`
  - `get_api_calls_distribution`
  - `get_hourly_activity`
  - `get_latency_distribution`
  - `get_top_groups`
  - `get_cache_hit_rate_trend`
  - `get_latency_trend`
  - `get_bot_health`
  - `get_analytics_overview`
  - `get_members_chart_data`
- Grants + RLS policies for current bot/web operational paths.
- Sequence grants (`USAGE, SELECT`) for `anon` and `authenticated`.
- Safe view:
  - `bot_instances_safe` (excludes `token_encrypted`).

## Section-by-section map of the SQL

The SQL file is organized in this order:

1. **Clean drop/reset**
   - Drops dependent objects first (functions/views), then tables.
   - Makes reruns deterministic during staging/testing.
2. **Core schema creation**
   - Recreates all required tables with constraints and indexes.
   - Uses `BIGINT` for Telegram IDs (users/chats/channels/bots).
3. **Timestamp automation**
   - `updated_at` trigger function and table-specific triggers.
4. **Denormalized counter integrity**
   - Recalculation functions + trigger for `group_channel_links`.
   - Prevents link count drift on insert/update/delete.
5. **Realtime plumbing**
   - Channel registration + trigger functions for key events.
   - Emits: `verification`, `status_changed`, `command_updated`, `new_log`, `bot_instance_changed`.
6. **RPC contracts**
   - Creates analytics/dash RPCs consumed by services/hooks.
7. **Permissions and RLS**
   - Grants + policies for `anon` and `authenticated`.
   - Includes bot runtime write paths and dashboard reads.
8. **Safety view**
   - `bot_instances_safe` for non-secret bot metadata reads.

## Contract alignment notes

This script was aligned against:

- Current app usage in `apps/bot` and `apps/web` (table fields + RPC response shapes)
- Existing migrations `insforge/migrations/009` through `022`
- InsForge MCP docs (`instructions`, `db-sdk`, `real-time`)

## Edge cases this baseline is meant to prevent

- **Telegram ID overflow**: `BIGINT` avoids `INT4` overflow for large bot/chat IDs.
- **Heartbeat UPSERT issues**: bot status schema supports patch/insert heartbeat flow.
- **Broken command lifecycle**: `admin_commands` allows bot-side status transitions (`pending -> processing -> completed/failed`).
- **Realtime silence**: channels + triggers are created together so publish paths are not partially missing.
- **Counter drift**: group/channel link counters are recalculated, not blindly incremented/decremented.
- **RPC shape mismatch**: envelope and array output formats match current service expectations.
- **Insert 401s on serial keys**: sequence grants are included (`USAGE, SELECT`).

## grammY-specific relevance

For grammY bot architecture, this DB baseline directly supports:

- Multi-bot lifecycle tracking (`bot_instances`, `bot_status`).
- Membership verification telemetry (`verification_log`).
- Admin moderation command queueing (`admin_commands`).
- Operational observability (`admin_logs`, `api_call_log`).
- Realtime dashboard updates while bot is active.

What it does **not** do by itself:

- Flood control, retry semantics, or grammY middleware correctness.
- Token encryption/decryption logic in app code.
- Bot feature logic (conversations, menus, command handlers).

## Security notes

- `token_encrypted` remains in `bot_instances`; protect access paths at app/service level.
- `nezuko_secrets` has policies for server-side operational flows; do not expose anon keys client-side.
- RLS is enabled on all app-facing tables in this schema.
- `bot_instances_safe` exists for non-secret metadata reads.

## Manual execution order

1. Open your InsForge SQL editor (or psql against the target backend).
2. Run `001_fresh_insforge_schema.sql` as a single script.
3. Validate with the checks below.
4. Start bot + web and verify runtime behavior.

## Recommended rollout strategy

1. **Staging first**
   - Apply migration to staging.
   - Smoke test bot startup, command worker, and realtime events.
2. **Data backup before production**
   - Export critical tables (at minimum: `owners`, `bot_instances`, `protected_groups`, `enforced_channels`, `group_channel_links`, `nezuko_secrets`).
3. **Production maintenance window**
   - Apply SQL in controlled window.
   - Run validation queries and app smoke tests immediately.
4. **Post-deploy monitoring**
   - Watch `admin_logs`, bot heartbeats, and command processing for 15-30 minutes.

## Post-run validation checks

Use these quick checks after execution:

```sql
-- tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'owners','bot_instances','protected_groups','enforced_channels',
    'group_channel_links','bot_status','admin_commands',
    'verification_log','api_call_log','admin_logs',
    'admin_config','nezuko_secrets'
  )
ORDER BY tablename;

-- key RPCs exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_dashboard_stats','get_verification_trends','get_user_growth',
    'get_verification_distribution','get_cache_breakdown','get_groups_status',
    'get_api_calls_distribution','get_hourly_activity','get_latency_distribution',
    'get_top_groups','get_cache_hit_rate_trend','get_latency_trend',
    'get_bot_health','get_analytics_overview','get_members_chart_data'
  )
ORDER BY routine_name;

-- realtime channel patterns
SELECT pattern, enabled
FROM realtime.channels
WHERE pattern IN ('dashboard','bot_status','logs','commands','bot_instances')
ORDER BY pattern;
```

## Functional smoke-test checklist (after SQL run)

- Bot process starts without DB permission errors.
- `bot_status` row appears and `last_heartbeat` updates.
- Add/update/delete bot instance emits `bot_instance_changed`.
- Create a test admin command, verify bot moves status to `processing` then `completed`/`failed`.
- Insert a verification event and confirm:
  - row in `verification_log`
  - realtime event on `dashboard` channel
  - dashboard/activity queries reflect update
- Link/unlink group-channel and verify counters update correctly.
- `get_members_chart_data` returns `{ channels: [], groups: [] }` shape even with no data.

## Rollback guidance

This is a full reset migration, so rollback is typically:

1. Restore from backup/snapshot taken before execution.
2. Re-apply previous known-good migration chain.

If you need reversible deployments, maintain a separate export/import plan for critical data and secrets.

## Known assumptions

- `realtime.channels` and `realtime.publish(...)` are available in your InsForge backend.
- Roles `anon` and `authenticated` exist.
- Optional `project_admin` policy is guarded in SQL (created only if role exists).
- Application services expect current RPC names and response shapes.

## Important caution

- This migration is destructive by design and should be run only on a target you intentionally want to reset.
- If running against a non-empty production instance, export/backup data first.
