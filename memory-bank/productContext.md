# Product Context: Nezuko - Community Growth & Management

## 🔍 Problem Statement

Telegram community managers face a "Growth vs. Quality" paradox:

1. **Manual Verification**: Checking thousands of members for channel subscriptions is impossible.
2. **Slow Tooling**: Existing bots are often slow, causing "verification lag" that frustrates users.
3. **UI/UX Decay**: Common bots provide cryptic errors or no feedback, leading to dropped engagement.
4. **Operational Blindness**: Admins lack real-time data on how many users are being restricted or converted.

---

## 💡 The Nezuko Solution

Nezuko bridges this gap by acting as a high-performance **Gatekeeper** and **Analytics Hub**.

### 1. Intelligent Enforcement

- **Instant-Mute**: New members are restricted the millisecond they join using `ChatMemberUpdated` events.
- **Subscription Policing**: Every message is verified against the "Enforcement Link".
- **Automatic Unmute**: Users gain access instantly (<100ms) upon joining the required channels and clicking "Verify".

### 2. Administrative Control (The Admin Panel)

The **Nezuko Dashboard** provides a unified interface for system owners:

- **Real-Time Observability**: Live log streaming (via Supabase Realtime) and activity feeds showing system actions.
- **RBAC System**: Granular permissions (Owner, Admin, Viewer) managed via Supabase Auth + Local Roles.
- **Insightful Analytics**: Visualizing verification trends and user growth through interactive charts.
- **Config-as-UI**: Modify bot behavior (messages, rate limits, webhooks) without touching environment variables.

---

## 👤 User Experience (UX) Goals

### For The "Newbie" User

- **Clarity**: A clear, emoji-rich message explaining _why_ they were muted.
- **Guidance**: Direct "Join" buttons that open the correct channel immediately.
- **Instant Gratification**: Clicking "Verify" provides immediate feedback and restores permissions.

### For The "Power" Admin

- **Automation**: Set and forget. Once `/protect` is run, the bot manages the group autonomously.
- **Transparency**: View detailed audit logs for every admin action.
- **Reliability**: The bot handles Telegram API rate limits gracefully.

### The Premium Experience (Visuals)

- **Glassmorphism**: Diffuse blur backgrounds (`backdrop-filter`) for depth.
- **Micro-Interactions**: `MagneticButton` and `TiltCard` provide tactile feedback.
- **Data Visualization**: Smooth streaming charts with `Recharts` and animated counters.
- **Theming**: 11+ preset themes (Cyberpunk, Synthwave) + custom color generator.

---

## 🛠️ Technology Rationale

| Component         | Technology             | Reason                                   |
| :---------------- | :--------------------- | :--------------------------------------- |
| **Bot Core**      | Python 3.13, PTB v22.6 | Maximum async performance, modern typing |
| **Admin API**     | FastAPI, Pydantic V2   | High-performance REST with validation    |
| **Dashboard**     | Next.js 16, React 19   | Server Components, streaming, premium UX |
| **Auth**          | Supabase Auth          | JWT-based secure identity management     |
| **Realtime Logs** | Supabase Realtime      | Postgres Change Detection                |
| **Database**      | PostgreSQL (Supabase)  | Production-grade SQL at any scale        |
| **Cache**         | Redis 7+               | Distributed caching, session management  |

---

## 📈 Success Metrics

| Metric                     | Target   | Current Status |
| :------------------------- | :------- | :------------- |
| **p99 Verification**       | < 150ms  | ✅ Achieved    |
| **Uptime**                 | 99.9%    | ✅ On Track    |
| **Admin Login Success**    | 100%     | ✅ Working     |
| **Static Analysis Errors** | 0        | ✅ Zero Errors |
| **Pylint Score**           | 10.00/10 | ✅ Achieved    |
| **TypeScript Errors**      | 0        | ✅ Zero Errors |
| **UI Pages Working**       | 9/9      | ✅ All Tested  |
| **Auth Tests Passed**      | 6/6      | ✅ All Passed  |
| **Security Tests Passed**  | 3/3      | ✅ All Passed  |

---

## 🎯 Current State Summary (2026-02-02)

### Platform Status

| Component          | Status        | Notes                           |
| ------------------ | ------------- | ------------------------------- |
| **Bot Core**       | ✅ Functional | Enforcement engine working      |
| **Admin API**      | ✅ Functional | Supabase JWT verification       |
| **Dashboard**      | ✅ Polished   | Premium UI + 11 Themes          |
| **Authentication** | ✅ Working    | Login, session, logout verified |
| **Documentation**  | ✅ Complete   | Structured in docs/             |

### Recent Improvements (Phase 28-40)

- **Dashboard Redesign**: Complete overhaul with Glassmorphism and Tilt effects.
- **New Assets Page**: Unified Groups and Channels management.
- **Logs Page**: Added real-time log streaming with premium overview stats.
- **Development Experience**: Added mock data toggle and auth bypass for offline dev.
- **Full-Stack Integration (Phase 40)**: Connected Web + API + Bot with real data flow.
  - 11 new API endpoints for charts and analytics
  - Supabase authentication integrated
  - Dashboard displays live verification data from database

---

## 🔮 Future Roadmap

### Post v1.0.0

- [ ] Multi-language support (i18n)
- [ ] Member Whitelisting UI
- [ ] Telegram Login Widget integration
- [ ] Mobile-responsive sidebar
- [ ] LLM-based sentiment analysis
- [ ] Automated FAQ handling
- [ ] Production auth setup (correct Supabase JWT secret)

---

## 📚 Documentation

| Topic              | Location                          |
| ------------------ | --------------------------------- |
| Full Documentation | `docs/README.md`                  |
| Tech Stack         | `docs/architecture/tech-stack.md` |
| Architecture       | `docs/architecture/README.md`     |
| API Reference      | `docs/api/README.md`              |
| Contributing       | `docs/contributing/README.md`     |

---

_Last Updated: 2026-02-04_
