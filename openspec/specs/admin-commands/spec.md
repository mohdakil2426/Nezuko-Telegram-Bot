# admin-commands Specification

## Purpose
TBD - created by archiving change transform-to-production-saas. Update Purpose after archive.
## Requirements
### Requirement: Setup Wizard
The system SHALL provide a setup wizard via `/protect` command that guides administrators through configuring channel enforcement for their group.

#### Scenario: Successful protection setup
- **WHEN** a group admin sends `/protect @ChannelUsername` in the group
- **THEN** the bot verifies it has admin rights in the group (getChatMember check)
- **AND** verifies it has admin rights in the specified channel
- **AND** if both checks pass, creates database entries: `protected_groups`, `enforced_channels`, `group_channel_links`
- **AND** responds with: "🛡️ Protection Activated! Members must now join @Channel to speak in this group."

#### Scenario: Missing permissions
- **WHEN** a group admin sends `/protect @ChannelUsername` but the bot lacks admin rights in the group OR channel
- **THEN** the bot responds with: "⚠️ I need admin rights in both the group and @Channel to enable protection. Please add me as admin and try again."
- **AND** lists specific missing permissions (e.g., "Missing in: Group")

#### Scenario: Already protected
- **WHEN** a group admin sends `/protect @NewChannel` in a group already protected by @OldChannel
- **THEN** the bot responds: "This group is already protected by @OldChannel. Run `/unprotect` first if you want to change channels."

#### Scenario: Non-admin attempts setup
- **WHEN** a non-admin user tries to run `/protect`
- **THEN** the bot responds: "⛔ Only group administrators can configure protection."

### Requirement: Protection Status
The system SHALL provide a `/status` command that displays current protection configuration and statistics.

#### Scenario: Status in protected group
- **WHEN** any user sends `/status` in a protected group
- **THEN** the bot retrieves group configuration from database
- **AND** responds with:
  - Protection status (✅ Enabled / ❌ Disabled)
  - Linked channel(s) list
  - Setup owner (@username)
  - Created date

#### Scenario: Status in unprotected group
- **WHEN** any user sends `/status` in a group NOT in `protected_groups` table
- **THEN** the bot responds: "This group is not protected. Admins can run `/protect @YourChannel` to enable verification."

### Requirement: Protection Removal
The system SHALL allow group administrators to disable protection via `/unprotect` command without deleting historical configuration.

#### Scenario: Unprotect with confirmation
- **WHEN** a group admin sends `/unprotect` in a protected group
- **THEN** the bot updates `protected_groups.enabled = FALSE` in the database
- **AND** responds: "🔓 Protection disabled. Members can now speak freely without channel verification."
- **AND** retains database records (soft delete, can be re-enabled)

#### Scenario: Unprotect in unprotected group
- **WHEN** an admin sends `/unprotect` in a group that's not protected
- **THEN** the bot responds: "This group is not currently protected."

### Requirement: Settings Management
The system SHALL provide a `/settings` command for viewing current configuration (with future extensibility for customization).

#### Scenario: View current settings
- **WHEN** a group admin sends `/settings` in a protected group
- **THEN** the bot retrieves `params` JSONB column from database
- **AND** displays current configuration:
  - Warning message template (default or custom)
  - Button text (default or custom)
  - Verification mode (instant join: ON/OFF)
- **AND** shows: "Use future commands to customize these settings (coming soon)"

#### Scenario: Settings in unprotected group
- **WHEN** an admin sends `/settings` in an unprotected group
- **THEN** the bot responds: "No settings available. Run `/protect @YourChannel` first."

### Requirement: Help Documentation
The system SHALL provide comprehensive help via `/help` and `/start` commands.

#### Scenario: Help in private chat
- **WHEN** a user sends `/start` or `/help` in a private chat with the bot
- **THEN** the bot responds with:
  - Welcome message
  - Setup instructions (3-step guide: Add bot to group → Add bot to channel →Run /protect)
  - Command reference (/protect, /status, /unprotect, /settings)
  - Troubleshooting tips (bot needs admin rights)

#### Scenario: Help in group chat
- **WHEN** any user sends `/help` in a group
- **THEN** the bot responds with abbreviated command list:
  - /protect - Enable channel verification
  - /status - Check protection status
  - /unprotect - Disable protection
  - /settings - View configuration

### Requirement: Permission Validation
The system SHALL verify that the executing user has appropriate permissions before allowing configuration changes.

#### Scenario: Admin verification for sensitive commands
- **WHEN** a user attempts `/protect`, `/unprotect`, or `/settings` commands
- **THEN** the bot checks if user is a group administrator via `getChatMember(group_id, user_id)`
- **AND** if status is NOT `administrator` or `creator`, the bot rejects the command with: "⛔ Only group administrators can use this command."

#### Scenario: Public commands
- **WHEN** any user uses `/status` or `/help`
- **THEN** the bot responds without permission checks (public information)

### Requirement: Channel Parsing
The system SHALL accept channel identifiers in multiple formats for user convenience.

#### Scenario: Username format
- **WHEN** an admin runs `/protect @MyChannel`
- **THEN** the bot parses `@MyChannel` and resolves it via Telegram API
- **AND** proceeds with setup if valid

#### Scenario: Numeric ID format
- **WHEN** an admin runs `/protect -1001234567890`
- **THEN** the bot parses the numeric channel ID
- **AND** proceeds with setup if valid

#### Scenario: Invalid channel format
- **WHEN** an admin runs `/protect InvalidInput`
- **THEN** the bot responds: "⚠️ Invalid channel format. Use @ChannelUsername or numeric channel ID."

### Requirement: Setup Confirmation
The system SHALL provide clear feedback for all setup actions to guide administrators through successful configuration.

#### Scenario: Step-by-step feedback
- **WHEN** an admin runs `/protect @Channel`
- **THEN** the bot sends real-time feedback:
  1. "🔍 Verifying permissions..."
  2. "✅ I'm admin in this group"
  3. "✅ I'm admin in @Channel"
  4. "✅ You're authorized to set this up"
  5. "🛡️ Protection Activated!"
- **AND** each step is displayed sequentially (responsive UX)

#### Scenario: Error feedback
- **WHEN** setup fails at any step
- **THEN** the bot displays:
  - Which step failed (e.g., "❌ I'm not admin in @Channel")
  - Exact remediation action (e.g., "Please add me as an admin in @Channel with 'Ban Users' permission")
  - Retry instructions (e.g., "Run `/protect @Channel` again after fixing.")

