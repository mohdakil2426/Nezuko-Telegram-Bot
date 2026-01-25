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
- **Config-as-UI**: Modify bot behavior (messages, rate limits, webhooks) without touching environmental variables or restarting services.

## 👤 User Experience (UX) Goals

### For The "Newbie" User

- **Clarity**: A clear, emoji-rich message explaining _why_ they were muted.
- **Guidance**: Direct "Join" buttons that open the correct channel immediately.
- **Instant Gratification**: Clicking "Verify" provides immediate feedback and restores permissions.

### For The "Power" Admin

- **Automation**: Set and forget. Once `/protect` is run, the bot manages the group autonomously.
- **Transparency**: View detailed audit logs for every admin action (who unlinked a channel, who changed a message).
- **Reliability**: The bot handles Telegram API rate limits gracefully, ensuring service never drops during peak traffic.

## 🛠️ Technology Rationale

- **FastAPI & Python 3.13**: Chosen for maximum async performance and modern type safety.
- **Next.js 16 (React 19)**: Utilizing the latest React features (Server Components, Actions) for a premium, low-latency dashboard experience.
- **Firebase Auth**: Migrated from local JWT to Firebase for industry-standard identity management and secure session handling.
- **Firebase RTDB**: Used for live logging to provide a WebSocket-free, effortless real-time experience that works across proxy layers.
- **PostgreSQL 18 + Redis 8**: The gold standard for persistent storage and distributed caching.

## 📈 Success Metrics

- **Latency**: p99 Verification < 150ms.
- **Conversion**: Tracking the percentage of group joined users who successfully subscribe to the linked channel.
- **Availability**: 99.9% uptime for the enforcement engine during high-traffic surges.
- **Developer Experience**: Maintaining a "Zero Static Analysis Error" policy for all new contributions.
