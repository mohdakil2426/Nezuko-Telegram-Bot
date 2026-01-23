# Active Context

## Current Status
**Planning Phase: v2.0 Production SaaS Transformation**. The v1.1 single-instance bot is complete and functional. We're now in the planning stage for transforming it into a production-ready multi-tenant SaaS platform.

## Recent Changes
*   **OpenSpec Proposal Created** (2026-01-23): Comprehensive proposal for `transform-to-production-saas` validated and ready
*   **Documentation**: Created 3 core documents (proposal.md, design.md, tasks.md) and 6 spec deltas
*   **Scope Defined**: 4 development phases (Foundation, Multi-Tenancy, Scale & Performance, Monitoring)
*   **Architecture Designed**: Modular monolith with PostgreSQL, Redis, AIORateLimiter, Prometheus, Sentry
*   **Timeline Estimated**: 4-5 weeks of development work across 100+ granular tasks

## Active Decisions
*   **Modular Monolith Architecture**: Chose simplicity over microservices for easier operations
*   **PostgreSQL + SQLAlchemy Async**: Production-grade persistence with Alembic migrations
*   **Redis with TTL Jitter**: Distributed caching to prevent thundering herd scenarios
*   **Priority Queue Rate Limiting**: User interactions (P0) always prioritized over bulk operations (P2)
*   **Auto-Detect Mode**: Polling for dev, Webhooks for production based on environment variables
*   **Deployment Deferred**: Focus on development phases 1-4 first; deployment (Phase 5) comes after validation

## Key Architectural Patterns
*   **Database-Driven Multi-Tenancy**: Replace `.env` config with self-service `/protect` command
*   **Graceful Degradation**: Bot works without Redis (degraded performance, not broken)
*   **Many-to-Many Relationships**: One channel protects many groups, one group requires many channels
*   **Zero Data Loss Migration**: v1.1 has no persistent state, so migration is clean

## Next Steps
1.  **Review OpenSpec Proposal**: Examine `proposal.md`, `design.md`, `tasks.md` in `openspec/changes/transform-to-production-saas/`
2.  **Approve Proposal**: Confirm scope, timeline, and architectural decisions
3.  **Begin Phase 1 Implementation**: Start with modular architecture + PostgreSQL foundation
4.  **Setup Development Environment**: Install PostgreSQL 16+, Redis 7+, update dependencies

## Current Focus
**Status**: Awaiting proposal approval before implementation begins  
**Blocking**: None - proposal is validated and ready  
**Risk**: Timeline assumes sequential work; parallelizing Phase 3 + 4 can reduce to 4 weeks
