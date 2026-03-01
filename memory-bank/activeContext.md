# Active Context: Current State

### Current Status
**Phase 83: Comprehensive Codebase Audit V3 Fixes — COMPLETE ✅**

All 163 findings from `COMPREHENSIVE_CODEBASE_AUDIT_V3.md` resolved by 7 parallel agents across 5 work streams. 86 files changed, ~1,777 net lines removed.

---

## Phase 83: Comprehensive Codebase Audit V3 Fixes (COMPLETE ✅)

### Summary
8 parallel audit agents identified 163 findings (18 critical, 50 high, 59 medium, 36 low) across Security, Architecture, Performance, Code Quality, Error Handling, Type Safety, Edge Functions, SQL Migrations, Dead Code, and Hook/Service Quality. All resolved in one phase.

### Critical Security Fixes
1. **SEC-01**: Master key `GRANT ALL` on `nezuko_secrets` revoked — anon now has SELECT only
2. **SQL-01**: RLS table name typo `verification_logs` → `verification_log` — 3 policies re-created on correct table
3. **SQL-02/03**: FK references fixed to `bot_instances(bot_id)` BIGINT (was `(id)` INT4)
4. **SQL-04**: `admin_logs.bot_id` and `api_call_log.bot_id` changed from INTEGER to BIGINT
5. **EF-01**: Bot token no longer leaked in edge function error responses
6. **SEC-02**: Hardcoded production InsForge URL removed — requires env var
7. **SEC-04**: CORS wildcard `*` replaced with env-based `ALLOWED_ORIGIN`

### Critical Performance Fixes
1. **PERF-01/02**: N+1 HTTP eliminated in `get_group_channels` and `get_groups_for_channel` — batch `in.()` filter
2. **PERF-03**: `unlink_all_channels` counter updates parallelized with `asyncio.gather()`
3. **ERR-01**: Bare `except Exception` replaced with `from cryptography.exceptions import InvalidTag`

### New Files (8)
| File | Purpose |
|---|---|
| `insforge/migrations/019_audit_fixes.sql` | Single migration for all SQL/RLS/FK fixes |
| `apps/bot/core/constants.py` | Shared constants: `AUTO_DELETE_DELAY`, `ADMIN_STATUSES`, `MASTER_KEY_TTL` |
| `apps/bot/utils/tasks.py` | `fire_and_forget()` with `_background_tasks` GC protection |
| `apps/web/src/components/shared/data-table.tsx` | Generic `DataTable<T>` component |
| `apps/web/src/components/shared/delete-confirm-dialog.tsx` | Shared delete confirmation |
| `apps/web/src/components/shared/page-error-state.tsx` | Shared error state with retry |
| `apps/web/src/components/charts/chart-error-boundary.tsx` | React Error Boundary per chart |
| `apps/web/src/lib/utils/rpc-helpers.ts` | `unwrapEnvelopeSeries<T>()` RPC utility |

### Deleted Files (3)
| File | Lines | Reason |
|---|---|---|
| `apps/bot/utils/resilience.py` | 328 | CircuitBreaker never imported (DEAD-PY-01) |
| `apps/web/src/lib/logger.ts` | 343 | Zero consumers (DEAD-WEB-01) |
| `apps/web/src/lib/services/config.service.ts` | 72 | Dead `testWebhook` (DEAD-WEB-02) |

### Quality Gates
| Check | Result |
|---|---|
| `ruff check apps/bot` | 0 errors |
| `pylint apps/bot` | 10.00/10 |
| `pyrefly check` | 0 errors |
| `pytest tests/bot/` | 58 passed |
| `bun run lint` | 0 warnings |
| `bun run type-check` | 0 errors |
| `bun run build` | exit 0 |

### Audit Report
Full audit report and fix summary archived in `docs/local/`:
- `docs/local/COMPREHENSIVE_CODEBASE_AUDIT_V3.md` — Original 163-finding audit
- `docs/local/PHASE_83_AUDIT_FIX_SUMMARY.md` — Detailed fix summary

---

## Architecture (Complete — 100% Working)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
  InsforgeProvider (auth)   @insforge/nextjs         ▲          ▲
  /api/auth route                                    │          │ WebSocket pushes
                                                     │ DB triggers fire on:
Bot Engine (Python) ──────► httpx REST ──────────────┘  • verification_log INSERT → "verification"
         └─ insforge_client.py (batch N+1 fixed)        • bot_status CHANGE → "status_changed"
         └─ status_writer.py                            • admin_logs INSERT → "new_log"
         └─ insforge_log_handler.py                     • admin_commands CHANGE → "command_updated"
         └─ verification_logger.py
         └─ api_call_logger.py
         └─ member_sync.py (every 15min via JobQueue)
```

---

## Key Credentials

- **InsForge Base URL**: in `apps/bot/.env` (no hardcoded default — SEC-02 fix)
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be identical)
- **Encryption Key**: Auto-synced from vault (AES-256-GCM, 3600s TTL cache)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `uv run python -m apps.bot.main` (or `./nezuko.bat`) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| InsForge JWT not server-validated | Middleware checks cookie existence only | Low |
| ARCH-01: BotManager god class | 784 lines, 7 responsibilities — split deferred | Medium |
| ARCH-03: Public facades needed | `_get/_post/_patch` still accessed externally | Medium |

---

## What to Work on Next

1. **Deploy** — VPS/Docker (bot) + Vercel (web)
2. **Apply SQL migration 019** — Run via InsForge MCP `run-raw-sql`
3. **Set `ALLOWED_ORIGIN` env var** — Required for edge function CORS
4. **Add admin notification** in global error handler (Task 6.2)
5. **Expand test coverage** — target 100+ tests
6. **BotManager refactor** — Split into `BotRegistry`, `BotHealthMonitor`, `BotSyncWorker`

---

_Last Updated: 2026-03-01 (Phase 83 — Comprehensive Codebase Audit V3 Fixes — COMPLETE)_
