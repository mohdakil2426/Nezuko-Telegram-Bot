# Specification: Telegram Authentication

## Overview

This specification defines the Telegram Login Widget integration for owner-only authentication to the Nezuko Dashboard.

## Actors

- **Owner**: The single user who owns the dashboard and bots (identified by Telegram ID)
- **Non-Owner**: Any other Telegram user attempting to access the dashboard

---

## Feature: Telegram Login Widget Display

### Scenario: Owner visits login page

- **GIVEN** the owner is not logged in
- **WHEN** they navigate to `/login`
- **THEN** they see the dashboard logo and name
- **AND** they see a "Login with Telegram" button (Telegram widget)
- **AND** they see text "Only the project owner can access this dashboard"

### Scenario: Login page styling

- **GIVEN** the login page is displayed
- **THEN** it uses the existing glass effect background
- **AND** all UI elements use shadcn/ui components
- **AND** the layout is centered and mobile-responsive

---

## Feature: Telegram Login Flow

### Scenario: Owner initiates login

- **GIVEN** the owner is on the login page
- **WHEN** they click the Telegram Login Widget
- **THEN** a popup appears asking them to confirm login in Telegram
- **AND** the popup shows the bot name (@NezukoBot)

### Scenario: Owner confirms in Telegram

- **GIVEN** the owner clicked the login widget
- **WHEN** they confirm the login in their Telegram app/desktop
- **THEN** Telegram sends signed auth data back to the browser
- **AND** the data includes: id, first_name, last_name, username, photo_url, auth_date, hash

### Scenario: Successful owner authentication

- **GIVEN** Telegram has returned auth data
- **WHEN** the dashboard sends data to `/api/v1/auth/telegram`
- **AND** the HMAC-SHA256 hash is valid
- **AND** the `auth_date` is within 5 minutes
- **AND** the `id` matches `BOT_OWNER_TELEGRAM_ID`
- **THEN** a session is created in the database
- **AND** an HTTP-only secure cookie is set with session ID
- **AND** the owner is redirected to `/dashboard`

### Scenario: Non-owner attempts login

- **GIVEN** a non-owner user clicks the login widget
- **WHEN** Telegram returns their auth data
- **AND** the API verifies the hash is valid
- **AND** the `id` does NOT match `BOT_OWNER_TELEGRAM_ID`
- **THEN** the API returns 403 Forbidden
- **AND** the error message says "Access restricted to project owner only"
- **AND** the user remains on the login page
- **AND** an error toast is displayed

### Scenario: Invalid or tampered auth data

- **GIVEN** auth data is received
- **WHEN** the HMAC-SHA256 hash does not match
- **THEN** the API returns 401 Unauthorized
- **AND** the error message says "Invalid authentication data"

### Scenario: Expired auth data (replay attack prevention)

- **GIVEN** auth data is received
- **WHEN** the `auth_date` is older than 5 minutes
- **THEN** the API returns 401 Unauthorized
- **AND** the error message says "Authentication expired. Please try again."

---

## Feature: Session Management

### Scenario: Valid session access

- **GIVEN** the owner has a valid session cookie
- **WHEN** they access any `/dashboard/*` page
- **THEN** the middleware validates the session
- **AND** the page loads normally

### Scenario: Expired session

- **GIVEN** the owner has an expired session cookie
- **WHEN** they access any `/dashboard/*` page
- **THEN** the middleware detects the expired session
- **AND** the owner is redirected to `/login`
- **AND** the expired session is deleted from database

### Scenario: Missing session cookie

- **GIVEN** the user has no session cookie
- **WHEN** they access any `/dashboard/*` page
- **THEN** they are redirected to `/login`

### Scenario: Owner logs out

- **GIVEN** the owner is logged in
- **WHEN** they click "Logout" in the dashboard
- **THEN** the session is deleted from database
- **AND** the session cookie is cleared
- **AND** they are redirected to `/login`

---

## Feature: Get Current User

### Scenario: Get owner info

- **GIVEN** the owner is logged in with valid session
- **WHEN** the dashboard calls `GET /api/v1/auth/me`
- **THEN** the API returns owner info:
  - `telegram_id`: number
  - `username`: string (nullable)
  - `first_name`: string
  - `last_name`: string (nullable)
  - `photo_url`: string (nullable)

### Scenario: Unauthenticated user

- **GIVEN** no valid session exists
- **WHEN** calling `GET /api/v1/auth/me`
- **THEN** the API returns 401 Unauthorized

---

## ADDED Requirements

### Requirement: Environment Configuration

- `LOGIN_BOT_TOKEN` must be set in `apps/api/.env`
- `BOT_OWNER_TELEGRAM_ID` must be set in `apps/api/.env`
- Missing config should fail at startup with clear error message

### Requirement: Security

- Session cookie must have `HttpOnly`, `Secure`, `SameSite=Lax` flags
- HMAC verification must use timing-safe comparison
- Failed login attempts should be logged for audit

### Requirement: Local Development

- Document ngrok setup for HTTPS in development
- Allow configurable auth bypass for development (MOCK_AUTH flag)
