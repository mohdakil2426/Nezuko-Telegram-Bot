# admin-panel-analytics Specification

## Purpose
TBD - created by archiving change enhance-admin-panel-v2. Update Purpose after archive.
## Requirements
### Requirement: Verification Event Logging
The bot MUST log all verification events to the `verification_log` database table with user_id, group_id, channel_id, status, latency, and timestamp.

#### Scenario: Successful verification is logged
**Given** a user sends a message in a protected group
**When** the verification service checks their channel membership
**And** the user is verified as a member
**Then** a verification_log entry is created with status="verified" and latency_ms recorded

#### Scenario: Failed verification is logged
**Given** a user sends a message in a protected group
**When** the verification service checks their channel membership
**And** the user is NOT a member of required channels
**Then** a verification_log entry is created with status="restricted"

#### Scenario: Verification error is logged
**Given** a user sends a message in a protected group
**When** the verification service encounters an error (API timeout, database error)
**Then** a verification_log entry is created with status="error"

---

### Requirement: Real Analytics Data
The analytics service MUST query actual verification data from the database instead of generating mock data.

#### Scenario: User growth from real data
**Given** verification_log contains entries for the last 30 days
**When** the admin requests user growth analytics
**Then** the response contains unique user counts per day from real data

#### Scenario: Verification trends from real data
**Given** verification_log contains entries with various statuses
**When** the admin requests verification trend analytics
**Then** the response contains actual counts of verified, restricted, and error statuses

#### Scenario: Empty database graceful handling
**Given** verification_log table has no entries
**When** the admin requests analytics
**Then** the response returns zero counts with informative message

---

### Requirement: Dashboard Stats from Real Data
The dashboard stats endpoint MUST return verification counts from actual database records.

#### Scenario: Today's verifications count
**Given** verification_log contains 50 entries for today
**When** the admin loads the dashboard
**Then** "Verifications Today" card shows "50"

#### Scenario: Weekly verifications count
**Given** verification_log contains 320 entries for the last 7 days
**When** the admin loads the dashboard
**Then** weekly verification stats reflect the actual 320 count

---

### Requirement: Dashboard Verification Chart
The dashboard MUST display an interactive chart showing verification trends over the last 30 days.

#### Scenario: Chart renders with data
**Given** verification_log contains entries for the last 30 days
**When** the admin loads the dashboard
**Then** a line chart displays with verified (green) and restricted (red) trends

#### Scenario: Chart tooltip interaction
**Given** the verification chart is displayed
**When** the admin hovers over a data point
**Then** a tooltip shows the exact date and verification counts

#### Scenario: Chart with no data
**Given** verification_log is empty
**When** the admin loads the dashboard
**Then** the chart area shows "No verification data yet" message

