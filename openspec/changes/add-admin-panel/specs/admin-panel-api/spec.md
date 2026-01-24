## ADDED Requirements

### Requirement: RESTful API Design
The system SHALL provide a REST API following the specification in `docs/admin-panel/04-API-DESIGN.md`.

#### Scenario: Standard response format
- **WHEN** API returns successful response
- **THEN** response contains status: "success", data: {...}, meta: {request_id, timestamp}

#### Scenario: Paginated response format
- **WHEN** API returns list of resources
- **THEN** response contains pagination: {page, per_page, total_items, total_pages}

#### Scenario: Error response format (RFC 9457)
- **WHEN** API returns error
- **THEN** response follows RFC 9457 Problem Details format
- **AND** contains: type, title, status, detail, code, trace_id

---

### Requirement: Dashboard Statistics API
The system SHALL provide dashboard statistics via `GET /api/v1/dashboard/stats`.

#### Scenario: Stats retrieval
- **WHEN** authenticated admin calls dashboard stats
- **THEN** response contains: bot_status, uptime_percentage, total_groups, total_channels, total_verifications, success_rate, cache_hit_rate

---

### Requirement: Groups Management API
The system SHALL provide CRUD operations for protected groups via `/api/v1/groups`.

#### Scenario: List groups with pagination
- **WHEN** admin calls `GET /groups?page=1&per_page=25`
- **THEN** response contains paginated list of groups with linked_channels_count

#### Scenario: Get group details
- **WHEN** admin calls `GET /groups/{id}`
- **THEN** response contains group with linked_channels array and verification stats

#### Scenario: Update group settings
- **WHEN** admin calls `PUT /groups/{id}` with valid data
- **THEN** group settings are updated
- **AND** response contains updated group

#### Scenario: Link channel to group
- **WHEN** admin calls `POST /groups/{id}/channels` with channel_id
- **THEN** group-channel link is created
- **AND** response is 201 Created

#### Scenario: Unlink channel from group
- **WHEN** admin calls `DELETE /groups/{id}/channels/{channel_id}`
- **THEN** group-channel link is removed
- **AND** response is 204 No Content

---

### Requirement: Channels Management API
The system SHALL provide CRUD operations for enforced channels via `/api/v1/channels`.

#### Scenario: List channels
- **WHEN** admin calls `GET /channels`
- **THEN** response contains paginated list of channels with linked_groups_count

#### Scenario: Add new channel
- **WHEN** admin calls `POST /channels` with channel_id
- **THEN** channel metadata is fetched from Telegram
- **AND** channel record is created

---

### Requirement: Configuration Management API
The system SHALL provide configuration access via `/api/v1/config`.

#### Scenario: Get configuration
- **WHEN** admin calls `GET /config`
- **THEN** response contains all configuration sections
- **AND** sensitive values (tokens, passwords) are masked

#### Scenario: Update configuration
- **WHEN** admin calls `PUT /config` with valid data
- **THEN** configuration is updated
- **AND** restart_required flag indicates if service restart needed

#### Scenario: Test webhook
- **WHEN** admin calls `POST /config/webhook/test`
- **THEN** response contains webhook status, latency_ms, ssl_valid

---

### Requirement: Historical Logs API
The system SHALL provide log retrieval via `GET /api/v1/logs`.

#### Scenario: Query logs with filters
- **WHEN** admin calls `GET /logs?level=ERROR&start=2026-01-24T00:00:00Z`
- **THEN** response contains matching log entries with timestamp, level, logger, message, context

#### Scenario: Export logs
- **WHEN** admin calls `GET /logs?format=csv`
- **THEN** response is CSV file download

---

### Requirement: Database Browser API
The system SHALL provide database inspection via `/api/v1/database`.

#### Scenario: List tables
- **WHEN** admin calls `GET /database/tables`
- **THEN** response contains table names with row_count, size_bytes, columns

#### Scenario: Browse table data
- **WHEN** admin calls `GET /database/tables/{name}?page=1`
- **THEN** response contains column metadata and paginated rows

#### Scenario: Export table data
- **WHEN** admin calls `GET /database/tables/{name}/export?format=csv`
- **THEN** response is CSV file download

---

### Requirement: Analytics API
The system SHALL provide analytics data via `/api/v1/analytics`.

#### Scenario: User growth data
- **WHEN** admin calls `GET /analytics/users?period=30d&granularity=day`
- **THEN** response contains daily user counts for 30 days

#### Scenario: Verification trends
- **WHEN** admin calls `GET /analytics/verifications?period=7d`
- **THEN** response contains daily verification counts with success/failure breakdown

---

### Requirement: Audit Log API
The system SHALL provide audit log access via `GET /api/v1/audit`.

#### Scenario: Query audit logs
- **WHEN** admin calls `GET /audit?action=UPDATE&resource_type=group`
- **THEN** response contains matching audit entries with user, action, old_value, new_value

---

### Requirement: Admin Management API
The system SHALL provide admin user management via `/api/v1/admins` (Owner only).

#### Scenario: List admins
- **WHEN** owner calls `GET /admins`
- **THEN** response contains all admin users with roles

#### Scenario: Create admin
- **WHEN** owner calls `POST /admins` with email, password, role
- **THEN** new admin user is created
- **AND** response is 201 Created

#### Scenario: Update admin role
- **WHEN** owner calls `PUT /admins/{id}` with new role
- **THEN** admin role is updated

#### Scenario: Delete admin
- **WHEN** owner calls `DELETE /admins/{id}`
- **THEN** admin is deactivated
- **AND** all sessions are revoked

---

### Requirement: API Rate Limiting
The system SHALL enforce rate limits as defined in `docs/admin-panel/07-SECURITY.md` Section 4.1.

#### Scenario: Rate limit exceeded
- **WHEN** client exceeds 100 requests/minute
- **THEN** response is 429 Too Many Requests
- **AND** X-RateLimit-Remaining header shows 0
