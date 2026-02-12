## ADDED Requirements

### Requirement: Backup apps directory before migration
The system SHALL create a complete copy of the `apps/` directory to `docs/local/backup-YYYY-MM-DD-HHMMSS/apps/` before any migration changes are made. The backup MUST be an exact copy with no modifications.

#### Scenario: Backup created with timestamp
- **WHEN** the migration begins (before Phase 1)
- **THEN** the system creates `docs/local/backup-2026-02-12-143000/apps/` (with actual datetime)
- **THEN** the directory contains exact copies of `apps/web/`, `apps/api/`, and `apps/bot/`

#### Scenario: Backup is unmodified
- **WHEN** the backup is created
- **THEN** no files in the backup directory are modified, renamed, or deleted
- **THEN** the backup represents the exact pre-migration state of the codebase

#### Scenario: Backup directory structure
- **WHEN** the backup completes
- **THEN** `docs/local/backup-<datetime>/apps/web/` exists with all web files
- **THEN** `docs/local/backup-<datetime>/apps/api/` exists with all API files
- **THEN** `docs/local/backup-<datetime>/apps/bot/` exists with all bot files

### Requirement: docs/local directory gitignored
The `docs/local/` directory SHALL be added to `.gitignore` to prevent backup files from being committed to the repository.

#### Scenario: Gitignore updated
- **WHEN** the backup is created
- **THEN** `docs/local/` is listed in `.gitignore`
- **THEN** `git status` does NOT show backup files as untracked
