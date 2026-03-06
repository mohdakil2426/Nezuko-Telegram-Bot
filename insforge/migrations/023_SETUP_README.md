# InsForge Fresh DB Setup (grammY Primary Bot)

> **Updated**: 2026-03-06 · **Phase**: 97+ · **Audit**: all findings resolved (see `INSFORGE_FRESH_DB_AUDIT_REPORT.md`)

This folder contains a **clean rebuild baseline** for the Nezuko platform database, purpose-built for the grammY (TypeScript) primary bot.

| File | Purpose |
|---|---|
| `001_fresh_insforge_schema.sql` | Full drop + recreate of all DB objects |
| `README.md` | This document — execution guide and validation |

Canonical migration copy: `insforge/migrations/023_fresh_grammy_schema.sql`

---

## Why This Exists

This is a **single clean baseline** that replaces the entire incremental migration chain (`001` → `022`). Instead of carrying forward drift from PTB-era migrations, grammY starts from a clean, audited, production-hardened schema.

### Goals

- **Correctness** — schema contracts align with both grammY bot and web dashboard
- **Reliability** — realtime events, command worker, and heartbeat paths all wired up
- **Security** — RLS + least-privilege grants, secrets vault tightened
- **Performance** — composite indexes for analytics RPCs as data grows
- **Observability** — full telemetry tables with proper append-only design

---

## What This Migration Includes

### Tables (12 total)

| Table | Type | Purpose |
|---|---|---|
| `owners` | Mutable | Platform owner registry |
| `bot_instances` | Mutable | Bot tokens (encrypted) + lifecycle state |
| `protected_groups` | Mutable | Telegram groups guarded by the bot |
| `enforced_channels` | Mutable | Channels users must subscribe to |
| `group_channel_links` | Mutable | Many-to-many group↔channel associations |
| `bot_status` | Mutable | Per-bot heartbeat + uptime tracking |
| `admin_commands` | Mutable | Command queue: web → bot |
| `admin_config` | Mutable | Reserved platform config key/value pairs |
| `nezuko_secrets` | Mutable | AES-256-GCM master key vault |
| `verification_log` | Append-only | Every membership check event |
| `api_call_log` | Append-only | Telegram API call telemetry |
| `admin_logs` | Append-only | Structured bot log stream |

### Key Design Decisions

- **`BIGINT` for all Telegram IDs** — prevents `INT4` overflow (bot IDs can exceed 8.26B)
- **`BIGSERIAL` surrogate PKs** — `bot_instances.id`, `group_channel_links.id`, etc.
- **`bot_status.bot_instance_id` → `bot_instances(id)`** — correctly references surrogate PK, not `bot_id`
- **`'degraded'` in `bot_status` CHECK** — matches grammY graceful-degradation mode
- **PATCH-then-POST upsert** — `bot_status` has two UNIQUE columns; code must use PATCH-first to avoid PostgREST 409
- **Append-only fact tables** — `verification_log`, `api_call_log`, `admin_logs` have no `updated_at` trigger (rows are never mutated)
- **Denormalized counters** — `linked_channels_count` / `linked_groups_count` auto-recalculated by trigger on every `group_channel_links` write (never increment/decrement manually)
- **`nezuko_secrets` anon policy** — `anon` can only INSERT/UPDATE the `master_key` entry; arbitrary key injection is blocked

### Realtime Channels (5)

| Channel | Events Published |
|---|---|
| `dashboard` | `verification` (on every `verification_log` INSERT) |
| `bot_status` | `status_changed` (on every `bot_status` INSERT/UPDATE) |
| `logs` | `new_log` (ERROR / WARNING / INFO level only — DEBUG excluded intentionally) |
| `commands` | `command_updated` (on `admin_commands` status transition) |
| `bot_instances` | `bot_instance_changed` (on INSERT / UPDATE / DELETE) |

Plus `pg_notify('new_admin_command', bot_id)` for command worker WS listeners.

### Analytics RPCs (15)

All RPCs are `SECURITY DEFINER` + `SET search_path = public, pg_temp`. All return `COALESCE`-safe JSON (never `null`).

| RPC | Used By |
|---|---|
| `get_dashboard_stats()` | Dashboard stat cards |
| `get_verification_trends(p_period, p_granularity)` | Verification line chart |
| `get_user_growth(p_period, p_granularity)` | User growth chart (growth_rate now computed) |
| `get_verification_distribution()` | Verification donut chart |
| `get_cache_breakdown()` | Cache donut chart |
| `get_groups_status()` | Groups status donut |
| `get_api_calls_distribution()` | API methods bar chart |
| `get_hourly_activity()` | Hourly activity bar chart |
| `get_latency_distribution(p_period)` | Latency buckets bar chart |
| `get_top_groups(p_limit)` | Top groups bar chart |
| `get_cache_hit_rate_trend(p_period)` | Cache hit rate line chart |
| `get_latency_trend(p_period)` | Latency trend line chart |
| `get_bot_health()` | Bot health radial chart (weighted score) |
| `get_analytics_overview(p_period?)` | Analytics overview cards |
| `get_members_chart_data()` | Members interactive bar chart |

### Indexes (Performance)

Beyond standard single-column indexes, these composites are added for analytics query performance:

```sql
-- get_top_groups(): GROUP BY group_id + status filter + timestamp window
idx_vl_group_status_ts ON verification_log (group_id, status, timestamp DESC)

-- Log viewer: bot_id filter + timestamp sort
idx_admin_logs_bot_id_ts ON admin_logs (bot_id, timestamp DESC) WHERE bot_id IS NOT NULL
```

### Safety View

`bot_instances_safe` — excludes `token_encrypted` from all client reads. Used by the web dashboard Bots page.

---

## Audit Fixes Applied (vs Original Draft)

| Issue | Fix |
|---|---|
| `bot_status` CHECK missing `'degraded'` | Added — now matches grammY `UpsertBotStatusData` type |
| `bot_instance_id` FK pointed to `bot_instances.bot_id` | Fixed to `bot_instances(id)` (surrogate PK) |
| `nezuko_secrets` anon could INSERT any key | Restricted: `WITH CHECK (key_name = 'master_key')` |
| Missing composite index for `get_top_groups()` | Added `idx_vl_group_status_ts` |
| Missing composite index for log viewer | Added `idx_admin_logs_bot_id_ts` |
| `growth_rate` hardcoded to `0` | Now computes period-over-period rate |
| Unweighted health score | Weighted: uptime 35%, success 30%, latency 20%, cache 10%, error 5% |
| `admin_config` undocumented | `COMMENT ON TABLE` added |
| Append-only tables needed clarity | Inline `-- append-only fact table` comments added |

---

## grammY Bot ↔ DB Contract

| grammY Service | DB Operation | Notes |
|---|---|---|
| `status-writer.ts` | UPSERT `bot_status` (PATCH-then-POST) | `'degraded'` now valid in CHECK |
| `member-sync.ts` | PATCH `protected_groups.member_count` | `last_sync_at` updated |
| `member-sync.ts` | PATCH `enforced_channels.subscriber_count` | via `channel.repo.ts` |
| `command-worker.ts` | PATCH `admin_commands.status` | `pending → processing → completed/failed` |
| Composers | INSERT `verification_log` | triggers `verification` realtime event |
| `bot-factory.ts` | SELECT `bot_instances` (active, not deleted) | token decrypted in-process |
| `realtime-client.ts` | Subscribe `bot_status`, `commands`, `bot_instances` | Socket.IO WS |

> **grammY code fix needed**: Add `linked_channels_count: number` to `ProtectedGroup` interface in `apps/grammy/src/database/types.ts` — this field exists in the DB but was missing from the TypeScript type.

---

## Security Notes

- **`token_encrypted`** stays in `bot_instances`; protected by `bot_instances_safe` view for web reads
- **`nezuko_secrets`**: anon can read + write only the `master_key` entry — arbitrary key names are blocked by RLS policy
- **RLS enabled** on all 12 app-facing tables
- **SECURITY DEFINER + search_path** on every trigger function and RPC — prevents privilege escalation
- **Sequence grants** (`USAGE, SELECT ON ALL SEQUENCES`) — prevents 401 errors on INSERT into BIGSERIAL tables

---

## Pre-Run Data Backup

> ⚠️ **This migration is destructive.** The DROP sequence at the top removes all existing tables and data.

Export these before running:

```sql
-- Run in InsForge SQL editor or psql:
COPY public.owners TO '/tmp/owners_backup.csv' CSV HEADER;
COPY public.bot_instances TO '/tmp/bot_instances_backup.csv' CSV HEADER;
COPY public.protected_groups TO '/tmp/protected_groups_backup.csv' CSV HEADER;
COPY public.enforced_channels TO '/tmp/enforced_channels_backup.csv' CSV HEADER;
COPY public.group_channel_links TO '/tmp/group_channel_links_backup.csv' CSV HEADER;
COPY public.nezuko_secrets TO '/tmp/nezuko_secrets_backup.csv' CSV HEADER;
```

**Critical row to preserve**: `nezuko_secrets` contains the AES-256-GCM master key. Loss = all bot tokens become undecryptable.

---

## Execution

### Recommended Rollout

1. **Backup** — export the 6 critical tables above
2. **Staging** — run against staging InsForge backend first
3. **Validate** — run post-run checks below
4. **Production** — apply in maintenance window, restore data rows, run smoke tests

### Running the Script

Open the InsForge SQL editor (Dashboard → SQL) and paste the entire `001_fresh_insforge_schema.sql` content, then execute. The script is idempotent — safe to rerun on staging.

---

## Post-Run Validation Queries

```sql
-- 1. All 12 tables created
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
-- Expected: 12 rows

-- 2. All 15 RPCs exist
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
-- Expected: 15 rows

-- 3. All 5 realtime channels registered
SELECT pattern, enabled
FROM realtime.channels
WHERE pattern IN ('dashboard','bot_status','logs','commands','bot_instances')
ORDER BY pattern;
-- Expected: 5 rows, all enabled = true

-- 4. bot_status CHECK includes 'degraded'
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'public.bot_status'::regclass
  AND contype = 'c'
  AND conname LIKE '%status%';
-- Should include 'degraded' in the IN list

-- 5. bot_instance_id FK points to bot_instances(id)
SELECT ccu.column_name AS referenced_column
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = rc.unique_constraint_name
WHERE rc.constraint_name = 'bot_status_bot_instance_id_fkey';
-- Expected: id  (not bot_id)

-- 6. Composite indexes created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('verification_log','admin_logs')
  AND indexname IN ('idx_vl_group_status_ts','idx_admin_logs_bot_id_ts');
-- Expected: 2 rows
```

---

## Functional Smoke Test (After SQL Run)

- [ ] Bot starts without DB permission errors
- [ ] `bot_status` row appears within 30 seconds, `last_heartbeat` updates every 30s
- [ ] Status heartbeat can write `'degraded'` without CHECK violation
- [ ] Add/remove a group-channel link → `linked_channels_count` and `linked_groups_count` update automatically
- [ ] Create admin command (status=`pending`) → bot transitions to `processing` → `completed`/`failed`
- [ ] Insert verification event → row in `verification_log` + realtime event fires on `dashboard`
- [ ] Web dashboard: all 15 chart RPCs return valid JSON (empty `[]`/`{}` is acceptable)
- [ ] Realtime: Logs page shows activity without page refresh
- [ ] `bot_instances_safe` view excludes `token_encrypted`

---

## Rollback

This is a full-reset migration. Rollback = restore from backup taken in pre-run step.

If you need application-level rollback, restore the 6 backup CSVs and re-run the previous migration chain (`001`–`022`).

---

## Assumptions

- `realtime.channels` and `realtime.publish(...)` functions are available in your InsForge backend
- Roles `anon` and `authenticated` exist (standard InsForge setup)
- Optional `project_admin` policy is guarded in SQL (skipped if role doesn't exist)
- grammY bot runs with `DASHBOARD_MODE=true` and valid `INSFORGE_BASE_URL`, `INSFORGE_ANON_KEY`, `MASTER_KEY` env vars
