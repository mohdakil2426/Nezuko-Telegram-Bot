# admin-panel-crud Specification

## Purpose
TBD - created by archiving change enhance-admin-panel-v2. Update Purpose after archive.
## Requirements
### Requirement: Database Row Update API
The API MUST provide an endpoint to update database rows.

#### Scenario: Update allowed table row
**Given** an authenticated admin user
**When** sending PUT to `/api/v1/database/protected_groups/1` with valid data
**Then** the row is updated in the database
**And** response status is 200 with updated row data

#### Scenario: Update blocked table rejected
**Given** an authenticated admin user
**When** sending PUT to `/api/v1/database/admin_users/1`
**Then** response status is 403 Forbidden
**And** error message indicates table is protected

#### Scenario: Update non-existent row
**Given** an authenticated admin user
**When** sending PUT to `/api/v1/database/protected_groups/9999`
**Then** response status is 404 Not Found

#### Scenario: Update with invalid data
**Given** an authenticated admin user
**When** sending PUT with invalid column type (string for integer)
**Then** response status is 422 Unprocessable Entity
**And** error details specify which field is invalid

---

### Requirement: Database Row Delete API
The API MUST provide an endpoint to delete database rows.

#### Scenario: Delete allowed table row
**Given** an authenticated admin user
**When** sending DELETE to `/api/v1/database/protected_groups/1`
**Then** the row is deleted from the database
**And** response status is 200 with deleted row data

#### Scenario: Delete blocked table rejected
**Given** an authenticated admin user
**When** sending DELETE to `/api/v1/database/admin_sessions/1`
**Then** response status is 403 Forbidden

#### Scenario: Delete with foreign key constraint
**Given** a protected_group that has linked channels
**When** sending DELETE to `/api/v1/database/protected_groups/1`
**Then** response status is 409 Conflict
**And** error message lists dependent group_channel_links rows

---

### Requirement: Audit Logging for CRUD
All database modifications MUST be logged to the audit trail.

#### Scenario: Update audit trail
**Given** an admin updates a protected_groups row
**When** the update succeeds
**Then** an admin_audit_log entry is created with:
  - action: "update"
  - entity_type: "protected_groups"
  - entity_id: row id
  - diff_json: old and new values

#### Scenario: Delete audit trail
**Given** an admin deletes a protected_groups row
**When** the delete succeeds
**Then** an admin_audit_log entry is created with:
  - action: "delete"
  - entity_type: "protected_groups"
  - entity_id: row id
  - diff_json: deleted row data

---

### Requirement: Edit Row Modal UI
The frontend MUST provide a modal for editing database rows.

#### Scenario: Open edit modal
**Given** the admin is on the Database Browser page
**When** clicking the edit icon on a row
**Then** a modal opens with a form pre-filled with row data

#### Scenario: Form validation
**Given** the edit modal is open
**When** the admin clears a required field and clicks Save
**Then** validation error is shown on the field
**And** the form is not submitted

#### Scenario: Save changes
**Given** the admin modifies values in the edit modal
**When** the admin clicks Save
**Then** the API is called with updated data
**And** the modal closes on success
**And** the table refreshes with new data

---

### Requirement: Delete Confirmation Dialog
The frontend MUST require confirmation before deleting rows.

#### Scenario: Delete confirmation prompt
**Given** the admin clicks delete icon on a row
**When** the confirmation dialog appears
**Then** it shows the row summary (table name, ID)
**And** requires typing the table name to confirm

#### Scenario: Confirm delete
**Given** the delete confirmation dialog is open
**When** the admin types the table name correctly and clicks Delete
**Then** the DELETE API is called
**And** the row is removed from the table view

#### Scenario: Cancel delete
**Given** the delete confirmation dialog is open
**When** the admin clicks Cancel
**Then** the dialog closes
**And** the row is not deleted

---

### Requirement: Table Whitelist
Only designated tables MUST be editable or deletable.

#### Scenario: Whitelist verification
**Given** the table whitelist is:
  - protected_groups: edit ✓, delete ✓
  - enforced_channels: edit ✓, delete ✓
  - group_channel_links: edit ✓, delete ✓
  - admin_config: edit ✓, delete ✗
  - verification_log: edit ✗, delete ✗
  - admin_users: edit ✗, delete ✗
**When** UI renders edit/delete buttons
**Then** buttons are disabled/hidden for non-whitelisted operations

#### Scenario: API enforces whitelist
**Given** a client attempts to bypass UI and call API directly
**When** sending DELETE to `/api/v1/database/admin_users/1`
**Then** response is 403 regardless of user permissions

