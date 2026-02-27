## ADDED Requirements

### Requirement: Audit service removed
The `audit.service.ts` file SHALL be deleted because it queries non-existent tables (`admin_audit_log`, `admin_users`).

#### Scenario: Audit service no longer imported
- **WHEN** the web app is built
- **THEN** no import references to `audit.service.ts` SHALL exist

### Requirement: Audit page uses admin_logs
If an audit log page exists in the dashboard, it SHALL query the existing `admin_logs` table instead of the non-existent `admin_audit_log`.

#### Scenario: Audit page displays real logs
- **WHEN** a user navigates to the audit/logs page
- **THEN** the page SHALL display entries from `admin_logs` with columns: `id`, `timestamp`, `level`, `logger`, `message`, `module`, `function`, `line_no`, `path`

### Requirement: Logs service maps real columns
The `logs.service.ts` SHALL map to actual `admin_logs` columns instead of the non-existent `extra` column. The type definition SHALL include `logger`, `module`, `function_name`, `line_no`, `path`.

#### Scenario: Logs displayed with full metadata
- **WHEN** the logs page renders log entries
- **THEN** each entry SHALL display `logger`, `module`, `function`, and `path` instead of an empty `extra` field

### Requirement: Query keys updated
The `query-keys.ts` file SHALL remove any keys related to `audit` service if they are no longer used.

#### Scenario: No orphaned query keys
- **WHEN** the query keys file is checked
- **THEN** no keys SHALL reference removed services
