# Project Brief: Nezuko - The Ultimate All-In-One Telegram Ecosystem

## 🌟 Vision & North Star

Nezuko is not just a bot; it is a **high-assurance community acceleration platform**. Our North Star is to provide community managers with an "invisible" but powerful automated moderator that bridges the gap between massive group engagement and focused channel growth. We envision a world where community growth is a byproduct of high-quality interaction, enforced seamlessly by intelligent, non-intrusive automation.

## 🚀 Mission Statement

To build the most performant, secure, and user-friendly Telegram management ecosystem by leveraging the bleeding edge of asynchronous Python, modern React architecture, and cloud-native infrastructure.

---

## 🎯 Primary Objectives

### 1. Growth Through Enforcement

- **The Conversion Engine**: Convert every active group participant into a channel subscriber with a 100% enforcement rate.
- **Multi-Channel Logic**: Support complex "AND" / "OR" linking scenarios where users must subscribe to a network of channels.

### 2. Operational Superiority

- **Sub-100ms Latency**: Target a p95 verification timeframe indistinguishable from native Telegram responsiveness.
- **Massive Scalability**: Orchestrate thousands of "Tenants" (Group-Channel links) on a single unified backend.

### 3. Developer & Admin Delight

- **Zero-Config Onboarding**: Bot owners can go from "Add to Group" to "Fully Protected" in under 10 seconds via `/protect`.
- **Premium Web Experience**: Dashboard that feels like enterprise SaaS, not a hobbyist tool.

---

## 👥 Stakeholders

| Stakeholder            | Primary Need    | Value Delivered                                                |
| :--------------------- | :-------------- | :------------------------------------------------------------- |
| **Community Managers** | Audience Growth | Automated subscriber acquisition from group chats.             |
| **Moderators**         | Spam Control    | Automated muting of unverified or non-compliant users.         |
| **End Users**          | Group Access    | Clear, interactive guidance on how to gain permission quickly. |
| **Bot Owners**         | System Overview | Detailed analytics, log streaming, and RBAC management.        |

---

## 🛠️ Detailed Feature Roadmap

### Phase A: The Bot Core (Foundation) ✅

- [x] **Asynchronous Handler Engine**: Processing updates in parallel using MTProto.
- [x] **Smart Join/Leave Detection**: Real-time permission revocation.
- [x] **Interactive Inline Verification**: One-click "Join -> Verify -> Chat" flow.
- [x] **Hybrid Caching Implementation**: Redis 8 and local LRU for p99 performance.

### Phase B: The Admin API (Intelligence) ✅

- [x] **FastAPI REST Backbone**: Pydantic V2 validated endpoints.
- [x] **Supabase Auth Integration**: Industry-standard secure identity (JWT).
- [x] **RBAC Management**: Owner, Admin, and Viewer roles with granular scoping.
- [x] **Audit Logging System**: Immutable record of every administrative action.
- [x] **Database-Agnostic Models**: Supabase Postgres or SQLite for all environments.

### Phase C: Dashboard & Analytics (Visualization) ✅

- [x] **Next.js 16 Web Interface**: Server Components and Streaming.
- [x] **Supabase Realtime Streams**: Live logs via `postgres_changes`.
- [x] **Verification Analytics**: Recharts-driven growth and conversion visualization.
- [x] **Database Browser**: Direct inspection of system state from the UI.
- [x] **Supabase Authentication Flow**: Login, sync, and session management - **FULLY WORKING**.

### Phase D: Advanced Management (Configuration) 🚧

- [x] **Global Settings Form**: Manage messages, rate limits, and security keys.
- [x] **Webhook Management**: High-availability production delivery configuration.
- [ ] **i18n Support**: Multi-language translation system for bot messages.
- [ ] **Community Marketplace**: Template sharing for protection settings.
- [ ] **Mobile Responsive Sidebar**: Hamburger menu for mobile devices.

---

## 📈 Success Metrics

### Product Performance (Productivity)

- **Reduction in Manual Check**: Eliminate 100% of manual subscription verification.
- **User Retention**: Maintain >95% user retention after the verification hurdle.

### Technical Performance (SLAs)

| Metric                | Target   | Status (2026-01-26) |
| :-------------------- | :------- | :------------------ |
| **Uptime**            | 99.9%    | ✅ On Track         |
| **API Latency (p90)** | <50ms    | ✅ Achieved         |
| **Pylint Score**      | 10.00/10 | ✅ Achieved         |
| **Pyrefly Errors**    | 0        | ✅ Zero Errors      |
| **Supabase Auth**     | Working  | ✅ **INTEGRATED**   |
| **Local Dev Setup**   | <5 min   | ✅ Achieved         |
| **Auth Tests**        | 6/6      | ✅ **All Passed**   |
| **UI Pages**          | 8/8      | ✅ **All Working**  |
| **Security Tests**    | 3/3      | ✅ **All Passed**   |

---

## 🎨 Branding & Identity

- **Theme**: Cyber-Aesthetic / Noir. Deep blacks, vibrant purple accents (#9333ea), neon highlights.
- **Tone**: Empowerment, Precision, and Mystery. The bot is a "Silent Guardian."
- **Typography**: Inter (UI), JetBrains Mono (Codes/Metrics), Outfit (Headings).

---

## 🔐 Compliance & Security

- **OWASP 2025 Standard**: Strict adherence to web security practices.
- **Data Privacy**: Minimalistic data collection (Telegram IDs + Supabase Metadata only).
- **Encryption**: TLS 1.3 in transit, SCRAM-SHA-256 for Postgres at rest.
- **API Protection**: 401 Unauthorized for unauthenticated requests.

---

## 🤝 Project Governance

- **Version Control**: Semantic Versioning (SemVer) 2.0.
- **Documentation**: "Documentation as Code" using Markdown (memory-bank/).
- **Branching Strategy**: Trunk-based development with strict PR reviews.

---

## 🗺️ Long-Term Horizon

Beyond channel enforcement, Nezuko aims to become a full-service AI community moderator, integrating:

- [ ] LLM-based sentiment analysis
- [ ] Automated FAQ handling
- [ ] Crypto-integrated tip/reward systems

---

## 📋 Quick Reference

### Local Development Commands

```bash
# API
cd apps/api
python -m uvicorn src.main:app --port 8080 --reload

# Web
cd apps/web
bun dev

# Login Credentials
# Email: admin@nezuko.bot
# Password: Admin@123
```

### Key Files

| Purpose           | File Path                                      |
| :---------------- | :--------------------------------------------- |
| DB Initialization | `apps/api/init_db.py`                          |
| Database Config   | `apps/api/src/core/database.py`                |
| Auth Service      | `apps/api/src/services/auth_service.py`        |
| Supabase Client   | `apps/web/src/lib/supabase/client.ts`          |
| Login Form        | `apps/web/src/components/forms/login-form.tsx` |
| Auth Proxy        | `apps/web/src/proxy.ts` (Next.js 16)           |
| Logout Handler    | `apps/web/src/components/layout/sidebar.tsx`   |

---

**End of Brief**
_(Updated 2026-01-26 - Auth fully working, 19/19 tests passed)_
