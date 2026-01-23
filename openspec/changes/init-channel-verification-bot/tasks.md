## 1. Setup & initialization
- [ ] 1.1 Create project structure (Python/Node.js) and install dependencies (`python-telegram-bot` or `telegraf`).
- [ ] 1.2 Setup environment variables (`BOT_TOKEN`, `CHANNEL_ID`, `GROUP_ID`).
- [ ] 1.3 Implement basic bot startup and connection verification.

## 2. Core Logic Implementation
- [ ] 2.1 Implement `getChatMember` check function to verify user status.
- [ ] 2.2 Create `message_handler` to intercept group messages and trigger verification.
- [ ] 2.3 Implement restriction logic (`restrictChatMember`) for non-members (Mute).
- [ ] 2.4 Implement "Warning Message" with "Join" and "Verify" inline buttons.

## 3. Interaction & Re-verification
- [ ] 3.1 Implement `callback_query_handler` for the "Verify" button.
- [ ] 3.2 Implement logic to re-check status and Unmute (`restrictChatMember` to true) if verified.
- [ ] 3.3 Implement cleanup (delete warning message on success or timeout).

## 4. Testing & Deployment
- [ ] 4.1 Test "Non-Member" scenario (Mute & Warn).
- [ ] 4.2 Test "Member" scenario (Allow).
- [ ] 4.3 Test "Re-verification" scenario (Unmute).
- [ ] 4.4 Deploy to target environment.
