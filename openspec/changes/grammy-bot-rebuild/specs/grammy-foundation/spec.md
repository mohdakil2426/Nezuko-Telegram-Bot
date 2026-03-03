## ADDED Requirements

### Requirement: Project Initialization
The system SHALL provide a complete `package.json` at `apps/grammy/package.json` with exact pinned dependency versions (no `^` or `~`), ESM module type (`"type": "module"`), and scripts for `dev`, `build`, `start`, `type-check`, `lint`, `test`, `test:watch`, and `test:coverage`.

#### Scenario: Package manifest is valid
- **WHEN** `bun install` is run in `apps/grammy/`
- **THEN** all 13 production dependencies and 6 dev dependencies install without errors and lockfile is generated

#### Scenario: Dev server starts with watch mode
- **WHEN** `bun run dev` is executed
- **THEN** the bot starts with Bun's `--watch` flag and auto-restarts on file changes

#### Scenario: Production build succeeds
- **WHEN** `bun run build` is executed
- **THEN** TypeScript compiles to `dist/` via `tsc -p tsconfig.build.json` with zero errors

---

### Requirement: TypeScript Configuration
The system SHALL provide `tsconfig.json` with strict mode enabled, `target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, and all strict checks (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`). A separate `tsconfig.build.json` SHALL exclude tests and dev files.

#### Scenario: Strict type checking passes
- **WHEN** `bun run type-check` (tsc --noEmit) is executed
- **THEN** zero type errors are reported

#### Scenario: Build config excludes tests
- **WHEN** `tsc -p tsconfig.build.json` is executed
- **THEN** files in `tests/` directory are NOT compiled into `dist/`

---

### Requirement: Environment Configuration with Zod Validation
The system SHALL provide a `src/config.ts` module that loads environment variables from `process.env` and validates them using `zod` v4.3.6. The config schema SHALL require: `BOT_TOKEN` (string), `REDIS_URL` (string, default `redis://localhost:6379`), `INSFORGE_BASE_URL` (string URL), `INSFORGE_ANON_KEY` (string). Optional: `LOG_LEVEL` (enum: `debug|info|warn|error`, default `info`), `HEALTH_PORT` (number, default `8080`), `DASHBOARD_MODE` (boolean, default `false`), `MASTER_KEY` (optional string).

#### Scenario: Valid environment loads successfully
- **WHEN** all required environment variables are set
- **THEN** `loadConfig()` returns a strongly-typed `Config` object with all values populated

#### Scenario: Missing required variable throws at startup
- **WHEN** `BOT_TOKEN` environment variable is not set
- **THEN** `loadConfig()` throws a `ZodError` with a descriptive message naming the missing variable

#### Scenario: Invalid LOG_LEVEL is rejected
- **WHEN** `LOG_LEVEL` is set to `"verbose"` (not in enum)
- **THEN** `loadConfig()` throws with validation error listing allowed values

#### Scenario: Defaults are applied for optional variables
- **WHEN** `REDIS_URL` and `HEALTH_PORT` are not set
- **THEN** config contains `redisUrl: "redis://localhost:6379"` and `healthPort: 8080`

---

### Requirement: NezukoContext Custom Type
The system SHALL define a `NezukoContext` type at `src/types.ts` that composes: `ParseModeFlavor<HydrateFlavor<Context & NezukoContextFlavor & CommandsFlavor & ChatMembersFlavor>>`. The `NezukoContextFlavor` interface SHALL include properties: `db: InsForgeClient`, `cache: CacheClient`, `botId: number`, `log: Logger`.

#### Scenario: Custom context type is valid
- **WHEN** a handler receives `ctx: NezukoContext`
- **THEN** `ctx.db`, `ctx.cache`, `ctx.botId`, and `ctx.log` are available with correct types

#### Scenario: Filter query narrows context type
- **WHEN** `bot.on("message:text", (ctx) => { ... })` is used
- **THEN** TypeScript guarantees `ctx.msg.text` is `string` (not `string | undefined`)

#### Scenario: Hydrate flavor enables method shortcuts
- **WHEN** `const msg = await ctx.reply("test")` is called
- **THEN** `msg.editText("updated")` and `msg.delete()` are available as methods

---

### Requirement: Structured Logger (pino)
The system SHALL provide a `src/utils/logger.ts` module that creates a `pino` v10 logger with JSON output in production and `pino-pretty` formatting in development (when `NODE_ENV !== "production"`). The logger SHALL support child loggers scoped by `module` and `updateId` fields.

#### Scenario: Production log format is JSON
- **WHEN** `NODE_ENV=production` and logger.info("test") is called
- **THEN** output is a single-line JSON object with `level`, `time`, `msg`, and `pid` fields

#### Scenario: Development log format is human-readable
- **WHEN** `NODE_ENV=development` and logger.info("test") is called
- **THEN** output is formatted with colors and timestamps via pino-pretty

#### Scenario: Child logger scopes module name
- **WHEN** `logger.child({ module: "verification" })` is used
- **THEN** all log entries from that child include `"module": "verification"` field

---

### Requirement: Shared Constants
The system SHALL provide a `src/core/constants.ts` module exporting: `AUTO_DELETE_DELAY` (number, seconds), `MAX_CHANNELS_PER_GROUP` (number, default 5), `VALID_MEMBER_STATUSES` (readonly array: `["member", "administrator", "creator", "restricted"]`), `ADMIN_STATUSES` (readonly array: `["administrator", "creator"]`), `CACHE_NAMESPACES` (object with `VERIFIED`, `MEMBER`, `DEBOUNCE` keys), `INTERVALS` (object with `STATUS_HEARTBEAT: 30_000`, `MEMBER_SYNC: 900_000`, `VERIFY_DEBOUNCE: 3`), and `SHUTDOWN_TIMEOUT_MS` (8_000).

#### Scenario: Constants are imported without runtime overhead
- **WHEN** `import { MAX_CHANNELS_PER_GROUP } from "../core/constants"` is used
- **THEN** the value `5` is available as a compile-time constant

#### Scenario: VALID_MEMBER_STATUSES includes restricted
- **WHEN** a `getChatMember` response returns status `"restricted"`
- **THEN** `VALID_MEMBER_STATUSES.includes("restricted")` returns `true` (EC-43)

---

### Requirement: Environment Template
The system SHALL provide a `.env.example` file documenting all environment variables with comments explaining purpose, required vs optional status, and example values. This file SHALL NOT contain real tokens or keys.

#### Scenario: .env.example documents all variables
- **WHEN** a developer reads `.env.example`
- **THEN** every variable accepted by `loadConfig()` is listed with description and example
