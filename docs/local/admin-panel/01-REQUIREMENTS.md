# 📋 Requirements Specification

> **Nezuko Admin Panel - Functional & Non-Functional Requirements**

---

## 1. Executive Summary

### 1.1 Purpose

The Nezuko Admin Panel provides bot owners with a comprehensive web interface to manage, monitor, and configure their Telegram bot instance without requiring direct server access or technical command-line knowledge.

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Bot management & monitoring | End-user facing features |
| Group/Channel configuration | Telegram user dashboard |
| Real-time log viewing | Payment processing |
| Database administration | Mobile native app (v1) |
| System configuration | White-label/multi-tenant SaaS |

### 1.3 Target Users

| User Type | Description | Access Level |
|-----------|-------------|--------------|
| **Bot Owner** | Primary administrator, full control | Full Access |
| **Co-Admin** | Trusted helper with limited permissions | Configurable |
| **Viewer** | Read-only access for monitoring | Read Only |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

#### FR-AUTH-001: Owner Login
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Bot owner must be able to log in with email/password |
| **Acceptance Criteria** | - Login form with email + password<br>- JWT token issued on success<br>- Session persisted in secure cookie<br>- Failed attempts logged |

#### FR-AUTH-002: JWT Token Management
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Secure token-based authentication |
| **Acceptance Criteria** | - Access token: 15 min expiry<br>- Refresh token: 7 day expiry<br>- Token rotation on refresh<br>- Blacklist on logout |

#### FR-AUTH-003: Telegram OAuth (Future)
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Login via Telegram account |
| **Acceptance Criteria** | - Telegram Login Widget integration<br>- Link Telegram ID to admin account |

#### FR-AUTH-004: Role-Based Access Control
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Granular permission system |
| **Acceptance Criteria** | - Predefined roles: Owner, Admin, Viewer<br>- Custom role creation<br>- Permission matrix for features |

---

### 2.2 Dashboard

#### FR-DASH-001: Overview Panel
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | At-a-glance system status |
| **Acceptance Criteria** | - Bot online/offline status<br>- Uptime percentage (24h, 7d, 30d)<br>- Current memory/CPU usage<br>- Last restart timestamp |

#### FR-DASH-002: Quick Statistics
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Key metrics cards |
| **Acceptance Criteria** | - Total protected groups<br>- Total enforced channels<br>- Total verifications (today/week/month)<br>- Success rate percentage |

#### FR-DASH-003: Activity Feed
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Recent events timeline |
| **Acceptance Criteria** | - Last 20 significant events<br>- Event types: Join, Verify, Error, Config Change<br>- Timestamps in user's timezone<br>- Click to view details |

#### FR-DASH-004: Alert Banner
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | System-wide notifications |
| **Acceptance Criteria** | - Critical errors highlighted in red<br>- Warnings in yellow<br>- Dismissible alerts<br>- Persistent until resolved |

---

### 2.3 Groups Management

#### FR-GROUP-001: List Protected Groups
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | View all bot-protected groups |
| **Acceptance Criteria** | - Paginated table (25 per page)<br>- Columns: Name, ID, Members, Linked Channels, Status<br>- Search by name or ID<br>- Sort by any column |

#### FR-GROUP-002: View Group Details
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Detailed group information |
| **Acceptance Criteria** | - Group metadata (name, ID, created)<br>- Linked channels list<br>- Recent verification logs<br>- Current settings |

#### FR-GROUP-003: Configure Group Settings
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Modify group configuration |
| **Acceptance Criteria** | - Enable/disable protection<br>- Add/remove channel links<br>- Custom welcome message<br>- Restriction settings |

#### FR-GROUP-004: Bulk Operations
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Multi-select actions |
| **Acceptance Criteria** | - Select multiple groups<br>- Bulk enable/disable<br>- Bulk export data<br>- Confirmation dialog |

---

### 2.4 Channels Management

#### FR-CHAN-001: List Enforced Channels
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | View all channels requiring membership |
| **Acceptance Criteria** | - Paginated table<br>- Columns: Name, ID, Subscribers, Linked Groups<br>- Search and filter |

#### FR-CHAN-002: Channel Statistics
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Per-channel analytics |
| **Acceptance Criteria** | - Total verifications via this channel<br>- Success/failure rates<br>- Member count trend |

#### FR-CHAN-003: Add New Channel
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Register new channel for enforcement |
| **Acceptance Criteria** | - Input: Channel ID or @username<br>- Validate bot is admin in channel<br>- Fetch channel metadata automatically |

---

### 2.5 Configuration Management

#### FR-CONF-001: Environment Variables Editor
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Visual .env management |
| **Acceptance Criteria** | - View all current variables<br>- Edit values with validation<br>- Sensitive values masked<br>- Restart prompt after changes |

#### FR-CONF-002: Rate Limit Settings
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Configure API rate limits |
| **Acceptance Criteria** | - Global rate limit slider<br>- Per-group rate limit option<br>- Current usage display |

#### FR-CONF-003: Webhook Configuration
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Webhook mode settings |
| **Acceptance Criteria** | - Toggle webhook/polling mode<br>- Webhook URL configuration<br>- SSL certificate status<br>- Test webhook button |

#### FR-CONF-004: Message Templates
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Customize bot messages |
| **Acceptance Criteria** | - Welcome message template<br>- Verification prompt template<br>- Error message template<br>- Variable placeholders ({{username}}, etc.) |

---

### 2.6 Logs & Monitoring

#### FR-LOG-001: Real-time Log Viewer
| Attribute | Value |
|-----------|-------|
| **Priority** | P0 (Critical) |
| **Description** | Live log streaming |
| **Acceptance Criteria** | - WebSocket-based streaming<br>- Color-coded by level (DEBUG, INFO, WARN, ERROR)<br>- Pause/resume streaming<br>- Auto-scroll toggle |

#### FR-LOG-002: Log Filtering
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Advanced log search |
| **Acceptance Criteria** | - Filter by log level<br>- Filter by time range<br>- Filter by group ID<br>- Full-text search |

#### FR-LOG-003: Log Export
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Download logs |
| **Acceptance Criteria** | - Export as JSON<br>- Export as CSV<br>- Export as plain text<br>- Date range selection |

#### FR-LOG-004: Metrics Dashboard
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Prometheus metrics visualization |
| **Acceptance Criteria** | - Request latency charts<br>- Error rate graphs<br>- Cache hit ratio<br>- Database query times |

---

### 2.7 Database Management

#### FR-DB-001: Table Browser
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | View database tables |
| **Acceptance Criteria** | - List all tables<br>- View table schema<br>- Browse records with pagination<br>- Basic filtering |

#### FR-DB-002: Data Export
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Export database data |
| **Acceptance Criteria** | - Export table to CSV<br>- Export table to JSON<br>- Full database backup (PostgreSQL dump) |

#### FR-DB-003: Migration Runner
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Run Alembic migrations |
| **Acceptance Criteria** | - View pending migrations<br>- Run upgrade command<br>- View migration history<br>- Rollback option (with confirmation) |

#### FR-DB-004: Query Explorer (Advanced)
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Future) |
| **Description** | Run custom SQL queries |
| **Acceptance Criteria** | - Read-only by default<br>- Syntax highlighting<br>- Result pagination<br>- Query history |

---

### 2.8 Analytics

#### FR-ANA-001: User Growth Chart
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Track user growth over time |
| **Acceptance Criteria** | - Line chart showing daily/weekly/monthly users<br>- Cumulative total line<br>- Export data option |

#### FR-ANA-002: Verification Trends
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Important) |
| **Description** | Verification activity over time |
| **Acceptance Criteria** | - Bar chart: daily verifications<br>- Success vs failure breakdown<br>- Comparison with previous period |

#### FR-ANA-003: Peak Usage Analysis
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Identify high-traffic times |
| **Acceptance Criteria** | - Heatmap by hour/day<br>- Peak hour identification<br>- Timezone-aware display |

---

### 2.9 Plugin System (Phase 3)

#### FR-PLUG-001: Plugin Manager
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | Install and manage plugins |
| **Acceptance Criteria** | - List installed plugins<br>- Enable/disable plugins<br>- Plugin configuration UI<br>- Version information |

#### FR-PLUG-002: Plugin API
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Nice to Have) |
| **Description** | API for plugin developers |
| **Acceptance Criteria** | - Hook system for events<br>- Route registration<br>- Database access helpers<br>- Documentation |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR-PERF-001** | Page load time < 2s | Lighthouse score |
| **NFR-PERF-002** | API response time < 200ms (p95) | Prometheus metrics |
| **NFR-PERF-003** | WebSocket latency < 100ms | Real-time measurement |
| **NFR-PERF-004** | Support 100 concurrent admin sessions | Load testing |

### 3.2 Security

| Requirement | Description |
|-------------|-------------|
| **NFR-SEC-001** | All traffic over HTTPS (TLS 1.3) |
| **NFR-SEC-002** | JWT tokens with secure signing (HS256 minimum) |
| **NFR-SEC-003** | Password hashing with Argon2id |
| **NFR-SEC-004** | Rate limiting: 100 requests/minute per IP |
| **NFR-SEC-005** | CSRF protection on state-changing endpoints |
| **NFR-SEC-006** | XSS prevention via Content Security Policy |
| **NFR-SEC-007** | SQL injection prevention via parameterized queries |
| **NFR-SEC-008** | Audit logging for all admin actions |

### 3.3 Reliability

| Requirement | Target |
|-------------|--------|
| **NFR-REL-001** | 99.9% uptime (8.7h downtime/year max) |
| **NFR-REL-002** | Graceful degradation if database unavailable |
| **NFR-REL-003** | Auto-recovery from crashes |
| **NFR-REL-004** | Data backup every 24 hours |

### 3.4 Scalability

| Requirement | Description |
|-------------|-------------|
| **NFR-SCA-001** | Horizontal scaling for API layer |
| **NFR-SCA-002** | Stateless design for load balancing |
| **NFR-SCA-003** | Connection pooling for database (20 connections) |
| **NFR-SCA-004** | Redis for session storage (multi-instance ready) |

### 3.5 Usability

| Requirement | Description |
|-------------|-------------|
| **NFR-USA-001** | Responsive design (mobile, tablet, desktop) |
| **NFR-USA-002** | Dark mode support |
| **NFR-USA-003** | Keyboard navigation support |
| **NFR-USA-004** | Loading indicators for all async operations |
| **NFR-USA-005** | Error messages with actionable guidance |

### 3.6 Maintainability

| Requirement | Description |
|-------------|-------------|
| **NFR-MAI-001** | 80%+ code test coverage |
| **NFR-MAI-002** | Type safety (TypeScript strict mode, Python type hints) |
| **NFR-MAI-003** | Automated linting (ESLint, Ruff) |
| **NFR-MAI-004** | API versioning (/api/v1/) |
| **NFR-MAI-005** | OpenAPI documentation auto-generated |

---

## 4. Constraints

### 4.1 Technical Constraints

| Constraint | Reason |
|------------|--------|
| Must use PostgreSQL | Existing bot database |
| Must use Python for API | Consistency with bot codebase |
| Must run on single VPS | GitHub Student Pack budget |
| Docker deployment required | Existing infrastructure |

### 4.2 Business Constraints

| Constraint | Reason |
|------------|--------|
| $0 hosting budget (Year 1) | GitHub Student Pack only |
| Single developer initially | Resource limitation |
| No third-party SaaS dependencies | Self-hosted requirement |

---

## 5. Assumptions

1. Bot owner has basic web browsing knowledge
2. Server has minimum 2GB RAM for all services
3. PostgreSQL and Redis are already running
4. Domain name is available via Namecheap (GitHub Student Pack)
5. Modern browser (Chrome, Firefox, Safari, Edge) is used

---

## 6. Glossary

| Term | Definition |
|------|------------|
| **Protected Group** | Telegram group where bot enforces channel membership |
| **Enforced Channel** | Telegram channel that users must join for group access |
| **Verification** | Process of checking if user is subscribed to required channels |
| **Bot Owner** | Primary administrator who controls the bot instance |
| **JWT** | JSON Web Token - secure token for authentication |
| **WebSocket** | Protocol for real-time bidirectional communication |

---

[← Back to Index](./README.md) | [Next: Architecture →](./02-ARCHITECTURE.md)
