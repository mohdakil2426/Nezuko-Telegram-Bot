# InsForge Migration Plan & Architecture Strategy

> **Status**: Draft
> **Target Architecture**: Hybrid Monorepo (Next.js Frontend + Python Bot Worker + InsForge Backend-as-a-Service)
> **Goal**: Replace `apps/api` (FastAPI) with InsForge Managed Services (DB, Auth, Realtime, Storage).

---

## 1. Architecture Overview

We are moving from a **Traditional 3-Tier Architecture** (Frontend → API → DB) to a **Modern 2-Tier "BaaS" Architecture**.

| Component | Old Role | New Role | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Fetched data from FastAPI | **Reads/Writes directly to DB** (secured by RLS) | Next.js 16 + `@insforge/sdk` |
| **Bot** | Polled API / Direct DB | **Worker Process** connected to DB | Python 3.13 + `SQLAlchemy` |
| **Backend API** | REST Endpoints (FastAPI) | **REMOVED** (Replaced by InsForge) | N/A |
| **Realtime** | Custom SSE Endpoints | **WebSockets** (Native InsForge) | InsForge Realtime |
| **File Storage** | Local Disk (Docker Volume) | **Cloud Storage** (S3-compatible) | InsForge Storage |
| **Auth** | Custom Telegram Auth | **InsForge Auth** (Email/OAuth) | `@insforge/nextjs` |

---

## 2. Recommended Folder Structure

We will adopt a **Service-Based Monorepo** structure.

```text
nezuko-monorepo/
├── apps/
│   ├── web/                      # 🟢 Next.js Dashboard
│   │   ├── src/
│   │   │   ├── app/              # App Router Pages
│   │   │   ├── lib/
│   │   │   │   └── insforge.ts   # Singleton Client
│   │   │   ├── features/         # Feature-based folders
│   │   │   │   ├── storage/      # File upload logic
│   │   │   │   └── realtime/     # WebSocket hooks
│   │   │   └── ...
│   │   ├── middleware.ts         # InsForge Auth Middleware
│   │   └── .env.local            # NEXT_PUBLIC_INSFORGE_URL
│   │
│   └── bot/                      # 🤖 Python Bot Worker
│       ├── src/
│       │   ├── core/             # Config & DB Connection
│       │   ├── workers/          # Command Listeners
│       │   └── ...
│       ├── .env                  # DATABASE_URL (InsForge Postgres)
│       └── ...
│
├── insforge/                     # ☁️ Infrastructure as Code
│   ├── migrations/               # Database Schema
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_security_policies.sql (RLS)
│   │   └── 003_realtime_triggers.sql
│   ├── functions/                # Serverless Edge Functions
│   │   └── admin-actions/        # Complex logic (if needed)
│   └── seeds/                    # Dev Data
│
└── packages/                     # 📦 Shared Code
    └── types/                    # Shared Types
        └── database.ts           # Generated from SQL
```

---

## 3. Migration Steps

### Phase 1: Infrastructure Setup
1.  **Initialize InsForge Project**: Use `download-template` tool.
2.  **Define Database Schema**:
    *   Port existing SQLAlchemy models to SQL `CREATE TABLE` statements in `insforge/migrations/`.
    *   **Crucial**: Add `admin_commands` table for Dashboard-to-Bot communication.

### Phase 2: Authentication (Next.js)
1.  Install `@insforge/nextjs`.
2.  Configure Middleware to protect `/dashboard`.
3.  **Strategy**: Use InsForge Auth (Email/GitHub) for the **Admin Dashboard**.
    *   *Why?* It's secure out-of-the-box. The Bot doesn't need "login"; it uses a Service Connection String.

### Phase 3: Data Layer (Frontend)
1.  **Delete** all `fetch('/api/...')` calls.
2.  **Replace** with InsForge SDK calls:
    ```typescript
    // Old
    const res = await fetch('/api/groups');
    // New
    const { data } = await insforge.from('groups').select('*');
    ```

### Phase 4: Bot Refactor (The "Command Pattern")
1.  **Remove** any API dependency.
2.  **Implement Command Listener**:
    *   Bot polls `admin_commands` table (or listens via Realtime).
    *   Executes action (e.g., Ban User).
    *   Updates status to `completed`.

### Phase 5: Realtime & Storage
1.  **Realtime**: Replace SSE with `insforge.realtime.subscribe()`.
2.  **Storage**: Upload bot logs/evidence to InsForge Storage buckets.

---

## 4. Implementation Guide & Code Examples

### A. InsForge Client (`apps/web/src/lib/insforge.ts`)

```typescript
import { createClient } from '@insforge/sdk';

// Initialize the client
// Usage: import { insforge } from '@/lib/insforge';
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
});
```

### B. Database Schema & Triggers (`insforge/migrations/`)

**1. Command Queue Table**
```sql
CREATE TABLE admin_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- e.g., 'ban_user', 'send_message'
    payload JSONB NOT NULL,    -- e.g., { "user_id": 123, "chat_id": 456 }
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- Security: Only Admins can insert
ALTER TABLE admin_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can insert commands" ON admin_commands
    FOR INSERT TO authenticated USING (true); -- Assuming all auth users are admins
```

**2. Realtime Trigger (Notify Frontend of Changes)**
```sql
-- Create a trigger to publish events via WebSockets
CREATE OR REPLACE FUNCTION notify_command_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'admin_updates',           -- Channel Name
    'command_updated',         -- Event Name
    jsonb_build_object('id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER command_status_trigger
  AFTER UPDATE ON admin_commands
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_command_status();
```

### C. Bot Command Listener (`apps/bot/src/workers/commander.py`)

```python
import asyncio
from sqlalchemy import select, update
from src.core.database import async_session_maker
from src.models import AdminCommand # You need to define this model

async def command_worker(bot_app):
    """
    Background task that processes commands from the Dashboard.
    """
    while True:
        async with async_session_maker() as session:
            # 1. Fetch pending commands
            stmt = select(AdminCommand).where(AdminCommand.status == 'pending')
            result = await session.execute(stmt)
            commands = result.scalars().all()

            for cmd in commands:
                try:
                    # Mark as processing
                    cmd.status = 'processing'
                    await session.commit()

                    # 2. Execute Logic
                    if cmd.type == 'ban_user':
                        await bot_app.bot.ban_chat_member(
                            chat_id=cmd.payload['chat_id'],
                            user_id=cmd.payload['user_id']
                        )

                    # 3. Mark as completed
                    cmd.status = 'completed'

                except Exception as e:
                    cmd.status = 'failed'
                    cmd.error = str(e)

                await session.commit()

        # Poll every second (or use Listen/Notify for lower latency)
        await asyncio.sleep(1)
```

### D. Frontend Realtime Hook (`apps/web/src/hooks/useCommandStatus.ts`)

```typescript
import { useEffect } from 'react';
import { insforge } from '@/lib/insforge';
import { toast } from 'sonner';

export function useCommandStatus() {
  useEffect(() => {
    const channel = insforge.realtime
      .subscribe('admin_updates')
      .then(({ ok }) => {
         if (ok) console.log('Listening for admin updates...');
      });

    // Listen for events
    insforge.realtime.on('command_updated', (payload) => {
      if (payload.status === 'completed') {
        toast.success(`Command ${payload.id} completed!`);
      } else if (payload.status === 'failed') {
        toast.error(`Command ${payload.id} failed.`);
      }
    });

    return () => {
      insforge.realtime.disconnect();
    };
  }, []);
}
```

### E. File Storage Upload (`apps/web/src/features/storage/upload.ts`)

```typescript
export async function uploadBotAsset(file: File) {
  // 1. Upload to InsForge Storage
  const { data, error } = await insforge.storage
    .from('bot-assets')
    .uploadAuto(file); // Auto-generates unique key

  if (error) throw error;

  // 2. Return the public URL
  return data.url;
}
```

---

## 5. Deployment Strategy

### Frontend (Web)
*   **Tool**: `create-deployment` MCP.
*   **Env Vars**: `NEXT_PUBLIC_INSFORGE_BASE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`.

### Bot (Python)
*   **Host**: VPS / Docker (Same as before).
*   **Env Vars**: `DATABASE_URL` (Point to InsForge Postgres Connection String).

### Database (InsForge)
*   **Managed**: No deployment needed.
*   **Migrations**: Use `run-raw-sql` MCP to apply SQL files from `insforge/migrations`.
