# System Patterns: Nezuko - The Ultimate All-In-One Bot

## System Architecture
Nezuko is built as a modular, event-driven monolith designed for high performance and horizontal scalability.

### Core Architecture Components
1.  **Event Processor**: Built on `python-telegram-bot` v22+, using `concurrent_updates` for asynchronous processing of Telegram's MTProto stream.
2.  **Multi-Tenant Intelligence**: A database-driven logic layer that looks up group-channel links in real-time, allowing one bot instance to serve unlimited independent groups.
3.  **Hybrid Caching Layer**:
    *   **External**: Redis for distributed state and membership caching across multiple bot instances.
    *   **Local**: In-memory caching for extremely fast lookups of hot configuration data.
4.  **Resilience Engine**: Implements Circuit Breakers, Exponential Backoff, and Graceful Degradation (e.g., bot continues to work via direct API calls if Redis is unavailable).

## Technical Patterns

### 1. Zero-Trust Enforcement
*   **Proactive**: Intercepts `ChatMemberUpdated` and `NewChatMembers` events to restrict users *before* they even try to speak.
*   **Reactive**: Checks every message against the cache/API to ensure compliance for existing members.
*   **Strict Leave**: Real-time monitoring of channel leave events to revoke access immediately.

### 2. High-Performance Verification Flow
*   **Query Path**: Check local cache → Check Redis → Telegram API → Write to Redis → Grant Access.
*   **Multi-Channel Logic**: Supports "AND" logic where a user must be a member of all linked channels to gain permission.
*   **Rate-Limit Management**: Intelligent `AIORateLimiter` capped at 25msg/sec to prevent bans while maintaining high throughput.

### 3. Database Schema
*   **Owners**: Tracks administrative users.
*   **ProtectedGroups**: Stores group-specific settings and state.
*   **EnforcedChannels**: Unified channel metadata for deduplication.
*   **GroupChannelLinks**: M:N mapping for complex protection scenarios.

## Design Principles
*   **stateless Instances**: All critical state is in PostgreSQL/Redis, allowing new bot instances to be spun up instantly.
*   **Observable by Default**: Integrated Prometheus metrics, structured logging (JSON for prod), and Sentry error tracking.
*   **Premium UX**: All user-facing strings use consistent emoji-rich formatting and interactive inline keyboards.

## Standards & Quality
*   **Code Quality**: Strict adherence to Pylint (Score: 10.00/10).
*   **Lazy Logging**: Using `%` formatting for performance in logger calls.
*   **Async-First**: Native `asyncIO` from the database driver up to the handler logic.

---

## Admin Panel Patterns (Planned)

### Architecture Pattern: Decoupled Full-Stack
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js 16     │────▶│  FastAPI        │────▶│  PostgreSQL     │
│  (Frontend)     │     │  (API)          │     │  + Redis        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Telegram Bot   │
                        │  (Existing)     │
                        └─────────────────┘
```

### Error Handling Pattern: RFC 9457 Problem Details
```json
{
  "type": "https://api.nezuko.bot/errors/auth/invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The provided email or password is incorrect.",
  "code": "AUTH_001",
  "trace_id": "abc123-def456"
}
```

### Logging Pattern: Structlog + JSON
```python
logger.info(
    "user_login_success",
    user_id="uuid-123",
    email="user@example.com",
    ip_address="192.168.1.1",
    trace_id=get_trace_id(),
)
```

### Resilience Patterns
1.  **Retry with Exponential Backoff**: For transient failures
2.  **Circuit Breaker**: Prevent cascading failures to external services
3.  **Graceful Degradation**: Cache-first with database fallback

### Security Patterns
1.  **Zero Trust**: Verify every request regardless of source
2.  **Least Privilege**: RBAC with Owner → Admin → Viewer hierarchy
3.  **Defense in Depth**: Multiple security layers (TLS, JWT, CORS, CSP)

---

## Python Quality Standards

To maintain high code quality (**Pylint score 10.00/10** & **Pyrefly 0 Errors**), the following standards apply:

### 1. Static Analysis & Typing (Strict)
*   **Zero Errors**: All code must pass `python -m pyrefly check` with 0 errors.
*   **None Safety**: Use rigorous assertions (`assert var is not None`) before accessing attributes of optional objects (e.g., `update.message`).
*   **Type Casting**: Prefer `cast(Type, val)` over constructor calls when dealing with stubs or ORM attributes to satisfy static analysis without runtime overhead.
*   **Awaitables**: Explicitly await all awaitable calls (e.g., Redis commands) and cast return types if the library stubs are missing generic support.

### 2. Naming Conventions & Structure
*   **Snake Case**: Use `snake_case` for variables/methods.
*   **Upper Case**: Use `UPPER_CASE` for constants.
*   **Line Length**: Hard limit of **100 characters**. Break long lines in function calls or variable assignments using parentheses.
*   **No Duplication**: Logic blocks > 5 lines appearing twice must be refactored into a utility function (e.g., `check_db_connectivity`).

### 3. Modern Python Practices
*   **Dates**: **NEVER** use `datetime.utcnow()`. ALWAYS use `datetime.now(timezone.utc)` for timezone-aware timestamps.
*   **Logging**: Use lazy `%` formatting in `logger` calls (`logger.info("Msg %s", arg)`). Use f-strings everywhere else.
*   **Imports**: No unused imports. Remove them immediately. Group imports: stdlib, third-party, local.

### 4. Exception Handling
*   **Specific Exceptions**: Never use broad `except Exception:`. Catch specific errors (`SQLAlchemyError`, `TelegramError`).
*   **Graceful Degradation**: Implement resilience patterns (Circuit Breakers) for external dependencies like Redis and Database.

---

## TypeScript/Frontend Quality Standards

### 1. Naming Conventions
*   **Files/Folders**: `kebab-case` (e.g., `stats-card.tsx`)
*   **Components**: `PascalCase` (e.g., `StatsCard`)
*   **Hooks**: `camelCase` with `use` prefix (e.g., `useAuth`)
*   **Variables**: `camelCase`
*   **Constants**: `UPPER_SNAKE_CASE`

### 2. Import Organization
```typescript
// 1. React/Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 3. Local
import { useAuth } from '@/lib/hooks/use-auth';
import type { User } from '@/types/models';
```

### 3. Component Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component
// 4. Subcomponents (if small)
// 5. Exports
```
