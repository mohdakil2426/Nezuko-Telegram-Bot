# Product Requirements Document (PRD)

**Project Name:** Telegram Channel Verification Bot (Force Subscribe Bot)
**Date:** January 23, 2026
**Status:** Draft
**Version:** 1.0

## 1. Introduction

### 1.1 Objective

The goal of this project is to develop a Telegram bot that enforces channel membership as a prerequisite for sending messages in a linked discussion group. This increases channel growth by requiring group participants to subscribe to the official channel before they can contribute to the group conversation.

### 1.2 Scope

* **Target Users:** Group Administrators (who own the channel) and Group Members.
* **Platform:** Telegram (Mobile \& Desktop).
* **Key Function:** Restrict text/media permissions for users who have not joined the specific Telegram Channel.


## 2. User Stories

* **As a Group Admin**, I want the bot to automatically mute users who are not part of my channel so that I don't have to check manually.
* **As a Group Admin**, I want to easily configure which channel the bot should check.
* **As a Group Member**, I want a clear instruction on why I cannot send messages and a button to verify my status after I join the channel.


## 3. Functional Requirements

### 3.1 Bot Permissions \& Setup

* **Group Admin Rights:** The bot must be added to the **Target Group** as an Administrator with the permission `can_restrict_members` to mute/unmute users.
* **Channel Admin Rights:** The bot must be added to the **Target Channel** as an Administrator. This is required for the `getChatMember` API method to accurately retrieve user status.


### 3.2 User Verification Logic

The bot shall listen for new messages in the group and execute the following logic for every message:

1. **Check User Status:** Call the Telegram API method `getChatMember(chat_id=@ChannelUsername, user_id=UserID)`.
2. **Evaluate Response:**
    * If status is `member`, `administrator`, or `creator`: **Allow Message** (Do nothing).
    * If status is `left`, `kicked`, or `restricted` (not a member): **Delete Message** and **Restrict User** (Mute).

### 3.3 Restriction Mechanism

* **Immediate Mute:** Upon detecting a non-member, the bot uses `restrictChatMember` to set `can_send_messages` to `False` for that user.
* **Warning Message:** The bot sends a reply to the user (visible to all or ephemeral) stating: *"You must join @ChannelName to speak in this group."*
* **Inline Keyboard:** The warning message must include two buttons:

1. **"Join Channel"** (URL button linking to the channel).
2. **"I have joined"** (Callback button to trigger re-verification).


### 3.4 Re-verification (Unmute)

* When the restricted user clicks **"I have joined"**, the bot re-runs the `getChatMember` check.
* **Success:** If the user is now a member, the bot calls `restrictChatMember` with `can_send_messages` set to `True` (Unmute) and deletes the warning message.
* **Failure:** If the user is still not a member, the bot shows a temporary alert (toast): *"You still haven't joined the channel!"*.


## 4. Technical Architecture

### 4.1 Technology Stack (Recommended)

Since you are a developer, you can choose the stack, but Python or Node.js are most robust for this.

* **Language:** Python (highly recommended for bots) or Node.js.
* **Library:** `python-telegram-bot` (Python) or `Telegraf` (Node.js).
* **Hosting:** VPS (DigitalOcean/Hetzner) or 24/7 Cloud Function. *Note: Heroku free tier is deprecated; use a persistent server.*


### 4.2 API Methods Used

| Method | Purpose |
| :-- | :-- |
| `getChatMember` | Check if `user_id` exists in `channel_id` [^3]. |
| `restrictChatMember` | Mute the user in the group [^1][^2]. |
| `sendMessage` | Send the warning prompt with buttons. |
| `deleteMessage` | Remove the unauthorized message to keep chat clean. |
| `answerCallbackQuery` | Provide feedback when clicking "I have joined". |

### 4.3 Flowchart (Logic)

```mermaid
graph TD
    A[User Sends Message in Group] --> B{Is User Admin?}
    B -- Yes --> C[Ignore (Allow)]
    B -- No --> D{Is User in Channel?}
    D -- Yes --> E[Ignore (Allow)]
    D -- No --> F[Delete Message]
    F --> G[Mute User]
    G --> H[Send 'Join Channel' Button]
    H --> I[User Clicks 'Verify']
    I --> J{Is User in Channel?}
    J -- Yes --> K[Unmute User & Delete Warning]
    J -- No --> L[Alert: 'Not Joined Yet']
```


## 5. Non-Functional Requirements

* **Latency:** Verification check should happen under 1 second to prevent "message spam" from non-members.
* **Reliability:** The bot must handle API rate limits (30 messages/sec) gracefully.
* **Scalability:** If the group is large (10k+ members), consider caching `member` status for 5-10 minutes to reduce API calls.


## 6. Edge Cases

* **Bot Kicked:** If the bot is removed from the Channel, it will fail to verify users. The bot should log this error and notify the Group Owner.
* **User Ban:** If a user is banned from the channel (`kicked` status), they should permanently be restricted in the group.
* **API Downtime:** If Telegram API fails, default to "Allow" to strictly avoid disrupting the group flow, OR "Block" for strict security (configurable).


## 7. Implementation Steps

1. **Create Bot:** Use `@BotFather` to create a new bot and get the API Token.
2. **Add to Channel:** Add the bot to your Channel as **Admin**.
3. **Add to Group:** Add the bot to your Group as **Admin**.
4. **Code Logic:** Implement the `getChatMember` check on the `Message` handler.
5. **Deploy:** Run the script on a server.