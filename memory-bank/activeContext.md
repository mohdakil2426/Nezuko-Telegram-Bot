# Active Context

## Current Status
**Project Active (v1.1)**. The Channel Verification Bot has been upgraded with **Strict Verification Mode**. It now proactively polices user joins and channel leaves, rather than just reacting to messages.

## Recent Changes
*   **Feature (Strict Leave Detection)**: Implemented `ChatMemberHandler` to detect when a user *leaves* the channel. If they do, they are immediately restricted in the group.
*   **Feature (Instant Join Check)**: Added `NEW_CHAT_MEMBERS` handler to verify users the moment they join the group, providing an immediate verification prompt.
*   **Refactor**: Updated `check_membership` logic to be robust against text/ID channel configurations.
*   **Requirement**: Made `GROUP_ID` mandatory for the strict leave detection feature to work.

## Active Decisions
*   **Strict Enforcement**: We logic now prioritizes "Zero Trust". New members are checked instantly, and existing members are watched for channel exit events.
*   **Admin Requirement**: The bot **MUST** be an Admin in the Channel to receive `ChatMember` updates. This is a critical setup step for the user.

## Next Steps
*   Restart the bot to apply changes.
*   Verify that `GROUP_ID` is set in `.env` (Confirmed: `@astrixforge`).
*   Ensure Bot is Admin in `@devicemasker` channel.
