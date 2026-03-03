## ADDED Requirements

### Requirement: Bot Registry — Instance Storage
The system SHALL provide a `src/multi-bot/bot-registry.ts` module with a `BotRegistry` class that stores bot instances in a `Map<number, BotInstance>`. The `BotInstance` type SHALL include: `bot: Bot<NezukoContext>`, `runner: RunnerHandle`, `botId: number`, `token: string` (decrypted), `startedAt: Date`, `statusInterval: NodeJS.Timeout`, `syncInterval: NodeJS.Timeout`. Methods: `add(instance)`, `get(botId)`, `remove(botId)`, `getAll()`, `count()`, `has(botId)`.

#### Scenario: Bot instance is registered
- **WHEN** `registry.add(instance)` is called
- **THEN** the instance is stored and retrievable via `registry.get(botId)`

#### Scenario: Bot instance is removed
- **WHEN** `registry.remove(botId)` is called
- **THEN** `registry.has(botId)` returns `false` and `registry.count()` decreases by 1

#### Scenario: Registry provides all instances
- **WHEN** `registry.getAll()` is called
- **THEN** an array of all active `BotInstance` objects is returned

---

### Requirement: Bot Lifecycle Manager — Start/Stop/Restart
The system SHALL provide a `src/multi-bot/bot-lifecycle.ts` module with a `BotLifecycleManager` class. Methods: `startBot(config)` — creates a new bot (via `createBot`), starts `run()`, starts background services, adds to registry. `stopBot(botId)` — stops runner (`handle.stop()`), clears intervals, removes from registry, updates status to "offline" in DB. `restartBot(botId)` — calls `stopBot(botId)` then `startBot(config)`.

#### Scenario: Bot starts successfully
- **WHEN** `lifecycle.startBot(config)` is called with a valid token
- **THEN** bot is created, runner is started, background services are running, instance is registered

#### Scenario: Bot stops gracefully
- **WHEN** `lifecycle.stopBot(botId)` is called
- **THEN** runner stops accepting updates, in-flight updates are awaited (max 8s), intervals are cleared, status is set to "offline"

#### Scenario: Bot restart preserves no state
- **WHEN** `lifecycle.restartBot(botId)` is called
- **THEN** old instance is fully stopped, new instance starts fresh (no state carried over)

#### Scenario: Invalid token on start (EC-53)
- **WHEN** `startBot()` is called with an invalid/revoked token
- **THEN** `bot.api.getMe()` throws, error is logged, bot is NOT added to registry

#### Scenario: Token conflict (EC-54)
- **WHEN** `startBot()` is called but another process is already polling this token
- **THEN** `run()` receives 409 Conflict, bot is stopped and admin is warned

---

### Requirement: Bot Manager — Coordinator (Dashboard Mode)
The system SHALL provide a `src/multi-bot/bot-manager.ts` module with a `BotManager` class that coordinates bot operations triggered by the dashboard. It delegates to `BotRegistry` (storage) and `BotLifecycleManager` (operations). Methods: `initialize()` — fetch all active bots from DB, decrypt tokens, start each one. `handleCommand(command)` — process dashboard commands (start, stop, restart, update). `getStatus() → BotManagerStatus` — returns counts and per-bot status.

#### Scenario: Dashboard mode initialization
- **WHEN** `manager.initialize()` is called in DASHBOARD_MODE=true
- **THEN** all active bot instances from `bot_instances` table are fetched, tokens decrypted, and bots started

#### Scenario: Dashboard start command
- **WHEN** `manager.handleCommand({ type: "start", bot_id: 123 })` is received
- **THEN** bot 123 is started via lifecycle manager

#### Scenario: Dashboard stop command
- **WHEN** `manager.handleCommand({ type: "stop", bot_id: 123 })` is received
- **THEN** bot 123 is stopped via lifecycle manager and DB status updated

#### Scenario: Decryption failure skips bot (EC-55)
- **WHEN** token decryption fails for a bot (wrong key, corrupted cipher)
- **THEN** that bot is skipped, error is logged, other bots continue starting

---

### Requirement: AES-256-GCM Token Encryption
The system SHALL provide a `src/core/encryption.ts` module with a `decryptToken(encryptedToken, masterKey)` function. It SHALL support AES-256-GCM decryption (matching Python bot's `core/encryption.py`). The encrypted token format is `{iv}:{ciphertext}:{authTag}` (base64-encoded components). Master key is fetched from `nezuko_secrets` table (Security Vault pattern). No Base64 fallback (removed in Phase 95). On decryption failure, throw a descriptive error (never log the token content).

#### Scenario: Valid token decrypts correctly
- **WHEN** `decryptToken(encrypted, masterKey)` is called with matching key
- **THEN** the plaintext bot token is returned (format: `123456:ABC-DEF`)

#### Scenario: Wrong key throws
- **WHEN** `decryptToken()` is called with mismatched master key
- **THEN** a crypto error is thrown ("AES-GCM authentication tag invalid")

#### Scenario: Token content is never logged
- **WHEN** any error occurs during decryption
- **THEN** the error message does NOT contain the encrypted or plaintext token

---

### Requirement: InsForge Realtime Client (Socket.IO)
The system SHALL provide a `src/core/realtime-client.ts` module with an `InsForgeRealtimeClient` class using `socket.io-client` v4.8.3. Config: `auth: { token: anonKey }`, `transports: ["websocket"]` (no HTTP long-polling fallback), `reconnection: true`, `reconnectionDelay: 2000`, `reconnectionDelayMax: 60000`. Methods: `connect()` — returns `Promise<boolean>` (success/failure with 10s timeout), `subscribe(channel)` — emits `REALTIME_SUBSCRIBE` (NOT `call()` — EC: Socket.IO ACK timeout), `on<T>(event, handler)` — register event listener, `disconnect()` — unsubscribe all channels then disconnect. The client SHALL auto-reconnect on disconnect.

#### Scenario: Successful WebSocket connection
- **WHEN** `realtime.connect()` is called and InsForge is reachable
- **THEN** Socket.IO connects via WebSocket transport and returns `true`

#### Scenario: Connection timeout falls back gracefully
- **WHEN** InsForge Realtime is unreachable within 10 seconds
- **THEN** `connect()` returns `false` and bot uses 30s polling fallback

#### Scenario: Subscribe uses emit (not call)
- **WHEN** `realtime.subscribe("commands")` is called
- **THEN** `socket.emit("REALTIME_SUBSCRIBE", { channel: "commands" })` is used (no ACK expected)

#### Scenario: Auto-reconnect on disconnect
- **WHEN** WebSocket connection drops
- **THEN** Socket.IO reconnects automatically with exponential backoff (2s → 60s)

#### Scenario: Graceful disconnect unsubscribes first
- **WHEN** `realtime.disconnect()` is called
- **THEN** all subscribed channels receive `REALTIME_UNSUBSCRIBE` before socket disconnect

---

### Requirement: Realtime Event Processing
The system SHALL subscribe to `"commands"` and `"bot_instances"` channels. For `"command_updated"` events: if `status === "pending"` and `bot_id` matches, immediately process the command (bypass 30s poll). For `"bot_instance_changed"` events: if `bot_id` matches, trigger config reload or start/stop operation.

#### Scenario: Instant command dispatch via realtime
- **WHEN** dashboard creates a pending command for this bot
- **THEN** realtime event triggers immediate processing (not waiting for 30s poll)

#### Scenario: Bot config change via realtime
- **WHEN** dashboard updates a bot instance's configuration
- **THEN** `bot_instance_changed` event triggers config reload

#### Scenario: Events for other bots are ignored
- **WHEN** a `command_updated` event has `bot_id: 999` but this bot is `bot_id: 123`
- **THEN** the event is ignored

---

### Requirement: Command Worker Service
The system SHALL provide a `src/services/command-worker.ts` module that processes admin commands from the `admin_commands` table. In realtime mode: triggered instantly by `command_updated` events. In fallback mode: polls every 30 seconds. Commands include: `start`, `stop`, `restart` (bot lifecycle), `update_settings` (reload config). Each command is processed exactly once (set status to "processing" → execute → set status to "completed" or "failed").

#### Scenario: Command processed exactly once
- **WHEN** a pending command is received
- **THEN** status transitions: `pending` → `processing` → `completed` (or `failed`)

#### Scenario: Failed command is marked
- **WHEN** command execution throws an error
- **THEN** status is set to `"failed"` with error message in result field

#### Scenario: Fallback polling when WS is down
- **WHEN** WebSocket is not connected
- **THEN** command worker polls `admin_commands` every 30 seconds for pending commands

---

### Requirement: Dashboard Mode Detection
The system SHALL detect operating mode from `DASHBOARD_MODE` environment variable. When `true`: initialize `BotManager`, connect Realtime client, start all active bots from DB. When `false` (default): use single `BOT_TOKEN` from env, skip multi-bot infrastructure.

#### Scenario: Single-bot mode
- **WHEN** `DASHBOARD_MODE=false` (or unset) and `BOT_TOKEN` is set
- **THEN** one bot starts with the env token, no BotManager or Realtime client

#### Scenario: Dashboard mode
- **WHEN** `DASHBOARD_MODE=true`
- **THEN** BotManager initializes, all active bots start from DB, Realtime client connects
