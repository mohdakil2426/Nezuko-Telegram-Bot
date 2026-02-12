# Active Context: Current State

## Current Status

**Date**: 2026-02-12
**Phase**: Phase 53 - Monorepo & Web Tooling Upgrade
**Branch**: `feat/full-stack-integration`

---

## Recent Work Completed

### Phase 53: Monorepo & Web Tooling Polish (2026-02-12)

Major upgrade to frontend tooling and repository configuration to align with "Pro-Max" standards for Next.js 16 and React 19.

#### Web Tooling Upgrades
1.  **React Compiler Integration**:
    *   Enabled `experimental.reactCompiler` in `next.config.ts`.
    *   Added `eslint-plugin-react-compiler` to enforce auto-memoization rules.
2.  **Dead Code Detection**:
    *   Implemented **Knip** (`knip.json`) to detect unused files, exports, and dependencies.
3.  **Tailwind Class Sorting**:
    *   Added `prettier-plugin-tailwindcss` to root `.prettierrc`.
    *   Automated class sorting for consistent `shadcn/ui` usage.

#### Monorepo Configuration Cleanup
1.  **Consolidated Prettier**:
    *   Merged `apps/web/.prettierrc` into root `.prettierrc`.
    *   Removed redundant config to ensure a single source of truth.
2.  **Verified Python Config**:
    *   Confirmed `pyproject.toml` separation (Root for tools, Apps for dependencies) is correct for Docker-based architecture.

#### Audit & Compliance
*   **Full Codebase Audit**: Generated `CODEBASE_AUDIT_REPORT.md` confirming 98% alignment with project skills.
*   **Documentation Alignment**: Removed deprecated SQLite references from `techContext.md` and `projectbrief.md`.

#### Tool Results (Current)
| Tool | Status |
| :--- | :--- |
| **Next.js Build** | ✅ Success (React Compiler enabled) |
| **ESLint** | ✅ 0 warnings (React Compiler rules active) |
| **Pylint** | ✅ 10.00/10 |
| **Ruff** | ✅ 0 errors |

---

## Running the Application

```bash
# All services
./nezuko.bat  # Select [4] Start Services → [1] Start ALL

# Individual services
python -m apps.bot.main                              # Bot
cd apps/api && uvicorn src.main:app --reload --port 8080  # API
cd apps/web && bun dev                               # Web
```

---

## Quality Commands

```bash
# Python (from project root)
ruff check apps/bot apps/api                    # Lint
ruff format .                                   # Format
pylint apps/bot apps/api --rcfile=pyproject.toml # Score check
.venv/Scripts/python.exe -m pyrefly check       # Type check

# TypeScript
cd apps/web && bun run lint                     # ESLint
cd apps/web && bun run build                    # TypeScript
```

---

## Next Steps

1. Run full test suite (`pytest`)
2. Test all endpoints with PostgreSQL
3. Verify dashboard charts display real data
4. Deploy to staging

---

_Last Updated: 2026-02-10_
