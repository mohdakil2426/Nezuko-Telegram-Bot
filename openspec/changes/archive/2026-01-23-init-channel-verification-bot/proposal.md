# Change: Initialize Channel Verification Bot

## Why
Group administrators need an automated way to enforce channel membership for group participants to drive channel growth and ensure community alignment. Manual enforcement is unscalable. The project aims to build a bot that restricts non-members and allows easy re-verification.

## What Changes
- **Implement Channel Guard Capability**:
    - **User Verification**: Check `getChatMember` on every message.
    - **Restriction**: Mute users who are not members.
    - **User Feedback**: Send warning with "Join" and "Verify" buttons.
    - **Re-verification**: Handle callback for "I have joined" to unmute.

## Impact
- **New Capability**: `channel-guard`
- **Affected Systems**: New Bot Project (Python/Node.js).
- **Users**: Group Admins (Benefit from automation), Group Members (Must join channel).
