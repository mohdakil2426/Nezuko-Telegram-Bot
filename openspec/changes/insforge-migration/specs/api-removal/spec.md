## ADDED Requirements

### Requirement: Delete apps/api directory
The system SHALL delete the entire `apps/api/` directory (~50 Python files) including all routes, models, services, schemas, core modules, and Alembic migrations.

#### Scenario: API directory removed
- **WHEN** Phase 5 cleanup runs
- **THEN** `apps/api/` no longer exists in the filesystem
- **THEN** no Python files from the API remain in the codebase

### Requirement: Delete API Python dependencies
The system SHALL delete `requirements/api.txt` and remove all API-specific packages (fastapi, uvicorn, sse-starlette, pydantic-settings for API, alembic) from any shared requirements files.

#### Scenario: API requirements removed
- **WHEN** Phase 5 cleanup runs
- **THEN** `requirements/api.txt` no longer exists
- **THEN** `fastapi`, `uvicorn`, `sse-starlette`, `alembic` are not listed in any requirements file

### Requirement: Update pyproject.toml
The system SHALL remove API-specific configurations from `pyproject.toml` including Alembic-related pylint exclusions and any API-specific tool settings.

#### Scenario: pyproject.toml cleaned
- **WHEN** Phase 5 cleanup runs
- **THEN** `pyproject.toml` does not reference `apps/api` in any tool configuration
- **THEN** Alembic-related exclusions are removed from pylint config

### Requirement: Update Turborepo configuration
The system SHALL update Turborepo's `turbo.json` to remove the API pipeline/task definitions since the API service no longer exists.

#### Scenario: Turborepo config updated
- **WHEN** Phase 5 cleanup runs
- **THEN** `turbo.json` does not reference an `api` app or pipeline

### Requirement: Update Docker configuration
The system SHALL update Docker configurations in `config/docker/` to remove the API service container and the PostgreSQL container (replaced by InsForge managed).

#### Scenario: Docker compose updated
- **WHEN** Phase 5 cleanup runs
- **THEN** Docker compose files do not define an `api` service
- **THEN** Docker compose files do not define a `postgres` service (InsForge managed)

### Requirement: Update nezuko.bat
The system SHALL update `nezuko.bat` to remove API start options from the service menu.

#### Scenario: Batch script updated
- **WHEN** Phase 5 cleanup runs
- **THEN** `nezuko.bat` does not offer "Start API" as a menu option

### Requirement: Remove NEXT_PUBLIC_API_URL references
The system SHALL remove all references to `NEXT_PUBLIC_API_URL` from `apps/web/.env.local`, `.env.example`, and any source files that construct API URLs.

#### Scenario: No API URL references remain
- **WHEN** Phase 5 cleanup is complete
- **THEN** `grep -r "NEXT_PUBLIC_API_URL" apps/web/` returns no results
- **THEN** `grep -r "API_URL" apps/web/src/` returns no results (excluding InsForge URLs)

### Requirement: Update memory-bank documentation
The system SHALL update all memory-bank files (projectbrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, progress.md) to reflect the new InsForge architecture.

#### Scenario: Memory bank reflects InsForge
- **WHEN** the migration is complete
- **THEN** memory-bank files describe the 2-tier architecture (Web + Bot + InsForge BaaS)
- **THEN** no references to FastAPI, Alembic, or `apps/api/` remain in memory-bank

### Requirement: Code quality passes after removal
After all API code is removed, all code quality tools SHALL pass with zero errors.

#### Scenario: Linters pass
- **WHEN** Phase 5 cleanup is complete
- **THEN** `ruff check apps/bot` passes with 0 errors
- **THEN** `pylint apps/bot` scores 10.00/10
- **THEN** `cd apps/web && bun run lint` passes with 0 warnings
- **THEN** `cd apps/web && bun run build` passes with 0 TypeScript errors
