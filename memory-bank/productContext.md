# Product Context: Nezuko

## Problem Statement
Growing a Telegram channel while maintaining an active discussion group is a manual challenge. Community managers need a way to ensure group members are also channel subscribers without manually checking tens of thousands of users. Existing simple bots are often slow, lack multi-tenant support, or provide poor user feedback.

## The Nezuko Solution
Nezuko acts as a high-performance gatekeeper and multi-talented assistant for Telegram groups.

1.  **Instant Join Verification**: New members are checked and restricted immediately upon entering the group.
2.  **Continuous Enforcement**: Every message is verified against the linked channel's subscriber list.
3.  **Strict Leave Detection**: If a user leaves a mandatory channel, the bot instantly detects the event and revokes their messaging permissions in all linked groups.

## User Experience

### For Administrators (Self-Service Setup)
1.  **Activation**: Admin adds the bot to their Group and Channel.
2.  **Configuration**: In the group, the admin runs `/protect @YourChannel`.
3.  **Confirmation**: The bot validates permissions and stores the link in the database.
4.  **Monitoring**: Admins use `/status` to see link health and `/settings` for configuration details.

### For Group Members (Seamless Verification)
1.  **Restriction**: If unverified, the user's message is deleted and they are muted.
2.  **Guidance**: The bot sends a personalized message with a direct "Join Channel" button and a "Verify" button.
3.  **Instant Access**: Upon joining and clicking "Verify", the user is unmuted in <100ms.

## Admin Panel (Planned)
A web-based dashboard for bot owners to manage everything from a browser:

### Target Users
- **Bot Owners**: Full control over all settings and configurations
- **Admins**: Manage groups and channels, view analytics
- **Viewers**: Read-only access to dashboards and logs

### Key Features
1.  **Dashboard**: Real-time metrics, bot status, activity feed
2.  **Groups/Channels**: Browse and manage all protected groups and channels
3.  **Configuration**: Edit bot settings without SSH access
4.  **Logs**: Real-time log streaming via WebSocket
5.  **Database Browser**: View and manage database tables
6.  **Analytics**: Charts and graphs for verification trends

### Technology Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: FastAPI, Python 3.13+, Pydantic V2
- **Database**: Shared PostgreSQL with bot
- **Cache**: Shared Redis with bot
- **Auth**: Firebase Auth (Identity & User Management)

## Success Metrics
*   **Performance**: p95 verification latency <100ms.
*   **Efficiency**: >90% reduction in manual moderation for membership enforcement.
*   **Reliability**: Support for 100+ groups per bot instance with built-in rate limiting and graceful degradation.
*   **Admin Panel**: <2.5s LCP, 60fps animations, enterprise-grade security (OWASP 2025).
