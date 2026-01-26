## ADDED Requirements

### Requirement: Admin Panel Core Infrastructure
The system SHALL provide a monorepo infrastructure using Turborepo for managing the admin panel frontend and backend as separate applications.

#### Scenario: Monorepo initialization
- **WHEN** developer runs `pnpm install` at root
- **THEN** all workspace dependencies are installed
- **AND** shared packages are linked

#### Scenario: Development environment startup
- **WHEN** developer runs `docker compose -f docker/compose/docker-compose.dev.yml up`
- **THEN** PostgreSQL, Redis, web, and api services start
- **AND** hot-reload is enabled for both frontend and backend

#### Scenario: CI/CD pipeline execution
- **WHEN** code is pushed to repository
- **THEN** GitHub Actions runs lint, type-check, and test jobs
- **AND** build job creates production artifacts

---

### Requirement: Admin Panel Folder Structure
The system SHALL organize code following the structure defined in `docs/admin-panel/02a-FOLDER-STRUCTURE.md`.

#### Scenario: Frontend folder structure
- **WHEN** browsing `apps/web/src/`
- **THEN** folders exist: app/, components/, lib/, stores/, providers/, types/
- **AND** naming conventions match specification (kebab-case files, PascalCase components)

#### Scenario: Backend folder structure
- **WHEN** browsing `apps/api/src/`
- **THEN** folders exist: api/, core/, models/, schemas/, services/, middleware/, utils/
- **AND** naming conventions match specification (snake_case files)

---

### Requirement: Shared Type Definitions
The system SHALL provide shared TypeScript type definitions for API contracts.

#### Scenario: Type package usage
- **WHEN** frontend imports from `@packages/types`
- **THEN** API response types are available
- **AND** model types are available

#### Scenario: Type synchronization
- **WHEN** API schema changes in Pydantic
- **THEN** TypeScript types can be regenerated from OpenAPI spec
