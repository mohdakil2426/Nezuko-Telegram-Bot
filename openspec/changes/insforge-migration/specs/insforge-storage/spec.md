## ADDED Requirements

### Requirement: Storage bucket creation
The system SHALL create two InsForge Storage buckets via `create-bucket` MCP tool: `bot-exports` (private) for CSV exports and backups, and `bot-assets` (public) for bot avatars and media.

#### Scenario: Buckets created during infrastructure setup
- **WHEN** Phase 1 infrastructure setup runs
- **THEN** `bot-exports` bucket exists with `isPublic: false`
- **THEN** `bot-assets` bucket exists with `isPublic: true`

### Requirement: File upload via InsForge Storage SDK
The system SHALL support uploading files to InsForge Storage buckets via `insforge.storage.from('bucket').uploadAuto(file)` and storing the returned URL in the database.

#### Scenario: Export audit log as CSV
- **WHEN** the admin clicks "Export CSV" on the audit logs page
- **THEN** the system generates a CSV blob client-side
- **THEN** optionally uploads to `bot-exports` bucket via `uploadAuto()`
- **THEN** returns the download URL or triggers browser download

### Requirement: File download via InsForge Storage SDK
The system SHALL support downloading files from InsForge Storage buckets via `insforge.storage.from('bucket').download(key)`.

#### Scenario: Download exported file
- **WHEN** the admin requests a previously uploaded export
- **THEN** the system calls `.download(key)` and creates a browser download link via `URL.createObjectURL(blob)`
