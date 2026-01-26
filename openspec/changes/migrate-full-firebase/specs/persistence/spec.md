## MODIFIED Requirements

### Requirement: Data Storage Backend
The system SHALL use Firebase Firestore instead of PostgreSQL/SQLite for data persistence.

#### Scenario: Bot connects to Firestore
- **WHEN** the Bot starts
- **THEN** it SHALL initialize Firebase Admin SDK with service account credentials
- **AND** obtain a Firestore client reference

#### Scenario: API connects to Firestore
- **WHEN** the API starts
- **THEN** it SHALL initialize Firebase Admin SDK with service account credentials
- **AND** share the same Firestore instance as the Bot

#### Scenario: Web reads from Firestore
- **WHEN** the admin panel loads
- **THEN** it SHALL connect to Firestore via Firebase JS SDK
- **AND** authenticate using Firebase Auth token

### Requirement: Transaction Support
The system SHALL use Firestore transactions for atomic operations.

#### Scenario: Group protection with channel linking
- **WHEN** a group is protected with channels
- **THEN** the operation SHALL use a Firestore transaction
- **AND** create group document and update channel references atomically

#### Scenario: Stats update on verification
- **WHEN** a verification is logged
- **THEN** the `_metadata/stats` document SHALL be updated atomically
- **AND** increment counters without race conditions

---

## REMOVED Requirements

### Requirement: Connection Pool Management
**Reason**: Firestore handles connections automatically; no pool configuration needed.
**Migration**: Remove pool_size, max_overflow, pool_timeout configurations.

### Requirement: Database Migrations
**Reason**: Firestore is schemaless; migrations are not applicable.
**Migration**: Schema evolution handled through application code.

### Requirement: SQL Query Optimization
**Reason**: Firestore uses document queries, not SQL.
**Migration**: Queries replaced with Firestore collection queries and indexes.
