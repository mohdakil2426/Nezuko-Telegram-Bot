## ADDED Requirements

### Requirement: RESTRICTED status handled in verification
The verification flow SHALL handle the `ChatMemberRestricted` status as a partially-joined member, checking whether the user's restrictions allow message sending.

#### Scenario: Restricted user with send permission
- **WHEN** a user has `RESTRICTED` status with `can_send_messages=True`
- **THEN** the system SHALL treat them as a valid member

#### Scenario: Restricted user without send permission
- **WHEN** a user has `RESTRICTED` status with `can_send_messages=False`
- **THEN** the system SHALL treat them as not a member and prompt to join

### Requirement: All missing channels shown in verify UI
The verify button response SHALL show ALL channels the user has not joined, not just the first one.

#### Scenario: User missing multiple channels
- **WHEN** a user is missing membership in 3 out of 5 required channels
- **THEN** the verify response SHALL list all 3 missing channels with join links

### Requirement: ChatJoinRequest handler
The bot SHALL handle `ChatJoinRequest` updates to auto-approve users who have completed the verification.

#### Scenario: Verified user sends join request
- **WHEN** a verified user sends a `ChatJoinRequest` to a protected group
- **THEN** the bot SHALL auto-approve the request

#### Scenario: Unverified user sends join request
- **WHEN** an unverified user sends a `ChatJoinRequest`
- **THEN** the bot SHALL decline the request and send a DM with verification instructions

### Requirement: Leave handler handles RESTRICTED to LEFT transition
The leave handler SHALL process `ChatMemberUpdated` events where the old status is `RESTRICTED` and the new status is `LEFT`.

#### Scenario: Restricted user leaves
- **WHEN** a member transitions from RESTRICTED to LEFT
- **THEN** the system SHALL process the leave event and update analytics

### Requirement: query.answer() called first in verify handler
The verify callback handler SHALL call `query.answer()` immediately upon receiving the callback, before any database or API calls.

#### Scenario: Verify button pressed
- **WHEN** a user presses the verify inline button
- **THEN** `query.answer()` SHALL be called within the first 2 lines of the handler function

### Requirement: use_independent_chat_permissions set
All `restrictChatMember` calls SHALL include `use_independent_chat_permissions=True` per Bot API recommendation.

#### Scenario: User restricted in group
- **WHEN** the bot restricts a user's permissions
- **THEN** the API call SHALL include `use_independent_chat_permissions=True`
