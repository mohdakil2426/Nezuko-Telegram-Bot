# Design: Owner-Only Telegram Authentication & Multi-Bot Management

## Context

### Current State

- **Authentication**: Supabase email/password via `@supabase/ssr`
- **Authorization**: RBAC with Owner/Admin/Viewer roles in `admin_users` table
- **Bot Management**: Single bot configured via `.env` file
- **UI Framework**: 100% shadcn/ui components (New York style)
- **Database**: SQLite (dev) / PostgreSQL (prod) via SQLAlchemy 2.0

### Target State

- **Authentication**: Telegram Login Widget (one-click)
- **Authorization**: Single owner identified by Telegram ID
- **Bot Management**: Multiple bots stored in database, managed via UI
- **UI Framework**: Remains 100% shadcn/ui components

## Goals / Non-Goals

### Goals

1. Replace Supabase login with Telegram Login Widget
2. Restrict dashboard access to single owner (by Telegram ID)
3. Create Bot Management page for adding/managing multiple bots
4. Store bot tokens securely (encrypted at rest)
5. Maintain 100% shadcn/ui consistency
6. Keep existing bot functionality intact

### Non-Goals

1. ~~Multi-user access~~ - Single owner only
2. ~~Telegram Mini App~~ - Standard web dashboard
3. ~~OAuth with other providers~~ - Telegram only
4. ~~Bot analytics per bot~~ - Future enhancement (current analytics stay global)

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────────────┐
│ Login Page   │────▶│ Telegram Widget     │────▶│ User confirms in Telegram    │
│ (Next.js)    │     │ (@NezukoBot)        │     │ (Mobile/Desktop app)         │
└──────────────┘     └─────────────────────┘     └───────────────┬──────────────┘
                                                                  │
                     ┌─────────────────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Telegram returns signed data to browser:                                         │
│ { id, first_name, last_name, username, photo_url, auth_date, hash }             │
└───────────────────────────────────┬──────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ POST /api/v1/auth/telegram                                                       │
│                                                                                  │
│ 1. Verify HMAC-SHA256 hash using LOGIN_BOT_TOKEN                                │
│ 2. Check auth_date is within 5 minutes (prevent replay)                         │
│ 3. Compare id with BOT_OWNER_TELEGRAM_ID                                        │
│    ✓ Match → Create session, return token                                       │
│    ✗ No match → Return 403 "Owner only"                                         │
└───────────────────────────────────┬──────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Session stored in database (sessions table)                                      │
│ HTTP-only cookie set with session ID                                            │
│ Redirect to /dashboard                                                          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Component Design

#### 1. Telegram Login Widget Component

**Location**: `apps/web/src/components/auth/telegram-login.tsx`

**Behavior**:

- Renders official Telegram widget script
- Receives callback with signed auth data
- Passes data to parent component for API submission

**Props**:

- `botName: string` - Telegram bot username (without @)
- `onAuth: (user: TelegramUser) => void` - Callback on success
- `buttonSize?: 'small' | 'medium' | 'large'`
- `cornerRadius?: number`

#### 2. Login Page Redesign

**Location**: `apps/web/src/app/login/page.tsx`

**Layout** (using shadcn/ui):

- `Card` component for centered login box
- Bot logo/brand at top
- Telegram Login Widget centered
- "Owner access only" disclaimer text
- Glass effect background (existing theme)

#### 3. Session Middleware

**Location**: `apps/web/src/proxy.ts`

**Changes**:

- Remove Supabase auth checks
- Add session cookie validation
- Validate session against database
- Redirect to /login if invalid/expired

#### 4. Auth API Endpoint

**Location**: `apps/api/src/api/v1/endpoints/telegram_auth.py`

**Endpoints**:
| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/auth/telegram` | Verify Telegram login, create session |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/me` | Get current owner info from session |

**Verification Algorithm**:

1. Sort received fields alphabetically (except hash)
2. Concatenate as `key=value\n` pairs
3. Compute `HMAC-SHA256(data_check_string, SHA256(BOT_TOKEN))`
4. Compare with received hash (timing-safe comparison)
5. Check `auth_date` is within 300 seconds of current time

#### 5. Bot Management Page

**Location**: `apps/web/src/app/dashboard/bots/page.tsx`

**UI Components** (all shadcn/ui):

- `PageHeader` - "My Bots" title with gradient
- `Button` - "Add Bot" action
- `Card` - Bot list items
- `Table` - Bot details (username, status, groups, actions)
- `Badge` - Status indicators (active, paused, error)
- `Dialog` - Add/Edit bot modals
- `Input` - Bot token input
- `AlertDialog` - Delete confirmation

**Bot Card Layout**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 @NezukoBot                              [Active] ● [⋮ Menu]  │
│    Nezuko Protection Bot                                        │
│    ─────────────────────────────────────────────────────────────│
│    Groups: 5  │  Channels: 3  │  Added: Feb 1, 2026            │
└─────────────────────────────────────────────────────────────────┘
```

#### 6. Add Bot Modal

**Components**:

- `Dialog` with `DialogContent`, `DialogHeader`, `DialogTitle`
- `Input` for bot token (masked/password style)
- `Button` to submit
- Loading state while fetching bot info
- Error handling for invalid tokens

**Flow**:

1. Owner pastes bot token
2. Click "Verify & Add"
3. API calls Telegram `getMe` to fetch bot info
4. Show bot name/username for confirmation
5. On confirm, encrypt and store token
6. Show success toast, refresh list

#### 7. Bot Instances Model

**Location**: `apps/api/src/models/bot_instance.py`

**Fields**:
| Column | Type | Description |
|:-------|:-----|:------------|
| `id` | Integer | Primary key, auto-increment |
| `owner_telegram_id` | BigInteger | Owner who added this bot |
| `bot_id` | BigInteger | Telegram bot user ID |
| `bot_username` | String(255) | @username of bot |
| `bot_name` | String(255) | Display name of bot |
| `token_encrypted` | Text | Fernet-encrypted bot token |
| `is_active` | Boolean | Whether bot is enabled |
| `created_at` | DateTime | When added |
| `updated_at` | DateTime | Last modified |

#### 8. Token Encryption

**Library**: `cryptography.fernet`

**Key Management**:

- `ENCRYPTION_KEY` in environment variables
- Generate with `Fernet.generate_key()`
- Store securely, never commit to repo

**Functions**:

- `encrypt_token(plaintext: str) -> str` - Encrypt bot token
- `decrypt_token(ciphertext: str) -> str` - Decrypt for use

#### 9. Bot Management API

**Location**: `apps/api/src/api/v1/endpoints/bots.py`

**Endpoints**:
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/bots` | List all bots for owner |
| POST | `/bots` | Add new bot (token in body) |
| GET | `/bots/{id}` | Get bot details |
| PATCH | `/bots/{id}` | Update bot (toggle active) |
| DELETE | `/bots/{id}` | Remove bot |
| POST | `/bots/{id}/verify` | Test bot token validity |

### Database Schema Changes

**New Table: `sessions`**

```sql
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    telegram_name VARCHAR(255),
    telegram_photo_url TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_telegram_id ON sessions(telegram_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**New Table: `bot_instances`**

```sql
CREATE TABLE bot_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_telegram_id BIGINT NOT NULL,
    bot_id BIGINT NOT NULL UNIQUE,
    bot_username VARCHAR(255) NOT NULL,
    bot_name VARCHAR(255),
    token_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bot_instances_owner ON bot_instances(owner_telegram_id);
```

### Real-Time Architecture (Server-Sent Events)

#### Why SSE over WebSocket?

| Factor         | SSE                     | WebSocket              |
| :------------- | :---------------------- | :--------------------- |
| Complexity     | Simpler                 | More complex           |
| Direction      | One-way (server→client) | Two-way                |
| Auto-reconnect | Built-in                | Manual                 |
| Use case       | Perfect for live feeds  | Overkill for dashboard |

**Decision**: Use SSE for real-time updates.

#### Real-Time Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              REAL-TIME EVENT FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐     ┌──────────────────┐     ┌──────────────────────────────────┐
│ Bot Action     │────▶│ Event Publisher  │────▶│ EventBus (in-memory queue)       │
│ (Verification) │     │ (API Service)    │     │                                  │
└────────────────┘     └──────────────────┘     └──────────────┬───────────────────┘
                                                               │
                                                               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ GET /api/v1/events/stream                                                      │
│ Content-Type: text/event-stream                                                │
│                                                                                │
│ - Validates session                                                            │
│ - Subscribes to EventBus                                                       │
│ - Streams events as they arrive                                                │
│ - Sends heartbeat every 30s                                                    │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard (React)                                                              │
│                                                                                │
│ - EventSource connects to SSE endpoint                                         │
│ - Receives events: activity, analytics, log, stats                            │
│ - Updates UI in real-time                                                     │
│ - Shows connection status (🟢 Live / 🟡 Reconnecting / 🔴 Offline)            │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### Event Types

| Event Type  | Data Structure                                   | Used By            |
| :---------- | :----------------------------------------------- | :----------------- |
| `activity`  | `{ type, message, timestamp, bot_id, group_id }` | Activity feed      |
| `analytics` | `{ metric, value, change }`                      | Dashboard counters |
| `log`       | `{ level, message, timestamp, source }`          | Logs page          |
| `stats`     | `{ group_id, member_count, pending_count }`      | Group details      |

#### SSE Endpoint Design

**Location**: `apps/api/src/api/v1/endpoints/events.py`

**Endpoint**: `GET /events/stream`

**Response Headers**:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format**:

```
event: activity
data: {"type": "verification", "message": "User @john verified", "timestamp": "..."}

event: heartbeat
data: {"ts": 1707067840}
```

#### Frontend EventSource Hook

**Location**: `apps/web/src/lib/hooks/use-realtime.ts`

**Features**:

- Creates EventSource connection on mount
- Auto-reconnects with exponential backoff
- Parses and types events
- Provides connection status
- Cleans up on unmount

### Environment Variables

**New Variables**:
| Variable | Location | Description |
|:---------|:---------|:------------|
| `LOGIN_BOT_TOKEN` | `apps/api/.env` | Bot token for login verification |
| `BOT_OWNER_TELEGRAM_ID` | `apps/api/.env` | Owner's Telegram user ID |
| `ENCRYPTION_KEY` | `apps/api/.env` | Fernet key for token encryption |
| `SESSION_EXPIRY_HOURS` | `apps/api/.env` | Session duration (default: 24) |

## Risks / Trade-offs

### Risks

| Risk                      | Likelihood | Impact   | Mitigation                          |
| :------------------------ | :--------- | :------- | :---------------------------------- |
| Telegram API downtime     | Low        | High     | Clear error message, user retries   |
| Token encryption key loss | Low        | Critical | Document key backup process         |
| Session hijacking         | Low        | High     | HTTP-only, Secure, SameSite cookies |
| Local dev complexity      | Medium     | Medium   | Document ngrok setup for HTTPS      |

### Trade-offs

| Trade-off                                  | Decision       | Rationale                                           |
| :----------------------------------------- | :------------- | :-------------------------------------------------- |
| Supabase vs Custom session                 | Custom session | Simpler, Telegram-native, no extra service          |
| Individual bot processes vs Single process | Future scope   | Keep arch simple for now, single bot runs at a time |
| Real-time bot status                       | Deferred       | Add polling/websocket later if needed               |

## Implementation Phases

### Phase 1: Authentication Infrastructure (Priority: Critical)

- Add environment variables
- Create Telegram auth verification endpoint
- Create session model and storage
- Update proxy.ts for session validation

### Phase 2: Login UI (Priority: Critical)

- Create TelegramLogin component
- Redesign login page with Telegram widget
- Handle auth callback and redirect
- Add error handling and loading states

### Phase 3: Bot Management Backend (Priority: High)

- Create BotInstance model
- Implement token encryption service
- Create bots CRUD endpoints
- Add Telegram API integration (getMe)

### Phase 4: Bot Management UI (Priority: High)

- Create /dashboard/bots page
- Build bot list with cards
- Implement Add Bot dialog
- Add edit/delete functionality
- Update sidebar navigation

### Phase 5: Testing & Polish (Priority: Medium)

- Test full login flow
- Test bot add/remove flow
- Verify token encryption
- Mobile responsiveness check
- Documentation update

## Dependencies

### External

- Telegram Bot API (getMe endpoint)
- Telegram Login Widget script

### Internal

- Current shadcn/ui component library
- Existing database infrastructure
- Current session/cookie handling in Next.js

## Success Metrics

1. Login via Telegram works in < 5 seconds
2. Bot token encryption verified secure
3. All UI passes shadcn/ui consistency check
4. No regressions in existing functionality
5. Mobile-responsive on all new pages
