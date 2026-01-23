## ADDED Requirements

### Requirement: Enforce Channel Membership
The system SHALL restrict group participants from sending messages if they are not members of the configured Telegram Channel.

#### Scenario: Non-member attempts to speak
- **WHEN** a user who is NOT a member of the target channel sends a message in the group
- **THEN** the bot deletes the message AND restricts the user from sending messages (Mute)
- **AND** the bot sends unique warning with "Join Channel" and "I have joined" buttons

#### Scenario: Member speaks
- **WHEN** a user who IS a member of the target channel sends a message
- **THEN** the message is allowed (Bot takes no action)

#### Scenario: Admin speaks
- **WHEN** a Group Admin or Channel Admin sends a message
- **THEN** the message is allowed (Bot takes no action)

### Requirement: User Re-verification
The system SHALL allow restricted users to self-verify their membership and regain sending permissions.

#### Scenario: User validates membership
- **WHEN** a restricted user joins the channel AND clicks the "I have joined" button
- **THEN** the bot re-checks membership status via API
- **AND** if confirmed member, the bot unmutes the user (restores `can_send_messages`) AND deletes the warning message

#### Scenario: User clicks verify without joining
- **WHEN** a restricted user clicks "I have joined" but has NOT joined the channel
- **THEN** the bot displays an alert (toast) saying "You still haven't joined the channel!"
- **AND** the user remains restricted
