# Active Context: Current State

## Current Status

**Date**: 2026-02-23
**Phase**: 66 — Full End-to-End Success (Bot + Web Working)
**Branch**: `main` (pushed `cf7cca7`)
**Quality**: Ruff ✅ 0 errors | Next.js build ✅ 0 errors | All tests ✅

---

## 🎉 Both Bot and Web Are Now Fully Working

The Nezuko Bot platform is **production-functional** end-to-end:

- ✅ Bot starts in dashboard mode, loads bot from InsForge DB
- ✅ StatusWriter heartbeats to `bot_status` every 30s (no more 401)
- ✅ CommandWorker polls `admin_commands` every 10s
- ✅ `/protect` command works — registers group + links channels
- ✅ Join detection → instant mute → verify button
- ✅ Verification flow → unmute on success
- ✅ Leave detection triggers re-mute
- ✅ Web dashboard reads all RPCs successfully (200 OK)
- ✅ Re-adding a deleted bot no longer fails (UPSERT fix)

---

## Phase 66: What Was Done (Final Bug Fixes)

### Bug 1 — `401 Unauthorized` on ALL Bot Writes (CRITICAL)

**Root cause**: `GRANT USAGE, SELECT ON ALL SEQUENCES` was never run after Phase 65 clean schema.

PostgreSQL requires **sequence grants separately from table grants**. When `CREATE TABLE` uses `SERIAL` PK, the bot's `INSERT` calls `nextval('table_id_seq')` internally. Without `USAGE` on that sequence, every INSERT by the `anon` role fails with `permission denied for sequence X_id_seq` — PostgREST returns this as `401`.

This affected ALL table writes: `bot_status`, `group_channel_links`, `verification_log`, `api_call_log`, `admin_logs`.

**Fix**: `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated`  
Also added to `insforge/migrations/009_clean_schema.sql` (permanent).

### Bug 2 — `409 Conflict` on `bot_status` UPSERT

**Root cause**: `Prefer: resolution=merge-duplicates` is ambiguous when a table has **multiple UNIQUE constraints** (`bot_id` AND `bot_instance_id`). PostgREST can't determine which to use.

**Fix**: Changed `status_writer.py` to **PATCH-then-POST** pattern:
1. Try `PATCH` (update existing row by `bot_id=eq.X`)
2. If `404` or `Content-Range: */0` → INSERT with `POST`

### Bug 3 — Re-adding a Deleted Bot Fails

**Root cause**: `manage-bot` Edge Function used plain `INSERT` → UNIQUE violation when same `bot_id` row exists soft-deleted.

**Fix**: Changed to `UPSERT` (`onConflict: 'bot_id'`) that also resets `is_deleted=false`, `is_active=true`, `deleted_at=null`.

---

## Architecture (Complete — 100% Working)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
                                                      ▲          ▲
                                                      │          │ WebSocket pushes
Bot Engine (Python) ──────► httpx REST ───────────────┘  DB triggers fire on:
         └─ insforge_client.py                              • verification_log INSERT → "verification"
         └─ status_writer.py      (PATCH→POST every 30s)   • bot_status CHANGE    → "status_changed"
         └─ insforge_log_handler.py                        • admin_logs INSERT     → "new_log"
         └─ verification_logger.py                         • admin_commands CHANGE → "command_updated"
         └─ api_call_logger.py
```

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be identical)
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (Fernet)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot` — latest push: `cf7cca7`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `python -m apps.bot.main` (or `./nezuko.bat`) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Remaining Minor Issues (Non-Blocking)

| Issue | Impact | Priority |
|---|---|---|
| Bot responds slowly (network latency to InsForge) | Minor UX delay | Low |
| `member_sync` disabled (APScheduler not configured) | Member counts not refreshed | Low |
| No RLS policies (all data accessible via anon key) | Security hardening needed | Medium |
| Edge Function uses `btoa()` instead of Fernet | Weak token encryption | Low |
| No global Telegram error handler in bot | Unhandled errors logged via PTB | Low |

---

## What to Work on Next

1. **Add global error handler** — register `error_handler` in `Application` to catch all unhandled exceptions gracefully
2. **Add RLS policies** — restrict `bot_instances` reads to owner, `admin_logs` to authenticated users
3. **Enable `member_sync`** — wire APScheduler job to run `sync_member_counts()` every 15min
4. **Improve bot response speed** — optimize InsForge queries, add Redis caching for group/channel lookups
5. **Commit ceremony** — tag Phase 66 release

---

_Last Updated: 2026-02-23 (Phase 66 — Full Success)_
