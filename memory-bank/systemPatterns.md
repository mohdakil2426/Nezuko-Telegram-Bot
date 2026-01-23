# System Patterns

## Architecture
The system follows a standard Telegram Bot architecture:
1.  **Telegram Bot API**: The interface for interacting with Telegram.
2.  **Bot Logic (Backend)**: Python/Node.js application running on a server (VPS/Cloud Function).
3.  **Polling/Webhook**: Mechanism to receive updates from Telegram (Messages, Callback Queries).

## Key Components
1.  **Message Handler**: Intercepts every message in the group.
2.  **Membership Checker**: Calls `getChatMember` to verify user status in the channel.
3.  **Restriction Engine**: Calls `restrictChatMember` to mute/unmute users.
4.  **Interaction Manager**: Handles "Join" and "Verify" button clicks.

## Design Patterns
*   **Event-Driven**: Actions are triggered by Telegram events (New Message, Callback Query).
*   **Fail-Safe**: If API fails, default to "Allow" or "Block" (configurable) to avoid disruption.
*   **Stateless (Mostly)**: Core logic relies on Telegram's state (chat membership), though caching might be needed for performance.

## Data Flow
```mermaid
graph TD
    User[User] -->|Sends Message| Telegram
    Telegram -->|Update| Bot
    Bot -->|getChatMember| Telegram
    Telegram -->|Status| Bot
    Bot -->|restrictChatMember (if needed)| Telegram
    Bot -->|sendMessage (Warning)| User
```
