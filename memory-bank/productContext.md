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

## Success Metrics
*   **Performance**: p95 verification latency <100ms.
*   **Efficiency**: >90% reduction in manual moderation for membership enforcement.
*   **Reliability**: Support for 100+ groups per bot instance with built-in rate limiting and graceful degradation.
