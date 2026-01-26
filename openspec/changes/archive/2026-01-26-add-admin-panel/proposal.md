# Change: Add Web-Based Admin Panel for Nezuko Bot

## Why

Nezuko v1.0.0 is production-ready but lacks a web interface for bot management. Currently, all configuration requires SSH access, manual `.env` editing, and terminal commands. Bot owners need a **modern, secure, real-time dashboard** to:

1. **Monitor**: View bot status, metrics, and logs without SSH
2. **Manage**: Configure groups, channels, and settings via browser
3. **Analyze**: Visualize verification trends and growth metrics
4. **Collaborate**: Support multiple admins with role-based access

This change implements a **full-stack Admin Panel** with Next.js 16 frontend and FastAPI backend, following the comprehensive planning documentation in `docs/admin-panel/` (13 files, ~390KB).

## What Changes

### **BREAKING**
- None (additive change, bot core unchanged)

### **New Capabilities**
- **Admin Panel Core**: Monorepo infrastructure with Turborepo
- **Admin Panel Auth**: JWT ES256 authentication with Argon2id password hashing
- **Admin Panel API**: FastAPI REST endpoints for all CRUD operations
- **Admin Panel Frontend**: Next.js 16 dashboard with shadcn/ui components
- **Admin Panel Realtime**: WebSocket streaming for logs and metrics
- **Admin Panel Analytics**: Charts and data visualization with Recharts

### **Modified**
- `docker-compose.yml`: Add web, api, and caddy services
- Database schema: Add admin_users, admin_sessions, admin_audit_log, admin_config tables

## Impact

### Affected Specs
- `admin-commands` (minor: panel can trigger commands)
- `observability` (enhanced: metrics visible in dashboard)
- `persistence` (extended: new tables)

### Affected Code/Systems
- **New**: `apps/web/` (Next.js frontend)
- **New**: `apps/api/` (FastAPI backend)
- **Modified**: `docker/` (production compose files)
- **Modified**: `bot/database/models/` (shared ORM models)

### Documentation Reference
All implementation details are specified in:
- `docs/admin-panel/README.md` - Table of contents and overview
- `docs/admin-panel/01-REQUIREMENTS.md` - Functional & non-functional requirements
- `docs/admin-panel/02-ARCHITECTURE.md` - System architecture
- `docs/admin-panel/02a-FOLDER-STRUCTURE.md` - Folder structure & naming conventions
- `docs/admin-panel/03-TECH-STACK.md` - Technology choices (2026 versions)
- `docs/admin-panel/04-API-DESIGN.md` - REST API specification
- `docs/admin-panel/04a-ERROR-HANDLING.md` - Error handling & logging framework
- `docs/admin-panel/05-UI-WIREFRAMES.md` - Design system
- `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Page layouts & components
- `docs/admin-panel/06-IMPLEMENTATION.md` - Implementation roadmap
- `docs/admin-panel/07-SECURITY.md` - Core security framework
- `docs/admin-panel/07a-SECURITY-ADVANCED.md` - Infrastructure security
- `docs/admin-panel/08-DEPLOYMENT.md` - Deployment strategy

## Success Criteria

| Metric             | Target               | Validation          |
| ------------------ | -------------------- | ------------------- |
| Page Load (LCP)    | < 2.5s               | Lighthouse          |
| API Response (p95) | < 200ms              | Prometheus          |
| WebSocket Latency  | < 100ms              | Real-time test      |
| Test Coverage      | > 80%                | pytest-cov + vitest |
| Security           | OWASP 2025 compliant | Security audit      |
| Accessibility      | WCAG 2.1 AA          | axe-core            |

## Phases Overview

| Phase       | Focus                                | Duration | Milestone                    |
| ----------- | ------------------------------------ | -------- | ---------------------------- |
| **Phase 0** | Foundation (Monorepo, Docker, CI/CD) | 1 week   | M0: Dev environment ready    |
| **Phase 1** | Auth + Dashboard + CRUD              | 3 weeks  | M1 (Alpha): Core features    |
| **Phase 2** | Logs + Database + Analytics          | 2 weeks  | M2 (Beta): Advanced features |
| **Phase 3** | Audit + RBAC + Plugins               | 3 weeks  | M3 (RC): Enterprise features |
| **Phase 4** | Polish + Production                  | 1 week   | M4 (v1.0): Production ready  |

**Total Estimated Time**: 10 weeks

## Risk Assessment

| Risk                   | Probability | Impact   | Mitigation                         |
| ---------------------- | ----------- | -------- | ---------------------------------- |
| WebSocket complexity   | Medium      | High     | Use proven libraries, start early  |
| Scope creep            | High        | Medium   | Strict phase boundaries, MVP first |
| API breaking changes   | Medium      | Medium   | Version from day 1 (/api/v1/)      |
| Performance issues     | Low         | High     | Monitor early, optimize in Phase 4 |
| Security vulnerability | Low         | Critical | Security audit in Phase 4          |

## Approval Gate

**This proposal requires explicit approval before implementation begins.**

Reviewer checklist:
- [ ] Architecture aligns with bot core patterns
- [ ] Security requirements meet enterprise standards
- [ ] Performance targets are realistic
- [ ] Resource estimates are acceptable
- [ ] Risk mitigations are adequate
