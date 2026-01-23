# Technical Context

## Technology Stack
*   **Language**: Python 3.13+
*   **Library**: `python-telegram-bot` v20.8+ (Async, HTTPX backend).
*   **Platform**: Windows (Local Development), ready for any Python-supported OS.

## Critical Dependencies
1.  **python-telegram-bot**: Core wrapper.
2.  **python-dotenv**: For managing secrets.

## Development Setup
1.  **Virtual Environment**: `venv` created to isolate dependencies.
2.  **Environment Variables**:
    *   `BOT_TOKEN`: The bot's API key.
    *   `CHANNEL_ID`: ID/Username of the channel to enforce.
    *   `CHANNEL_URL`: Public link for users to join.
    *   `GROUP_ID`: ID/Username of the group (optional filter).
3.  **Logging**: `logging` library configured for INFO level, with specific HTTPX request logging.

## Constraints & Solutions
*   **Permission Deprecation**: `can_send_media_messages` was removed. **Solution**: Use specific flags (`can_send_photos`, `can_send_videos`, etc.).
*   **Latency**: Polling can be slow. **Solution**: `concurrent_updates(True)` and caching.
*   **Rate Limits**: Telegram limits API calls. **Solution**: Membership checks are cached for 5 minutes.
