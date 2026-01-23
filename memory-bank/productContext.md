# Product Context

## Problem Statement
Group administrators often want to grow their associated channels by requiring group members to be subscribers. Manually checking and enforcing this is impossible at scale. Users need a system that automatically restricts non-subscribers while providing a smooth path to compliance.

## Solution
An automated Telegram bot that acts as a gatekeeper. It listens to group messages, checks the sender's subscription status against the target channel, and restricts them if they haven't joined. It offers a "Join Channel" button and an "I have joined" verification button to restore permissions instantly.

## User Experience
1.  **Non-Member**: Sends a message -> Message deleted -> Bot DM/Reply: "Join @Channel to speak" with buttons -> User joins channel -> Clicks "I have joined" -> Bot unmutes user.
2.  **Member**: Sends a message -> Message goes through normally.
3.  **Admin**: Adds bot to Group and Channel -> Configures target channel (if needed) -> Bot handles the rest.

## Success Metrics
*   Increase in channel subscribers from group participants.
*   Reduction in manual admin moderation workload.
*   Fast verification response time (< 1s).
