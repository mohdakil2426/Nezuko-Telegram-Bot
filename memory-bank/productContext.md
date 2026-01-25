# Product Context: Nezuko - Community Growth & Management

## 🔍 Problem Statement

Telegram community managers face a "Growth vs. Quality" paradox:

1.  **Manual Verification**: Checking thousands of members for channel subscriptions is impossible.
2.  **Slow Tooling**: Existing bots are often slow, causing "verification lag" that frustrates users.
3.  **UI/UX Decay**: Common bots provide cryptic errors or no feedback, leading to dropped engagement.
4.  **Operational Blindness**: Admins lack real-time data on how many users are being restricted or converted.

## 💡 The Nezuko Solution

Nezuko bridges this gap by acting as a high-performance **Gatekeeper** and **Analytics Hub**.

### 1. Intelligent Enforcement

- **Instant-Mute**: New members are restricted the millisecond they join using `ChatMemberUpdated` events.
- **Subscription Policing**: Every message is verified against the "Enforcement Link".
- **Automatic Unmute**: Users gain access instantly (<100ms) upon joining the required channels and clicking "Verify".

### 2. Administrative Control (The Admin Panel)

The **Nezuko Dashboard** provides a unified interface for system owners:

- **Real-Time Observability**: Live log streaming and activity feeds showing system actions.
- **RBAC System**: Granular permissions (Owner, Admin, Viewer) managed via Firebase Auth.
- **Insightful Analytics**: Visualizing verification trends and user growth through interactive charts.
- **Config-as-UI**: Modify bot behavior (messages, rate limits, webhooks) without touching environment variables.

## 👤 User Experience (UX) Goals

### For The "Newbie" User

- **Clarity**: A clear, emoji-rich message explaining _why_ they were muted.
- **Guidance**: Direct "Join" buttons that open the correct channel immediately.
- **Instant Gratification**: Clicking "Verify" provides immediate feedback and restores permissions.

### For The "Power" Admin

- **Automation**: Set and forget. Once `/protect` is run, the bot manages the group autonomously.
- **Transparency**: View detailed audit logs for every admin action.
- **Reliability**: The bot handles Telegram API rate limits gracefully.

## 🛠️ Technology Rationale

| Component         | Technology           | Reason                                      |
| :---------------- | :------------------- | :------------------------------------------ |
| **Bot Core**      | Python 3.13, PTB v22 | Maximum async performance, modern typing    |
| **Admin API**     | FastAPI, Pydantic V2 | High-performance REST with validation       |
| **Dashboard**     | Next.js 16, React 19 | Server Components, streaming, premium UX    |
| **Auth**          | Firebase Auth        | Industry-standard identity management       |
| **Realtime Logs** | Firebase RTDB        | WebSocket-free, works across proxy layers   |
| **Database**      | PostgreSQL / SQLite  | Production stability / Local dev simplicity |
| **Cache**         | Redis 8              | Distributed caching, session management     |

## 📈 Success Metrics

| Metric                     | Target   | Current Status (2026-01-26) |
| :------------------------- | :------- | :-------------------------- |
| **p99 Verification**       | < 150ms  | ✅ Achieved                 |
| **Uptime**                 | 99.9%    | ✅ On Track                 |
| **Admin Login Success**    | 100%     | ✅ Verified Working         |
| **Static Analysis Errors** | 0        | ✅ Zero Errors              |
| **Pylint Score**           | 10.00/10 | ✅ Achieved                 |
| **TypeScript Errors**      | 0        | ✅ Zero Errors              |
| **UI Pages Working**       | 8/8      | ✅ All Tested               |

## 🎯 Current State Summary (2026-01-26)

- **Bot Core**: Fully functional enforcement engine.
- **Admin API**: Firebase Auth + SQLite working locally.
- **Dashboard**: All 8 pages tested and working:
  - ✅ Login, Dashboard, Groups, Channels
  - ✅ Config, Logs, Database, Analytics
- **Authentication**: Firebase email/password auth fully integrated.
- **Code Quality**: Zero TypeScript errors, no `any` types in components.

---

**End of Product Context**
_(Updated 2026-01-26 with comprehensive UI testing results)_
