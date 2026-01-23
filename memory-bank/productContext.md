# Product Context

## Problem Statement
Group administrators often want to grow their associated channels by requiring group members to be subscribers. Manually checking and enforcing this is impossible at scale. Users need a system that automatically restricts non-subscribers while providing a smooth path to compliance.

## Solution
An automated Telegram bot that acts as a gatekeeper. It listens to group messages, checks the sender's subscription status against the target channel, and restricts them if they haven't joined.
**v1.1 Update**: The bot now enforces "Strict Verification":
1.  **Instant Join Check**: Verifies users the moment they join the group.
2.  **Leave Detection**: Instantly revokes permissions if a user leaves the target channel.

## User Experience
1.  **New User Joins Group**: Bot -> "Welcome! Join @Channel to speak" -> User joins channel -> Clicks "I have joined" -> Bot unmutes.
2.  **User Leaves Channel**: Bot detects leave event -> Instantly mutes user in Group -> **Sends Warning**: "Permissions revoked, join back to chat".
3.  **Non-Member Speaks**: Message deleted -> Bot warns -> User verifies -> Bot unmutes.
4.  **Admin**: Adds bot to Group and Channel (as Admin) -> Sets `GROUP_ID` -> Bot handles the rest.

## Success Metrics
*   Increase in channel subscribers from group participants.
*   Reduction in manual admin moderation workload.
*   Fast verification response time (< 1s).
