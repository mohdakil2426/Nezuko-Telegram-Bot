# Product Context

## Problem Statement
Group administrators often want to grow their associated channels by requiring group members to be subscribers. Manually checking and enforcing this is impossible at scale. Users need a system that automatically restricts non-subscribers while providing a smooth path to compliance.

**v2.0 Expansion**: Current solution works for one group-channel pair only. Administrators managing multiple groups need a self-service platform to configure enforcement across 100+ groups without manual `.env` file editing.

## Solution (v1.1)
An automated Telegram bot that acts as a gatekeeper. It listens to group messages, checks the sender's subscription status against the target channel, and restricts them if they haven't joined.
**v1.1 Update**: The bot now enforces "Strict Verification":
1.  **Instant Join Check**: Verifies users the moment they join the group.
2.  **Leave Detection**: Instantly revokes permissions if a user leaves the target channel.

## Solution (v2.0 - Planned)
A **multi-tenant SaaS platform** where administrators can:
1.  **Self-Service Setup**: Run `/protect @YourChannel` in any group (no manual configuration files)
2.  **Database-Driven**: All configuration stored in PostgreSQL, enabling 100+ groups simultaneously
3.  **High Performance**: <100ms verification latency, 1000+ verifications/min throughput
4.  **Production-Grade**: Prometheus metrics, Sentry error tracking, structured logging, health checks
5.  **Horizontal Scaling**: Multiple bot instances sharing Redis cache and database
6.  **Graceful Degradation**: Works without Redis (degraded performance, not broken)

## User Experience (v1.1)
1.  **New User Joins Group**: Bot -> "Welcome! Join @Channel to speak" -> User joins channel -> Clicks "I have joined" -> Bot unmutes.
2.  **User Leaves Channel**: Bot detects leave event -> Instantly mutes user in Group -> **Sends Warning**: "Permissions revoked, join back to chat".
3.  **Non-Member Speaks**: Message deleted -> Bot warns -> User verifies -> Bot unmutes.
4.  **Admin**: Adds bot to Group and Channel (as Admin) -> Sets `GROUP_ID` -> Bot handles the rest.

## User Experience (v2.0 - Planned)

### For Administrators
1.  **Setup** (One-Time):
    *   Add bot to Group as Admin
    *   Add bot to Channel as Admin
    *   Run `/protect @YourChannel` in the group
    *   Bot confirms: "🛡️ Protection Activated!"
2.  **Management**:
    *   `/status` - Check protection status, linked channels with @username
    *   `/unprotect` - Disable protection (soft delete, can re-enable)
    *   `/settings` - View/customize warning messages (future)
3.  **Multi-Group**: Same admin can protect 10, 50, 100+ groups with different channels each
4.  **UX Features**:
    *   Command menu (type `/` to see available commands)
    *   Inline keyboard navigation in private chat
    *   Beautiful welcome screen with personalized greeting

### For End Users
*   **Same UX as v1.1**: No user-facing changes, verification flow identical
*   **Faster**: <100ms latency (vs ~500ms in v1.1) due to Redis caching

## Success Metrics (v1.1)
*   Increase in channel subscribers from group participants.
*   Reduction in manual admin moderation workload.
*   Fast verification response time (< 1s).

## Success Metrics (v2.0)
**Performance**:
*   Verification latency: <100ms (p95)
*   Cache hit rate: >70%
*   Database query: <50ms (p95)
*   Throughput: 1000 verifications/min

**Adoption**:
*   Support 100+ protected groups simultaneously
*   <2 min setup time (from adding bot to first verification)
*   99.9% uptime

**Operational**:
*   Zero Telegram API bans (rate limiting works)
*   Error rate <1% (robust error handling)
*   Alert response time <5 min (Prometheus + Sentry)

