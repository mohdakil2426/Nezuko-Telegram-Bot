## ADDED Requirements
### Requirement: Firebase Authentication
The system SHALL use Google Firebase Authentication for user identity management.

#### Scenario: User Login
- **WHEN** a user enters valid email and password
- **THEN** the system returns a Firebase ID Token matches a valid Firebase User
- **AND** the API creates/updates a local `AdminUser` record for RBAC

#### Scenario: Token Validation
- **WHEN** an API request includes `Authorization: Bearer <firebase_token>`
- **THEN** the system validates the token signature against Google's public keys
- **AND** extracts the `uid` to identify the user

## REMOVED Requirements
### Requirement: Supabase Authentication
**Reason**: Migrating to Firebase ecosystem.
**Migration**: Existing users must recreate accounts or be migrated via admin scripts (out of scope for MVP).

### Requirement: Local JWT Generation
**Reason**: Firebase handles token generation.
