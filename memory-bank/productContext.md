# Product Context: Nezuko Platform

## Problem Statement

Telegram community managers face critical challenges:

1.  **Manual Verification**: Impossible to check thousands of members for channel subscriptions.
2.  **Spam Prevention**: Unverified users flood groups with spam.
3.  **Growth Bottleneck**: No automated way to convert group members to channel subscribers.
4.  **Operational Blindness**: No visibility into verification rates or user behavior.

---

## Solution

Nezuko acts as an **automated gatekeeper** that:

1.  **Instant Restriction**: Mutes new members immediately on join.
2.  **Verification Flow**: Shows inline buttons to join required channels.
3.  **Automatic Unmute**: Restores permissions when user verifies.
4.  **Analytics Dashboard**: Real-time visibility into all verification activity.

---

## User Experience

### For Group Members

1.  Join group → Immediately muted.
2.  See message with "Join Channel" buttons.
3.  Join required channel(s).
4.  Click "Verify" button.
5.  Instantly unmuted and can chat.

Preferred flow when admins use join-request invite links:

1.  User requests access to the protected group.
2.  Bot checks required channel membership before approval.
3.  Verified users are approved directly into the group.
4.  Missing users are declined and DM'd with channel guidance.

The verify step must be resilient to users joining a required channel after an initial failed attempt. Explicit verify clicks should always prefer fresh membership confirmation over stale negative cache state.
If a previously verified user later leaves a required channel, the system must revoke access again even when Telegram channel-leave delivery is delayed or missed.
For post-verification channel leaves, the group should stay quiet until the user actually tries to chat again. On that first blocked message, the bot should delete the message immediately, restrict again, and send one deduplicated verification prompt.

### For Administrators

1.  Add bot to group with admin rights.
2.  Run `/protect @channelname` command.
3.  Bot automatically enforces membership.
4.  View analytics in web dashboard.

---

## Dashboard Features (Staggered Motion UI)

| Page          | Purpose                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | Overview stats, animated verification charts, activity feeds.                                                                                              |
| **Analytics** | 3 domain-based tabs: Bot Operations, Cache & API, Groups & Members. 13 charts with responsive period selectors, empty states, and full ARIA accessibility. |
| **Groups**    | Manage protected groups, member counts, linked channels.                                                                                                   |
| **Channels**  | Manage enforced channels, subscriber counts, linked groups.                                                                                                |
| **Bots**      | Add/manage multiple bot instances.                                                                                                                         |
| **Logs**      | Real-time log streaming with filters.                                                                                                                      |
| **Settings**  | Theme, security vault (AES-GCM key generation), account info.                                                                                              |

---

## Authentication

- **Production**: InsForge Auth (email/password + OAuth via Google, GitHub) with `InsforgeMiddleware` route guards, `insforge_session` HTTP-only cookie, and RLS on all 12 tables.
- **Development**: `NEXT_PUBLIC_DEV_LOGIN=true` bypasses auth (guarded by `NODE_ENV !== "production"`).

---

## Active Data Architecture (2-Tier InsForge)

The platform uses a clean 2-tier architecture powered by InsForge BaaS.

```
Dashboard → InsForge SDK (direct queries) → InsForge Managed PostgreSQL
Bot (grammY) → native fetch() REST       → InsForge REST API → PostgreSQL
Dashboard ← InsForge Realtime (Socket.IO) ← PostgreSQL Triggers
Bot (grammY) ← socket.io-client          ← InsForge Realtime (Socket.IO)
```

**Key Benefits:**

- **Simplicity**: No backend API to maintain or deploy.
- **Performance**: Direct database access reduces latency.
- **Realtime**: Native WebSocket support for instant updates.
- **Scalability**: Managed infrastructure handles load.

---

## Key Metrics

| Metric                     | Target  | Status       |
| -------------------------- | ------- | ------------ |
| Verification Latency (p99) | <150ms  | ✅ Achieved  |
| Dashboard Pages            | 10      | ✅ Complete  |
| Uptime                     | 99.9%   | ✅ On Track  |
| grammY Tests               | 145/145 | ✅ Phase 112 |

---

## Legacy: Python PTB Bot

> **Status: ARCHIVED — unmaintained since Phase 96.**

The platform was originally built with Python + python-telegram-bot v22.6. That runtime (`apps/bot/`) is preserved but not developed. All active bot work happens in `apps/grammy/`.

---

_Last Updated: 2026-03-07 (Phase 112 — delayed prompt enforcement behavior documented)_
