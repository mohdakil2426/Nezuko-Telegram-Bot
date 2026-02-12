## ADDED Requirements

### Requirement: InsForge SDK client singleton
The system SHALL provide a single InsForge SDK client instance at `apps/web/src/lib/insforge.ts` that all service files import. The client MUST be initialized with `NEXT_PUBLIC_INSFORGE_BASE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` environment variables.

#### Scenario: Client initialization
- **WHEN** any service file imports the InsForge client
- **THEN** it receives a pre-configured `createClient()` instance pointing to the InsForge backend

#### Scenario: Missing environment variables
- **WHEN** `NEXT_PUBLIC_INSFORGE_BASE_URL` or `NEXT_PUBLIC_INSFORGE_ANON_KEY` is not set
- **THEN** the application SHALL fail at build time with a clear error message

### Requirement: Dashboard stats via RPC
The system SHALL provide a `get_dashboard_stats` PostgreSQL function that returns total_groups, total_channels, verifications_today, verifications_week, success_rate, bot_uptime_seconds, and cache_hit_rate. The dashboard service SHALL call `insforge.database.rpc('get_dashboard_stats')`.

#### Scenario: Dashboard stats loaded
- **WHEN** the dashboard page loads
- **THEN** the system calls `get_dashboard_stats` RPC and displays all 7 stat values

#### Scenario: No verification data
- **WHEN** the verification_log table is empty
- **THEN** the function returns 0 for all verification metrics and rates

### Requirement: Groups CRUD via InsForge SDK
The system SHALL support listing, filtering, searching, and updating protected groups via `insforge.database.from('protected_groups')` queries with embedded relationship loading for channel_links.

#### Scenario: List groups with pagination
- **WHEN** the groups page requests page 2 with 20 items per page
- **THEN** the service calls `.range(20, 39)` and returns the correct page with total count

#### Scenario: Search groups by title
- **WHEN** the user searches for "crypto"
- **THEN** the service applies `.ilike('title', '%crypto%')` and returns matching groups

#### Scenario: Update group enabled status
- **WHEN** the admin toggles a group's enabled status
- **THEN** the service calls `.update({ enabled }).eq('group_id', id)` and returns the updated group

#### Scenario: Link channel to group
- **WHEN** the admin links a channel to a group
- **THEN** the service inserts into `group_channel_links` with `[{ group_id, channel_id }]`

#### Scenario: Unlink channel from group
- **WHEN** the admin unlinks a channel from a group
- **THEN** the service deletes from `group_channel_links` matching both group_id and channel_id

### Requirement: Channels CRUD via InsForge SDK
The system SHALL support listing, searching, and creating enforced channels via `insforge.database.from('enforced_channels')` queries.

#### Scenario: List channels with search
- **WHEN** the channels page loads with a search term
- **THEN** the service applies `.ilike('title', '%term%')` with pagination and returns channels with group_links count

#### Scenario: Create or update channel
- **WHEN** the admin creates a new channel
- **THEN** the service inserts into `enforced_channels` with `[{ channel_id, title, username, invite_link }]`

### Requirement: Analytics via RPC functions
The system SHALL provide PostgreSQL RPC functions for verification_trends, user_growth, and analytics_overview, supporting period and granularity parameters.

#### Scenario: Verification trends with 7-day period
- **WHEN** the analytics page requests verification trends for 7d with daily granularity
- **THEN** `get_verification_trends('7d', 'day')` returns daily counts of total, successful, and failed verifications

#### Scenario: User growth with 30-day period
- **WHEN** the analytics page requests user growth for 30d
- **THEN** `get_user_growth('30d', 'day')` returns daily new_users and cumulative total_users

### Requirement: Chart data via RPC functions
The system SHALL provide 10 PostgreSQL RPC functions for all chart endpoints: verification_distribution, cache_breakdown, groups_status, api_calls_distribution, hourly_activity, latency_distribution, top_groups, cache_hit_rate_trend, latency_trend, and bot_health.

#### Scenario: Top groups chart
- **WHEN** the dashboard requests top groups with limit=10
- **THEN** `get_top_groups(10)` returns the 10 groups with most verifications in the last 7 days, including success_rate

#### Scenario: Latency distribution chart
- **WHEN** the dashboard requests latency distribution
- **THEN** `get_latency_distribution()` returns bucketed counts (<50ms, 50-100ms, 100-200ms, 200-500ms, >500ms)

#### Scenario: Bot health composite
- **WHEN** the dashboard requests bot health
- **THEN** `get_bot_health()` returns uptime_percent, cache_efficiency, success_rate, avg_latency_ms, and error_rate

### Requirement: Logs retrieval via InsForge SDK
The system SHALL support fetching admin_logs with level filtering, search, and ordering via direct InsForge database queries.

#### Scenario: Fetch recent error logs
- **WHEN** the logs page requests logs with level=ERROR and limit=100
- **THEN** the service queries `admin_logs` with `.eq('level', 'ERROR').order('timestamp', { ascending: false }).limit(100)`

### Requirement: Audit logs via InsForge SDK
The system SHALL support fetching admin_audit_log with filtering by action, resource_type, date range, and user, with joined admin_users data.

#### Scenario: Filter audit logs by action
- **WHEN** the admin filters audit logs by action="delete"
- **THEN** the service queries with `.eq('action', 'delete')` and returns logs with user name/email joined

### Requirement: Configuration CRUD via InsForge SDK
The system SHALL support reading and updating admin_config key-value pairs via direct database queries.

#### Scenario: Read system configuration
- **WHEN** the settings page loads
- **THEN** the service queries all rows from `admin_config` and returns key-value pairs

#### Scenario: Update a config value
- **WHEN** the admin updates a configuration key
- **THEN** the service calls `.update({ value }).eq('key', key)` on `admin_config`

### Requirement: Database schema creation
The system SHALL create all tables via ordered SQL migration files executed through `run-raw-sql` MCP tool. Tables include: owners, bot_instances, protected_groups, enforced_channels, group_channel_links, admin_users, admin_config, bot_status, admin_commands, verification_log, api_call_log, admin_logs, admin_audit_log.

#### Scenario: Fresh database setup
- **WHEN** migration files 001 through 005 are executed in order via `run-raw-sql`
- **THEN** all 13 tables are created with correct columns, indexes, constraints, and foreign keys

#### Scenario: Idempotent migrations
- **WHEN** a migration file is run twice
- **THEN** it SHALL NOT fail (using `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`)
