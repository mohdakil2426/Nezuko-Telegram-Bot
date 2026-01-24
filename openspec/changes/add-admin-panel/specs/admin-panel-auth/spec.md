## ADDED Requirements

### Requirement: Admin User Authentication
The system SHALL authenticate admin users using email and password with JWT tokens.

#### Scenario: Successful login
- **WHEN** admin submits valid email and password to `POST /api/v1/auth/login`
- **THEN** response contains access_token (15min expiry) and refresh_token (7-day expiry)
- **AND** AdminSession record is created in database

#### Scenario: Invalid credentials
- **WHEN** admin submits incorrect email or password
- **THEN** response is 401 Unauthorized
- **AND** no tokens are issued

#### Scenario: Rate-limited login attempts
- **WHEN** more than 5 login attempts occur within 15 minutes from same IP
- **THEN** response is 429 Too Many Requests
- **AND** Retry-After header indicates wait time

---

### Requirement: Password Security with Argon2id
The system SHALL hash passwords using Argon2id with OWASP 2026 parameters as defined in `docs/admin-panel/07-SECURITY.md`.

#### Scenario: Password hashing
- **WHEN** admin password is stored
- **THEN** Argon2id hash is used with memory_cost=65536, time_cost=3, parallelism=4

#### Scenario: Password verification
- **WHEN** login attempt is made
- **THEN** plain password is verified against Argon2id hash
- **AND** timing-safe comparison is used

---

### Requirement: JWT Token Management with ES256
The system SHALL use asymmetric JWT (ES256) with refresh token rotation as defined in `docs/admin-panel/07-SECURITY.md`.

#### Scenario: Access token creation
- **WHEN** user successfully authenticates
- **THEN** JWT access token is created with ES256 algorithm
- **AND** token contains claims: sub, iss, aud, exp, nbf, iat, role, session_id

#### Scenario: Token validation
- **WHEN** request contains Authorization: Bearer <token>
- **THEN** token signature is verified using ES256 public key
- **AND** claims iss, aud, exp, nbf are validated

#### Scenario: Token refresh with rotation
- **WHEN** valid refresh token is submitted to `POST /api/v1/auth/refresh`
- **THEN** new access_token and refresh_token are issued
- **AND** old refresh token is invalidated

#### Scenario: Refresh token reuse detection
- **WHEN** already-used refresh token is submitted
- **THEN** all user sessions are revoked (security breach detected)
- **AND** response is 401 Unauthorized

---

### Requirement: Admin Session Management
The system SHALL track active admin sessions in the database.

#### Scenario: Session creation on login
- **WHEN** admin successfully logs in
- **THEN** AdminSession record is created with refresh_token hash, IP, user_agent, expires_at

#### Scenario: Session revocation on logout
- **WHEN** admin calls `POST /api/v1/auth/logout`
- **THEN** session is deleted from database
- **AND** refresh token can no longer be used

---

### Requirement: Protected Route Access
The system SHALL protect dashboard routes from unauthenticated access.

#### Scenario: Authenticated access
- **WHEN** user with valid token accesses dashboard route
- **THEN** route content is rendered

#### Scenario: Unauthenticated redirect
- **WHEN** user without token accesses dashboard route
- **THEN** user is redirected to /login page

---

### Requirement: Role-Based Access Control (RBAC)
The system SHALL enforce role-based permissions as defined in `docs/admin-panel/07-SECURITY.md` Section 3.

#### Scenario: Owner full access
- **WHEN** user with OWNER role accesses any feature
- **THEN** access is granted

#### Scenario: Admin limited access
- **WHEN** user with ADMIN role accesses configuration modification
- **THEN** access is denied with 403 Forbidden

#### Scenario: Viewer read-only access
- **WHEN** user with VIEWER role attempts to modify a resource
- **THEN** access is denied with 403 Forbidden
