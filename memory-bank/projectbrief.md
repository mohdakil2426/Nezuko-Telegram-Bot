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

| Stakeholder            | Primary Need    | Value Delivered                                               |
| :--------------------- | :-------------- | :------------------------------------------------------------ |
| **Community Managers** | Audience Growth | Automated subscriber acquisition from group chats             |
| **Moderators**         | Spam Control    | Automated muting of unverified or non-compliant users         |
| **End Users**          | Group Access    | Clear, interactive guidance on how to gain permission quickly |
| **Bot Owners**         | System Overview | Detailed analytics, log streaming, and RBAC management        |

---

## 🛠️ Feature Roadmap

### Phase A: The Bot Core (Foundation) ✅

- [x] **Asynchronous Handler Engine**: Processing updates in parallel using MTProto
- [x] **Smart Join/Leave Detection**: Real-time permission revocation
- [x] **Interactive Inline Verification**: One-click "Join -> Verify -> Chat" flow
- [x] **Hybrid Caching Implementation**: Redis 7 and local LRU for p99 performance

### Phase B: The Admin API (Intelligence) ✅

- [x] **FastAPI REST Backbone**: Pydantic V2 validated endpoints
- [x] **Telegram Login Widget**: Owner-only authentication via Telegram
- [x] **Session-based Auth**: HTTP-only cookies with configurable expiration
- [x] **Audit Logging System**: Immutable record of every administrative action
- [x] **Database-Agnostic Models**: PostgreSQL (Supabase) or SQLite for all environments

### Phase C: Dashboard & Analytics (Visualization) ✅

- [x] **Next.js 16 Web Interface**: Server Components and Streaming
- [x] **Real-Time SSE Streams**: Live events via Server-Sent Events
- [x] **Verification Analytics**: Recharts-driven growth and conversion visualization
- [x] **Database Browser**: Direct inspection of system state from the UI
- [x] **Multi-Bot Management**: Add, manage, and monitor multiple bots from dashboard

### Phase D: Advanced Management (Configuration) 🚧

- [x] **Global Settings Form**: Manage messages, rate limits, and security keys
- [x] **Webhook Management**: High-availability production delivery configuration
- [ ] **i18n Support**: Multi-language translation system for bot messages
- [ ] **Community Marketplace**: Template sharing for protection settings
- [ ] **Mobile Responsive Sidebar**: Hamburger menu for mobile devices

---

## 📈 Success Metrics

### Technical Performance (SLAs)

| Metric                | Target   | Status         |
| :-------------------- | :------- | :------------- |
| **Uptime**            | 99.9%    | ✅ On Track    |
| **API Latency (p90)** | <50ms    | ✅ Achieved    |
| **Pylint Score**      | 10.00/10 | ✅ Achieved    |
| **Pyrefly Errors**    | 0        | ✅ Zero Errors |
| **Telegram Login**    | Working  | ✅ Integrated  |
| **Local Dev Setup**   | <5 min   | ✅ Achieved    |
| **Auth Tests**        | 15/15    | ✅ All Passed  |
| **UI Pages**          | 10/10    | ✅ All Working |
| **Security Tests**    | 3/3      | ✅ All Passed  |

---

## 🎨 Branding & Identity

- **Theme**: Cyber-Aesthetic / Noir. Deep blacks, vibrant purple accents (#9333ea), neon highlights.
- **Tone**: Empowerment, Precision, and Mystery. The bot is a "Silent Guardian."
- **Typography**: Inter (UI), JetBrains Mono (Codes/Metrics), Outfit (Headings).

---

## 🔐 Compliance & Security

- **OWASP 2025 Standard**: Strict adherence to web security practices.
- **Data Privacy**: Minimalistic data collection (Telegram IDs + session metadata only).
- **Encryption**: TLS 1.3 in transit, Fernet for bot tokens at rest.
- **API Protection**: 401 Unauthorized for unauthenticated requests.
- **Token Security**: Bot tokens encrypted with Fernet before storage.

---

## 🤝 Project Governance

- **Version Control**: Semantic Versioning (SemVer) 2.0.
- **Documentation**: Structured in `docs/` directory with comprehensive guides.
- **Branching Strategy**: Trunk-based development with strict PR reviews.

---

## 📁 Project Structure

```
nezuko-monorepo/
├── apps/
│   ├── web/          # Next.js 16 Admin Dashboard
│   ├── api/          # FastAPI REST Backend
│   └── bot/          # Telegram Bot (PTB v22.6)
├── packages/         # Shared packages
├── config/docker/    # Docker configuration
├── scripts/          # Utility scripts
├── storage/          # Runtime files (GITIGNORED)
├── docs/             # Public documentation
├── memory-bank/      # AI context (internal)
└── tests/            # Test suites
```

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

# Bot
cd apps/bot
python main.py
```

### Test Credentials

| User  | Access                                 | Role        |
| ----- | -------------------------------------- | ----------- |
| Owner | Telegram Login (BOT_OWNER_TELEGRAM_ID) | super_admin |

### Key Documentation

| Topic        | Location                          |
| ------------ | --------------------------------- |
| Full Docs    | `docs/README.md`                  |
| Tech Stack   | `docs/architecture/tech-stack.md` |
| Architecture | `docs/architecture/README.md`     |
| Contributing | `docs/contributing/README.md`     |

---

_Last Updated: 2026-02-04_
