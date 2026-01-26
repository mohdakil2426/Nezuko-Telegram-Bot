## ADDED Requirements

### Requirement: Real-time Analytics
The system SHALL provide real-time analytics derived from Firestore verification data.

#### Scenario: Dashboard shows live verification count
- **WHEN** the dashboard Analytics page loads
- **THEN** it SHALL display verification counts from the last 24h, 7d, and 30d
- **AND** data SHALL be derived from `verifications` collection queries

#### Scenario: Success rate calculation
- **WHEN** analytics are requested
- **THEN** success rate SHALL be calculated as `successful / total * 100`
- **AND** data SHALL come from real `verifications` documents, not mock data

#### Scenario: User growth tracking
- **WHEN** user growth analytics are requested
- **THEN** the system SHALL query `verifications` grouped by date
- **AND** count unique `user_id` values per day

### Requirement: Verification Event Logging
The system SHALL log all verification events to Firestore for analytics.

#### Scenario: Successful verification logged
- **WHEN** a user successfully verifies channel membership
- **THEN** a document SHALL be created in `verifications` collection
- **AND** `status` field SHALL be "success"

#### Scenario: Failed verification logged
- **WHEN** a user fails to verify channel membership
- **THEN** a document SHALL be created in `verifications` collection
- **AND** `status` field SHALL be "failed"

---

## MODIFIED Requirements

### Requirement: Activity Feed
The admin panel activity feed SHALL display real-time updates from Firestore.

#### Scenario: Activity updates in real-time
- **WHEN** a new verification or admin action occurs
- **THEN** the activity feed SHALL update within 500ms
- **AND** show the new event at the top of the list

#### Scenario: Activity filtering by type
- **WHEN** the admin filters activity by type
- **THEN** the Firestore query SHALL filter by `action` field
- **AND** return only matching documents

---

## REMOVED Requirements

### Requirement: Mock Data Generation
**Reason**: Real data available from Firestore verifications collection.
**Migration**: Remove mock data generators from analytics_service.py.
