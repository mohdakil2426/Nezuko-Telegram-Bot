# Specification: Multi-Bot Management

## Overview

This specification defines the Bot Management feature allowing the owner to add, view, edit, and delete multiple Telegram bots from the dashboard.

## Actors

- **Owner**: The authenticated dashboard owner who manages bots

---

## Feature: Bot List Page

### Scenario: View empty bot list

- **GIVEN** the owner is logged in
- **AND** no bots have been added yet
- **WHEN** they navigate to `/dashboard/bots`
- **THEN** they see the page title "My Bots"
- **AND** they see an empty state with message "No bots added yet"
- **AND** they see a prominent "Add Your First Bot" button

### Scenario: View bot list with bots

- **GIVEN** the owner has added 2 or more bots
- **WHEN** they navigate to `/dashboard/bots`
- **THEN** they see the page title "My Bots"
- **AND** they see an "Add Bot" button in the header
- **AND** they see a list of bot cards
- **AND** each card shows:
  - Bot avatar (from Telegram)
  - Bot username (@username)
  - Bot display name
  - Status badge (Active/Paused)
  - Group count
  - Actions menu (Edit, Delete)

### Scenario: Bot list ordering

- **GIVEN** multiple bots exist
- **WHEN** viewing the bot list
- **THEN** bots are ordered by creation date (newest first)

---

## Feature: Add Bot

### Scenario: Open add bot dialog

- **GIVEN** the owner is on the bots page
- **WHEN** they click "Add Bot"
- **THEN** a dialog opens with title "Add New Bot"
- **AND** there is an input field for "Bot Token"
- **AND** there are "Cancel" and "Verify & Add" buttons

### Scenario: Verify valid bot token

- **GIVEN** the add bot dialog is open
- **WHEN** the owner pastes a valid bot token
- **AND** clicks "Verify & Add"
- **THEN** a loading state is shown
- **AND** the API calls Telegram's `getMe` endpoint
- **AND** the bot info is displayed (name, username)
- **AND** a "Confirm" button appears

### Scenario: Confirm and save bot

- **GIVEN** the bot token has been verified
- **WHEN** the owner clicks "Confirm"
- **THEN** the bot token is encrypted and saved to database
- **AND** the dialog closes
- **AND** a success toast shows "Bot @username added successfully"
- **AND** the bot appears in the list

### Scenario: Invalid bot token

- **GIVEN** the add bot dialog is open
- **WHEN** the owner enters an invalid token
- **AND** clicks "Verify & Add"
- **THEN** an error message shows "Invalid bot token. Please check and try again."
- **AND** the input field is highlighted with error state

### Scenario: Duplicate bot token

- **GIVEN** a bot already exists with a certain token
- **WHEN** the owner tries to add the same token again
- **THEN** an error message shows "This bot has already been added"

### Scenario: Cancel add bot

- **GIVEN** the add bot dialog is open
- **WHEN** the owner clicks "Cancel" or clicks outside
- **THEN** the dialog closes without saving

---

## Feature: Bot Details

### Scenario: View bot details

- **GIVEN** a bot exists in the list
- **WHEN** the owner clicks on the bot card
- **THEN** they are navigated to `/dashboard/bots/[id]`
- **AND** they see:
  - Bot avatar and name
  - Status toggle
  - Username
  - Date added
  - List of linked groups (if any)
  - "Delete Bot" button

### Scenario: Bot with linked groups

- **GIVEN** the bot is linked to protected groups
- **WHEN** viewing bot details
- **THEN** the groups are listed with their names
- **AND** a note explains these groups use this bot for enforcement

---

## Feature: Toggle Bot Status

### Scenario: Deactivate an active bot

- **GIVEN** a bot is currently active
- **WHEN** the owner clicks the status toggle
- **THEN** a confirmation dialog asks "Deactivate this bot?"
- **WHEN** they confirm
- **THEN** the bot status changes to "Paused"
- **AND** the badge updates to show "Paused"
- **AND** a toast confirms "Bot deactivated"

### Scenario: Activate a paused bot

- **GIVEN** a bot is currently paused
- **WHEN** the owner clicks the status toggle
- **THEN** the bot status changes to "Active"
- **AND** the badge updates to show "Active"
- **AND** a toast confirms "Bot activated"

---

## Feature: Delete Bot

### Scenario: Delete bot without linked groups

- **GIVEN** a bot exists with no linked groups
- **WHEN** the owner clicks "Delete Bot"
- **THEN** a confirmation dialog appears
- **AND** it says "Are you sure you want to delete @username?"
- **WHEN** they confirm
- **THEN** the bot is deleted from database
- **AND** the encrypted token is removed
- **AND** they are redirected to `/dashboard/bots`
- **AND** a toast confirms "Bot deleted"

### Scenario: Delete bot with linked groups

- **GIVEN** a bot has linked protected groups
- **WHEN** the owner clicks "Delete Bot"
- **THEN** a warning dialog appears
- **AND** it says "This bot is linked to X groups. Deleting will unlink them."
- **AND** lists the affected groups
- **WHEN** they confirm
- **THEN** the bot and its links are deleted
- **AND** groups are unlinked (not deleted)

### Scenario: Cancel delete

- **GIVEN** the delete confirmation dialog is open
- **WHEN** the owner clicks "Cancel"
- **THEN** the dialog closes without deleting

---

## Feature: Sidebar Navigation

### Scenario: Bots link in sidebar

- **GIVEN** the owner is logged in
- **WHEN** viewing any dashboard page
- **THEN** the sidebar shows a "Bots" navigation item
- **AND** it has a bot icon
- **AND** clicking it navigates to `/dashboard/bots`

---

## API Endpoints

### GET /api/v1/bots

- **Description**: List all bots for owner
- **Auth**: Required (session)
- **Response**: Array of bot objects (without token)

### POST /api/v1/bots

- **Description**: Add new bot
- **Auth**: Required (session)
- **Body**: `{ token: string }`
- **Response**: Created bot object
- **Errors**: 400 (invalid token), 409 (duplicate)

### GET /api/v1/bots/{id}

- **Description**: Get single bot details
- **Auth**: Required (session)
- **Response**: Bot object with linked groups

### PATCH /api/v1/bots/{id}

- **Description**: Update bot (toggle active)
- **Auth**: Required (session)
- **Body**: `{ is_active: boolean }`
- **Response**: Updated bot object

### DELETE /api/v1/bots/{id}

- **Description**: Delete bot and unlink groups
- **Auth**: Required (session)
- **Response**: 204 No Content

---

## ADDED Requirements

### Requirement: Token Security

- Bot tokens must be encrypted at rest using Fernet
- Tokens must NEVER be returned in API responses
- Tokens are only decrypted when needed for Telegram API calls

### Requirement: UI Consistency

- All UI components must use shadcn/ui
- Follow existing dashboard styling (cards, buttons, dialogs)
- Maintain glass effect and accent color theming

### Requirement: Mobile Responsiveness

- Bot list must be responsive on mobile
- Cards should stack vertically on small screens
- Dialog should be mobile-friendly

### Requirement: Error Handling

- Show clear error messages for all failure cases
- Log errors for debugging
- Never expose internal errors to UI
