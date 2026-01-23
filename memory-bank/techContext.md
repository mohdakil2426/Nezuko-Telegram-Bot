# Technical Context

## Technology Stack
*   **Language**: Python (Recommended: `python-telegram-bot`) or Node.js (`Telegraf`).
*   **Platform**: Windows (Local Dev), VPS/Cloud (Production).
*   **API**: Telegram Bot API.

## Critical Dependencies
1.  **Telegram Bot Library**: For API interaction.
2.  **Async/Await**: For non-blocking API calls.

## Development Setup
1.  **BotFather**: To create bot and get token.
2.  **Environment Variables**: Store `BOT_TOKEN`, `CHANNEL_ID`, `GROUP_ID`.
3.  **Logging**: Standard logging for debugging and audit.

## Constraints
*   **Rate Limits**: Telegram allows ~30 messages/sec.
*   **Admin Rights**: Bot requires 'Admin' status in both Channel and Group to function.
*   **Latency**: Verification must be fast (<1s) to prevent spam.
