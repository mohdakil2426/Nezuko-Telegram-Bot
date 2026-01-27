# 🤖 Bot Reference

> **Complete documentation for the Nezuko Telegram Bot**

The Nezuko bot enforces channel membership in Telegram groups. When enabled, users must join specified channels before they can send messages in the protected group.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Commands](#commands)
4. [Event Handlers](#event-handlers)
5. [Verification Flow](#verification-flow)
6. [Configuration](#configuration)
7. [Metrics & Monitoring](#metrics--monitoring)

---

## Overview

### Core Features

| Feature | Description |
|---------|-------------|
| **Channel Enforcement** | Require users to join channels before chatting |
| **Multi-Channel Support** | Require multiple channels (AND logic) |
| **Instant Mute** | Automatically mute on join |
| **One-Click Verify** | Inline button for self-service verification |
| **Leave Detection** | Re-restrict users who leave required channels |
| **Admin Dashboard** | Web-based management interface |

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICATION FLOW                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User joins    2. Bot mutes     3. Bot sends     4. User     │
│     protected        user            verification      clicks   │
│     group            immediately     button            button   │
│                                                                  │
│       👤              🔇               📲              ✅        │
│       │               │                │               │        │
│       ▼               ▼                ▼               ▼        │
│  ┌─────────┐    ┌─────────┐     ┌─────────────┐  ┌──────────┐  │
│  │ Telegram │───▶│   Bot   │────▶│  Verify Me  │──▶│  Check   │  │
│  │  Event   │    │ Handler │     │   Button    │   │ Channels │  │
│  └─────────┘    └─────────┘     └─────────────┘  └──────────┘  │
│                                                        │        │
│                     5. If member of all channels:      ▼        │
│                                                  ┌──────────┐   │
│                                                  │  Unmute  │   │
│                                                  │   User   │   │
│                                                  └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup

### Prerequisites

1. **Create bot** via [@BotFather](https://t.me/BotFather)
2. **Get bot token** from BotFather
3. **Add bot to group** as Administrator with "Restrict Members" permission
4. **Add bot to channel** as Administrator

### Quick Setup

```bash
# 1. Configure environment
cp apps/bot/.env.example apps/bot/.env
# Edit apps/bot/.env with your BOT_TOKEN

# 2. Run the bot
cd apps/bot
python main.py
```

### Setup in Telegram

1. **Add bot to your GROUP** as Admin
   - Grant "Restrict Members" permission
   
2. **Add bot to your CHANNEL** as Admin
   - No special permissions needed

3. **Enable protection** in the group:
   ```
   /protect @YourChannel
   ```

4. **Done!** New members must now join the channel to chat.

---

## Commands

### User Commands

| Command | Context | Description |
|---------|---------|-------------|
| `/start` | Private | Welcome message with setup guide |
| `/help` | Any | Show help and command list |
| `/status` | Group | Show protection status for the group |

### Admin Commands

| Command | Context | Required Permission | Description |
|---------|---------|---------------------|-------------|
| `/protect @channel` | Group | Admin | Enable protection with specified channel |
| `/unprotect` | Group | Admin | Disable protection |
| `/settings` | Group | Admin | View/modify group settings |

### Superadmin Commands

| Command | Description |
|---------|-------------|
| `/stats` | Global bot statistics |
| `/broadcast` | Broadcast message to all groups |

---

## Event Handlers

### `ChatMemberUpdated` - Join Handler

Triggered when a user joins a protected group.

```python
# apps/bot/handlers/events/join.py

async def on_chat_member_updated(update: Update, context: CallbackContext):
    """Handle new member joins."""
    
    # 1. Check if group is protected
    group = await get_protected_group(chat_id)
    if not group or not group.enabled:
        return
    
    # 2. Get required channels
    channels = await get_enforced_channels(chat_id)
    
    # 3. Restrict the user
    await context.bot.restrict_chat_member(
        chat_id=chat_id,
        user_id=user_id,
        permissions=ChatPermissions(can_send_messages=False)
    )
    
    # 4. Send verification button
    await context.bot.send_message(
        chat_id=chat_id,
        text=f"Welcome {user.mention}! Please join our channels and verify.",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📢 Join Channel", url=channel.invite_link)],
            [InlineKeyboardButton("✅ Verify", callback_data=f"verify_{user_id}")]
        ])
    )
```

### `CallbackQuery` - Verify Handler

Triggered when user clicks the "Verify" button.

```python
# apps/bot/handlers/verify.py

async def on_verify_callback(update: Update, context: CallbackContext):
    """Handle verification button click."""
    
    query = update.callback_query
    user_id = int(query.data.split("_")[1])
    
    # Security: Ensure user is clicking their own button
    if query.from_user.id != user_id:
        await query.answer("This button is not for you!", show_alert=True)
        return
    
    # Check membership in all required channels
    for channel in channels:
        member = await context.bot.get_chat_member(channel.channel_id, user_id)
        if member.status in ("left", "kicked"):
            await query.answer("You haven't joined all channels!", show_alert=True)
            return
    
    # Unrestrict the user
    await context.bot.restrict_chat_member(
        chat_id=chat_id,
        user_id=user_id,
        permissions=ChatPermissions(can_send_messages=True, ...)
    )
    
    await query.answer("✅ Verified! You can now chat.")
```

### `ChatMemberUpdated` - Leave Handler

Triggered when a user leaves a required channel.

```python
# apps/bot/handlers/events/left.py

async def on_channel_left(update: Update, context: CallbackContext):
    """Handle user leaving required channel."""
    
    # Find all groups where this channel is enforced
    groups = await get_groups_for_channel(channel_id)
    
    for group in groups:
        # Re-restrict the user
        await context.bot.restrict_chat_member(
            chat_id=group.group_id,
            user_id=user_id,
            permissions=ChatPermissions(can_send_messages=False)
        )
```

---

## Verification Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant T as Telegram
    participant B as Bot
    participant C as Cache
    participant D as Database

    Note over U,D: User Joins Protected Group
    T->>B: ChatMemberUpdated (join)
    B->>D: Get group config
    D-->>B: Config (enabled, channels)
    B->>T: Restrict user (mute)
    B->>T: Send verification message + buttons
    
    Note over U,D: User Clicks Verify
    U->>T: Click "Verify" button
    T->>B: CallbackQuery (verify_123)
    B->>B: Validate callback_data
    B->>C: Check cached verification
    C-->>B: Cache miss
    
    loop For each required channel
        B->>T: getChatMember(channel, user)
        T-->>B: Member status
    end
    
    alt All channels joined
        B->>T: Unrestrict user (unmute)
        B->>C: Cache verification (5 min)
        B->>D: Log verification
        B->>T: Answer callback "Verified!"
    else Missing channels
        B->>T: Answer callback "Join all channels first!"
    end
```

### States

| State | Description | User Permissions |
|-------|-------------|------------------|
| `PENDING` | Just joined, not verified | Cannot send messages |
| `VERIFYING` | Clicked verify, checking membership | Cannot send messages |
| `VERIFIED` | All channels joined | Full permissions |
| `EXPIRED` | Left required channel | Restricted again |

---

## Configuration

### Environment Variables

```bash
# apps/bot/.env

# Required
BOT_TOKEN=your_telegram_bot_token

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nezuko
# Or SQLite for development:
# DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db

# Cache (Optional - graceful fallback)
REDIS_URL=redis://localhost:6379/0

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn

# Settings
ENVIRONMENT=development  # or production
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR

# Webhook Mode (Production)
WEBHOOK_URL=https://your-domain.com/webhook
WEBHOOK_SECRET=your_secret_token
PORT=8000
```

### Group Parameters

Groups can have custom parameters stored in `params` JSON field:

```python
{
    "welcome_message": "Welcome to our community!",
    "kick_timeout": 300,        # Kick unverified after 5 min
    "notify_admins": True,      # Notify group admins
    "log_verifications": True   # Log all verifications
}
```

---

## Metrics & Monitoring

### Prometheus Metrics

The bot exposes Prometheus metrics at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `bot_verifications_total` | Counter | Total verifications by status |
| `bot_verification_latency_seconds` | Histogram | Verification latency |
| `bot_cache_hits_total` | Counter | Cache hit count |
| `bot_cache_misses_total` | Counter | Cache miss count |
| `bot_active_groups` | Gauge | Currently protected groups |
| `bot_telegram_api_calls_total` | Counter | Telegram API calls |
| `bot_telegram_api_errors_total` | Counter | Telegram API errors |

### Health Endpoints

```bash
# Full health check
curl http://localhost:8000/health

# Liveness probe (Kubernetes)
curl http://localhost:8000/live

# Readiness probe (Kubernetes)
curl http://localhost:8000/ready
```

### Logging

Structured JSON logging with structlog:

```json
{
  "event": "verification_success",
  "user_id": 123456789,
  "group_id": -1001234567890,
  "channels_checked": 2,
  "latency_ms": 45,
  "timestamp": "2026-01-27T12:00:00Z"
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Bot is not admin` | Missing admin rights | Re-add bot as admin |
| `Can't restrict admin` | User is group admin | Admins are exempt |
| `Channel not accessible` | Bot not in channel | Add bot to channel |
| `Flood limited` | Too many API calls | Automatic retry with backoff |

### Error Codes

| Code | Description |
|------|-------------|
| `ENF_001` | Bot not admin in group |
| `ENF_002` | Bot not admin in channel |
| `ENF_003` | Cannot restrict user (likely admin) |
| `TG_001` | Telegram API timeout |
| `TG_002` | Rate limited by Telegram |

---

## Advanced Usage

### Multi-Channel Enforcement

Require membership in multiple channels:

```bash
/protect @Channel1 @Channel2 @Channel3
```

Users must join ALL channels to be verified.

### Custom Welcome Messages

```python
# Set via params
{
    "welcome_message": """
Welcome to {group_name}! 🎉

To chat here, please:
1️⃣ Join our channel: @OfficialChannel
2️⃣ Click the "Verify" button below

Questions? Contact @admin
"""
}
```

### Webhook Mode (Production)

For production, use webhook mode instead of polling:

```bash
# In .env
WEBHOOK_URL=https://your-domain.com/webhook
WEBHOOK_SECRET=very_secret_token

# The bot will automatically switch to webhook mode
python main.py
```

---

## Next Steps

- [**Commands Reference**](./commands.md)
- [**Handlers Documentation**](./handlers.md)
- [**Verification Details**](./verification.md)

---

*See also: [Architecture](../architecture/README.md) | [API Reference](../api/README.md)*
