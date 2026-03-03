## ADDED Requirements

### Requirement: Dockerfile — 3-Stage Build
The system SHALL provide a `Dockerfile` at `apps/grammy/Dockerfile` with 3 stages: (1) `deps` stage using `oven/bun:1.2` — copies `package.json` + `bun.lock`, runs `bun install --frozen-lockfile`, (2) `builder` stage using `node:22-slim` — copies source and node_modules, runs `npm run build` (tsc), (3) `runner` stage using `node:22-slim` — copies `dist/`, `node_modules/`, `package.json`, sets `NODE_ENV=production`, CMD `["node", "dist/main.js"]`. Final image target: ~120MB.

#### Scenario: Docker build succeeds
- **WHEN** `docker build -t nezuko-grammy apps/grammy/` is executed
- **THEN** the image builds successfully through all 3 stages

#### Scenario: Production image is slim
- **WHEN** the final Docker image is inspected
- **THEN** it is based on `node:22-slim` (not `node:22`), contains only `dist/` and production `node_modules/`

#### Scenario: Container starts and runs
- **WHEN** the Docker container is started with required ENV vars
- **THEN** `node dist/main.js` starts the bot successfully

---

### Requirement: .dockerignore
The system SHALL provide a `.dockerignore` at `apps/grammy/.dockerignore` excluding: `node_modules`, `.git`, `tests`, `docs`, `.env`, `*.md`, `vitest.config.ts`, `.github`, `dist` (built inside Docker).

#### Scenario: Docker context is minimal
- **WHEN** Docker build context is assembled
- **THEN** `node_modules/`, `tests/`, and `.git/` are excluded, reducing context size

---

### Requirement: GitHub Actions CI Workflow
The system SHALL provide `.github/workflows/grammy-ci.yml` triggered on push/PR to `main` when files in `apps/grammy/**` change. Jobs: (1) **Lint**: ESLint with `--max-warnings 0`, (2) **Type Check**: `tsc --noEmit` with 0 errors, (3) **Test**: `vitest run` with all tests passing, (4) **Docker Build**: `docker build` completes without errors. Matrix: Node.js 22.x. Working directory: `apps/grammy/`.

#### Scenario: CI runs on grammy changes
- **WHEN** a push to `main` changes `apps/grammy/src/services/verification.ts`
- **THEN** the CI workflow runs all 4 jobs

#### Scenario: CI skips on web changes
- **WHEN** a push only changes `apps/web/src/components/Chart.tsx`
- **THEN** the grammy CI workflow does NOT run (path filter)

#### Scenario: Lint failure blocks merge
- **WHEN** ESLint reports warnings
- **THEN** the CI job fails (due to `--max-warnings 0`)

#### Scenario: Type error blocks merge
- **WHEN** `tsc --noEmit` reports errors
- **THEN** the CI job fails

---

### Requirement: Graceful Shutdown Handler
The system SHALL provide a `src/core/shutdown.ts` module with a `setupShutdown(handle, deps)` function. It SHALL register `process.once("SIGINT")` and `process.once("SIGTERM")` handlers that execute the 4-step shutdown: (1) `handle.stop()` — stop accepting new updates, (2) `await Promise.race([handle.task(), timeout(SHUTDOWN_TIMEOUT_MS)])` — wait for in-flight (max 8s), (3) `await Promise.allSettled([db.upsertBotStatus(botId, "offline"), cache.quit()])` — cleanup, (4) `process.exit(0)`. `SHUTDOWN_TIMEOUT_MS` is 8000 (Docker sends SIGKILL at 10s).

#### Scenario: SIGTERM triggers graceful shutdown
- **WHEN** container receives SIGTERM
- **THEN** bot stops accepting updates, waits for in-flight, cleans up, exits with code 0

#### Scenario: SIGINT triggers graceful shutdown
- **WHEN** developer presses Ctrl+C
- **THEN** same 4-step shutdown sequence runs

#### Scenario: Long-running update times out
- **WHEN** an update handler takes >8 seconds during shutdown
- **THEN** the shutdown proceeds anyway (timeout race completes)

#### Scenario: Status is set to offline
- **WHEN** shutdown completes
- **THEN** `bot_status` table has `status: "offline"` for this bot

---

### Requirement: HTTP Health Endpoint
The system SHALL provide a `src/utils/health.ts` module with a `startHealthServer(port)` function that creates a minimal HTTP server responding to `GET /health` with `200 OK` and JSON body `{ status: "ok", uptime: number }`. The server SHALL listen on the configured `HEALTH_PORT` (default 8080). This endpoint is used by Docker health checks and Kubernetes liveness probes.

#### Scenario: Health endpoint responds
- **WHEN** `GET /health` is requested
- **THEN** response is `200 OK` with `{ "status": "ok", "uptime": <seconds> }`

#### Scenario: Docker health check
- **WHEN** Docker runs `HEALTHCHECK CMD curl -f http://localhost:8080/health`
- **THEN** the container is marked as healthy when the endpoint responds 200

---

### Requirement: Entry Point — main.ts Wire-Up
The system SHALL provide `src/main.ts` as the entry point that wires everything together: (1) Load and validate config (Zod), (2) Create logger (pino), (3) Create InsForge REST client, (4) Create Redis cache, (5) Create bot (via `createBot`), (6) Start background services (statusWriter, memberSync, healthServer), (7) If DASHBOARD_MODE: initialize BotManager + Realtime client, otherwise start single bot with `run()`, (8) Setup graceful shutdown, (9) Log startup completion with bot username and ID. The main function SHALL catch and log any startup errors.

#### Scenario: Single-bot mode startup
- **WHEN** `DASHBOARD_MODE=false` and all env vars are set
- **THEN** bot starts, background services run, health endpoint responds, "Bot @username started" is logged

#### Scenario: Dashboard mode startup
- **WHEN** `DASHBOARD_MODE=true`
- **THEN** BotManager initializes all active bots from DB, Realtime connects, background services per-bot run

#### Scenario: Startup error is caught
- **WHEN** `BOT_TOKEN` is invalid and `getMe()` fails
- **THEN** error is logged with stack trace and process exits with code 1

---

### Requirement: Auto-Delete Utility
The system SHALL provide `src/utils/auto-delete.ts` with a `scheduleDelete(msg, delayMs)` function that schedules a message deletion after the specified delay using `setTimeout`. The deletion SHALL catch all errors silently (message may have been manually deleted, or be older than 48 hours — EC-70). The timeout handle SHALL NOT prevent Node.js process exit (use `unref()`).

#### Scenario: Message is auto-deleted after delay
- **WHEN** `scheduleDelete(msg, 300_000)` is called (5 minutes)
- **THEN** `msg.delete()` is called after 5 minutes

#### Scenario: Already-deleted message is handled (EC-70)
- **WHEN** the message was manually deleted before the timer fires
- **THEN** the 400 error from `delete()` is caught silently

#### Scenario: Timer does not prevent shutdown
- **WHEN** the process receives SIGTERM while a delete timer is pending
- **THEN** the process can exit without waiting for the timer (due to `unref()`)

---

### Requirement: User-Facing Message Strings
The system SHALL provide `src/utils/messages.ts` with all user-facing message strings in one file. This includes: welcome messages, error messages, verification prompts, success confirmations, command responses, and help text. All messages SHALL use HTML formatting (compatible with `parse-mode` plugin). The tone SHALL be friendly with emoji (matching PTB bot style — Decision #31).

#### Scenario: All messages are centralized
- **WHEN** a handler needs to send a user-facing message
- **THEN** the message text is imported from `messages.ts` (not hardcoded in the handler)

#### Scenario: Messages use HTML formatting
- **WHEN** a welcome message is sent
- **THEN** it contains HTML tags like `<b>`, `<code>`, and inline markup
