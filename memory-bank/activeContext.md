# Active Context: Nezuko - The Ultimate All-In-One Bot

## Current Status
Nezuko **v1.0.0** is officially **Release Ready**. The engine is fully stabilized across 16 different event handlers, the database schema is complete, and the code quality score has been optimized to 10.00/10. All internal development cycles have been merged into the baseline production version.

## Recent Session Updates (2026-01-24)
*   **AGENTS.md Updated**: Added "Mandatory Reading for Code Generation" section referencing `@docs/official-rules-docs/python-telegram-bot-rules.md` for AI assistants.
*   **GEMINI.md Updated**: Identical update to AGENTS.md for Gemini-based assistants.
*   **Version Standardization**: Fixed all version references to 1.0.0 across the codebase:
    - `pyproject.toml`: 2.0.0 → 1.0.0
    - `docs/architecture/architecture.md`: 2.0.0 → 1.0.0
    - Verified: `bot/__init__.py`, `health.py`, `logging.py`, `sentry.py` already at 1.0.0
*   **README.md Redesign**: Complete overhaul following 2025-2026 GitHub README best practices:
    - Hero section with centered banner and modern flat-square badges
    - Badge groups organized by category (Version, Quality, Tech Stack)
    - ASCII architecture diagram
    - Collapsible Table of Contents
    - 2x2 HTML feature grid
    - Performance metrics table with benchmarks
    - Tech stack with for-the-badge visual badges
    - Collapsible sections for Tests, Code Quality, Migrations, Troubleshooting
    - Professional centered footer

## Key Release Features
*   **Multi-Tenant Setup**: `/protect @YourChannel` allows any admin to activate protection instantly without restarting the bot.
*   **Zero-Trust Security**: Multi-channel verification for new joins, existing messages, and real-time leave detection.
*   **Interactive UI**: Full inline keyboard navigation in private chats and interactive verification buttons in groups.
*   **Observability**: Real-time Prometheus metrics at `/metrics` and health checks at `/health`.
*   **Resilience**: Graceful Redis degradation and exponential backoff retry logic on all Telegram API calls.

## Code Quality Achievements
*   **Pylint Score**: 10.00/10.0
*   **Static Analysis**: Pyrefly Passed (0 errors)
*   **Tests**: 37+ tests validated across edge cases, handlers, and performance benchmarks
*   **Version**: Consistently 1.0.0 across all files

## Active Decisions
*   **Stateless Scaling**: Confirmed that all session data resides in Redis/PostgreSQL, allowing for horizontal scaling behind a load balancer.
*   **Strict vs. Permissive**: Defaulting to "Strict" mode where membership checks are required for every message to prevent community gaming.
*   **Unified Logger**: Using `structlog` as the primary engine for both human-readable console output and machine-readable JSON files.
*   **AI Assistant Guidelines**: Mandatory reading of coding rules document before code generation.

## Next Steps
1.  **Release Deployment**: Perform the official production launch v1.0.0.
2.  **Infrastructure Setup**: Configure Nginx reverse proxy for webhook mode.
3.  **Alerting Configuration**: Hook Prometheus metrics into Grafana/Alertmanager for 24/7 monitoring.
4.  **Community Maintenance**: Monitor for edge cases in highly populated groups (>50k users).
5.  **Banner Asset**: Create `docs/assets/nezuko-banner.svg` for README hero section.
