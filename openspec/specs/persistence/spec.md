# persistence Specification

## Purpose
TBD - created by archiving change transform-to-production-saas. Update Purpose after archive.
## Requirements
### Requirement: Database Schema
The system SHALL implement a relational database schema supporting multi-tenant group-channel configurations with proper normalization and indexing.

#### Scenario: Schema initialization
- **WHEN** the bot starts for the first time
- **THEN** Alembic migrations create four tables: `owners`, `protected_groups`, `enforced_channels`, `group_channel_links`
- **AND** all foreign key constraints are established
- **AND** indexes are created on: `owner_id`, `enabled`, `group_id`, `channel_id`

#### Scenario: Many-to-many relationships
- **WHEN** a group is linked to a channel
- **THEN** the `group_channel_links` join table allows one group to enforce multiple channels
- **AND** allows one channel to protect multiple groups
- **AND** enforces UNIQUE constraint on (group_id, channel_id) pairs

### Requirement: Owner Management
The system SHALL track bot setup owners for accountability and authorization.

#### Scenario: Create owner record
- **WHEN** a user runs `/protect` for the first time
- **THEN** the system creates an `owners` record with: `user_id` (PK), `username`, `created_at`, `updated_at`
- **AND** subsequent setups by the same user reference the existing owner record

#### Scenario: Lookup owner
- **WHEN** querying who set up protection for a group
- **THEN** the system retrieves owner via: `SELECT owner.* FROM protected_groups JOIN owners ON owner_id WHERE group_id = ?`
- **AND** query completes in <10ms (indexed lookup)

### Requirement: Protected Groups Configuration
The system SHALL store group-level protection configuration with flexible parameters via JSONB.

#### Scenario: Create protected group
- **WHEN** an admin runs `/protect @Channel` in a group
- **THEN** the system inserts: `group_id` (PK), `owner_id` (FK), `group_title`, `enabled=TRUE`, `params={}`
- **AND** sets `created_at` and `updated_at` timestamps

#### Scenario: Store custom parameters
- **WHEN** custom configuration is added (future feature: custom warning text)
- **THEN** the system stores settings in `params` JSONB column (e.g., `{"warning_text": "Custom message"}`)
- **AND** retrieves parameters via `SELECT params->>'warning_text' FROM protected_groups WHERE group_id = ?`

#### Scenario: Soft delete (toggle protection)
- **WHEN** an admin runs `/unprotect`
- **THEN** the system updates `enabled = FALSE` instead of deleting the row
- **AND** verification logic skips groups where `enabled = FALSE`

### Requirement: Enforced Channels Registry
The system SHALL maintain a registry of all channels used for enforcement across all groups.

#### Scenario: Create channel record
- **WHEN** `/protect @MyChannel` is run for the first time
- **THEN** the system inserts: `channel_id` (PK), `channel_title`, `invite_link`, `created_at`
- **AND** subsequent groups linking the same channel reuse the existing record

#### Scenario: Update invite link
- **WHEN** a channel's invite link changes
- **THEN** the system updates `enforced_channels.invite_link` for that `channel_id`
- **AND** all groups linked to that channel use the updated link

### Requirement: Group-Channel Links
The system SHALL maintain relationships between protected groups and enforced channels via a join table.

#### Scenario: Link group to channel
- **WHEN** an admin runs `/protect @Channel`
- **THEN** the system inserts into `group_channel_links`: `group_id` (FK), `channel_id` (FK), `created_at`
- **AND** enforces UNIQUE constraint (prevents duplicate links)

#### Scenario: Query linked channels for a group
- **WHEN** a message is sent in a protected group
- **THEN** the system executes:
  ```sql
  SELECT ec.* FROM enforced_channels ec
  JOIN group_channel_links gcl ON ec.channel_id = gcl.channel_id
  WHERE gcl.group_id = ? AND (SELECT enabled FROM protected_groups WHERE group_id = ?) = TRUE
  ```
- **AND** query completes in <50ms (p95) via indexed join

#### Scenario: Unlink all channels
- **WHEN** an admin runs `/unprotect`
- **THEN** the system can optionally delete links: `DELETE FROM group_channel_links WHERE group_id = ?`
- **OR** keep links and rely on `protected_groups.enabled` flag (preferred for re-enabling)

### Requirement: Database Migrations
The system SHALL use Alembic for versioned schema migrations with rollback support.

#### Scenario: Initial migration
- **WHEN** deploying to a new environment
- **THEN** running `alembic upgrade head` creates all tables with indexes
- **AND** migration completes in <5 seconds

#### Scenario: Schema changes
- **WHEN** a new feature requires schema modification
- **THEN** a developer creates a new migration: `alembic revision --autogenerate -m "Add feature X"`
- **AND** reviews auto-generated SQL before applying
- **AND** applies via `alembic upgrade head`

#### Scenario: Rollback migration
- **WHEN** a migration causes issues
- **THEN** running `alembic downgrade -1` reverts the last migration
- **AND** database returns to previous schema state

### Requirement: Connection Pooling
The system SHALL use connection pooling to optimize database performance under concurrent load.

#### Scenario: Pool initialization
- **WHEN** the bot starts
- **THEN** SQLAlchemy creates a connection pool with: `pool_size=20`, `max_overflow=10`, `pool_timeout=30`
- **AND** connections are reused across requests (no per-request connection overhead)

#### Scenario: Pool exhaustion
- **WHEN** all 30 connections (20 + 10 overflow) are in use
- **THEN** new requests wait up to 30 seconds for an available connection
- **AND** if timeout exceeded, raise `TimeoutError` and log alert

#### Scenario: Graceful shutdown
- **WHEN** the bot receives shutdown signal (SIGTERM)
- **THEN** the system waits for active transactions to complete (up to 10 seconds)
- **AND** closes all database connections cleanly
- **AND** logs: "Database connections closed gracefully"

### Requirement: Query Performance
The system SHALL optimize database queries to meet performance targets via proper indexing.

#### Scenario: Index usage verification
- **WHEN** running `EXPLAIN ANALYZE` on key queries
- **THEN** output shows "Index Scan" (not "Seq Scan") for:
  - `SELECT * FROM protected_groups WHERE group_id = ?`
  - `SELECT * FROM group_channel_links WHERE group_id = ?`
  - `SELECT * FROM owners WHERE user_id = ?`

#### Scenario: Query latency measurement
- **WHEN** executing CRUD operations under load
- **THEN** p95 latency is <50ms for all queries
- **AND** monitored via `db_query_duration_seconds` Prometheus metric

### Requirement: SQLite Development Support
The system SHALL support SQLite as a development-time database to simplify local setup.

#### Scenario: SQLite initialization
- **WHEN** `DATABASE_URL=sqlite:///./gmbot.db` is set
- **THEN** the bot creates a local SQLite file
- **AND** all features work identically to PostgreSQL (schema compatible)

#### Scenario: Migration to PostgreSQL
- **WHEN** moving from SQLite (dev) to PostgreSQL (production)
- **THEN** the same Alembic migrations apply without modification
- **AND** data export/import is possible via standard SQL dumps

### Requirement: Data Integrity
The system SHALL enforce referential integrity and prevent orphaned records via foreign key constraints.

#### Scenario: Cascade delete owner
- **WHEN** an owner record is deleted (unusual, but possible)
- **THEN** all associated `protected_groups` are deleted via `ON DELETE CASCADE`
- **AND** orphaned `group_channel_links` are also removed (cascading from protected_groups)

#### Scenario: Prevent orphaned links
- **WHEN** attempting to insert `group_channel_links` with invalid `group_id` or `channel_id`
- **THEN** the database rejects the operation with foreign key constraint error
- **AND** the application logs the error and returns user-friendly message

### Requirement: Async Query Execution
The system SHALL use asynchronous SQLAlchemy to prevent blocking the event loop during database operations.

#### Scenario: Async session usage
- **WHEN** any handler needs database access
- **THEN** it uses `async with get_db_session() as session:` context manager
- **AND** queries are executed with `await session.execute()`
- **AND** the event loop remains responsive (other updates processed concurrently)

#### Scenario: Transaction handling
- **WHEN** multiple database operations are part of a single logical action
- **THEN** they are wrapped in a transaction: `async with session.begin():`
- **AND** if any operation fails, all changes are rolled back atomically

