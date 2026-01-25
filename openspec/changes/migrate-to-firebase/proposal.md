# Change: Migrate to Firebase (Hybrid)

## Why
The project aims to leverage the scalability and managed services of the Google Firebase ecosystem while retaining the relational data integrity of PostgreSQL. The user has an existing Firebase plan and wants to utilize it for Authentication, Logging, and potentially Hosting, reducing the operational burden of managing self-hosted WebSockets and Auth services.

## What Changes
- **Authentication**: Migrate from Supabase Auth to **Firebase Authentication**.
  - Backend: Verify Firebase ID Tokens instead of Supabase JWTs.
  - Frontend: Use Firebase JS SDK (`firebase/auth`) for login/session.
- **Logging**: Migrate from WebSocket-based log streaming to **Firebase Realtime Database**.
  - Backend: Write distinct log entries to a user-specific RTDB path.
  - Frontend: Subscribe to RTDB for live log updates.
- **Dependencies**: 
  - Remove `supabase`, `websockets` (from logging context).
  - Add `firebase-admin` (Backend), `firebase` (Frontend).

## Impact
- **Affected Specs**: `identity`, `observability`.
- **Affected Code**:
  - `apps/api/src/core/security.py`
  - `apps/api/src/services/auth_service.py`
  - `apps/api/src/core/logging.py` & `redis_listener.py`
  - `apps/web/src/lib/auth.tsx`
  - `apps/web/src/lib/firebase.ts` (New)
  - `apps/web/src/components/log-viewer.tsx`
