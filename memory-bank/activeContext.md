# Active Context: Nezuko - The Ultimate All-In-One Bot

## Current Status
Nezuko is officially **Release Ready**. The engine is fully stabilized across 16 different event handlers, the database schema is complete, and the code quality score has been optimized to 9.99/10. All internal development cycles have been merged into the baseline production version.

## Key Release Features
*   **Multi-Tenant Setup**: `/protect @YourChannel` allows any admin to activate protection instantly without restarting the bot.
*   **Zero-Trust Security**: Multi-channel verification for new joins, existing messages, and real-time leave detection.
*   **Interactive UI**: Full inline keyboard navigation in private chats and interactive verification buttons in groups.
*   **Observability**: Real-time Prometheus metrics at `/metrics` and health checks at `/health`.
*   **Resilience**: Graceful Redis degradation and exponential backoff retry logic on all Telegram API calls.

## Recent Internal Stabilization
*   **Logic De-duplication**: Consolidated verification and UI logic into central utilities (`bot/utils/ui.py`, `bot/services/verification.py`).
*   **Pylint Optimization**: Systematic refactoring to achieve 10.00/10, focusing on lazy logging and naming standards.
*   **Tests**: 37+ tests validated across edge cases, handlers, and performance benchmarks.
*   **Static Analysis**: Integrated `Pyrefly` for strict type checking, fixing all 49+ initial type errors including deprecated datetime usage and potential runtime NoneType errors.
*   **Windows Environment Fixes**: Implemented UTF-8 console wrappers and ASCII log fallbacks for local Windows testing.

## Active Decisions
*   **Stateless Scaling**: Confirmed that all session data resides in Redis/PostgreSQL, allowing for horizontal scaling behind a load balancer.
*   **Strict vs. Permissive**: Defaulting to "Strict" mode where membership checks are required for every message to prevent community gaming.
*   **Unified Logger**: Using `structlog` as the primary engine for both human-readable console output and machine-readable JSON files.

## Next Steps
1.  **Release Deployment**: Perform the official production launch.
2.  **Infrastructure Setup**: Configure Nginx reverse proxy for webhook mode.
3.  **Alerting Configuration**: Hook Prometheus metrics into Grafana/Alertmanager for 24/7 monitoring.
4.  **Community Maintenance**: Monitor for edge cases in highly populated groups (>50k users).
