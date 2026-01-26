## ADDED Requirements

### Requirement: Firestore Data Layer
The system SHALL use Firebase Firestore as the primary database for all application data.

#### Scenario: Bot reads group configuration
- **WHEN** a user sends a message in a protected group
- **THEN** the Bot SHALL query Firestore `protected_groups/{group_id}` for configuration
- **AND** read embedded `enforced_channels` array in single document read

#### Scenario: Bot creates verification log
- **WHEN** a user's channel membership is verified
- **THEN** the Bot SHALL create a document in `verifications` collection
- **AND** include `user_id`, `group_id`, `channel_id`, `status`, and server timestamp

#### Scenario: API reads real-time stats
- **WHEN** the dashboard requests statistics
- **THEN** the API SHALL read from `_metadata/stats` document
- **AND** return `total_groups`, `total_channels`, `total_verifications`, `success_rate`

### Requirement: Firestore Collection Schema
The system SHALL maintain the following Firestore collections with defined schemas.

#### Scenario: owners collection structure
- **WHEN** a new bot owner is registered
- **THEN** a document SHALL be created at `owners/{telegram_user_id}`
- **AND** contain `username`, `created_at`, `settings` fields

#### Scenario: protected_groups collection structure
- **WHEN** a group is protected
- **THEN** a document SHALL be created at `protected_groups/{group_id}`
- **AND** contain `owner_id`, `title`, `enabled`, `member_count`, `enforced_channels` array, `created_at`, `updated_at`

#### Scenario: enforced_channels collection structure
- **WHEN** a channel is added for enforcement
- **THEN** a document SHALL be created at `enforced_channels/{channel_id}`
- **AND** contain `title`, `username`, `subscriber_count`, `linked_groups` array, `created_at`

#### Scenario: verifications collection structure
- **WHEN** a verification event occurs
- **THEN** a document SHALL be created in `verifications` collection
- **AND** contain `user_id`, `group_id`, `channel_id`, `status`, `created_at`, `verified_at`

### Requirement: Real-time Web Updates
The Web admin panel SHALL receive real-time updates from Firestore without polling.

#### Scenario: Dashboard receives live stats
- **WHEN** a new verification occurs
- **THEN** the dashboard stats SHALL update within 500ms
- **AND** without requiring page refresh

#### Scenario: Groups table updates in real-time
- **WHEN** a group is protected or unprotected via Bot
- **THEN** the Groups table in admin panel SHALL update automatically
- **AND** show the change within 1 second

### Requirement: Metadata Statistics
The system SHALL maintain aggregated statistics in `_metadata/stats` document.

#### Scenario: Stats increment on new group
- **WHEN** a new group is protected
- **THEN** `_metadata/stats.total_groups` SHALL be incremented by 1
- **AND** `last_updated` SHALL be set to server timestamp

#### Scenario: Stats reflect verification counts
- **WHEN** the dashboard requests stats
- **THEN** `total_verifications` SHALL reflect count of all verification events
- **AND** `success_rate` SHALL reflect percentage of successful verifications

---

## MODIFIED Requirements

### Requirement: Verification Caching
The verification service SHALL cache channel membership status to reduce Firestore reads.

#### Scenario: Cache hit for recent verification
- **WHEN** a user was verified within the cache TTL (10 minutes)
- **THEN** the system SHALL skip Firestore lookup
- **AND** use cached verification status

#### Scenario: Cache invalidation on channel leave
- **WHEN** a user leaves an enforced channel
- **THEN** the cache SHALL be invalidated for that user-channel pair
- **AND** next verification SHALL query Firestore

---

## REMOVED Requirements

### Requirement: PostgreSQL/SQLite Database
**Reason**: Replaced by Firestore for serverless scaling and real-time capabilities.
**Migration**: All data migrated to Firestore collections.

### Requirement: SQLAlchemy ORM Models
**Reason**: Firestore uses document-based access, not ORM.
**Migration**: Models replaced by Firestore collection schemas.

### Requirement: Alembic Database Migrations
**Reason**: Firestore is schemaless; no migrations needed.
**Migration**: Schema changes handled via code, not migration files.
