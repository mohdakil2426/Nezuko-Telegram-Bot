## Context
The project currently uses Supabase for Authentication and a custom WebSocket implementation for real-time log streaming. We are migrating to a Hybrid Firebase architecture where stateless services (Auth, Logs) utilize Firebase's managed infrastructure, while stateful relational data (Groups, Channels) remains in PostgreSQL.

## Goals / Non-Goals
- **Goals**:
  - Fully replace Supabase Auth with Firebase Auth (Email/Password).
  - Replace WebSocket log streaming with Firebase Realtime Database.
  - Maintain existing PostgreSQL database schema and SQLAlchemy logic.
  - Zero-downtime migration for existing data (though it's a new project, so data migration is minimal/not required).

- **Non-Goals**:
  - Migrating Relational Data (Users, Groups, Channels) to Firestore.
  - Replacing Redis (still used for Rate Limiting and Caching).

## Decisions
- **Decision: Hybrid Architecture (Postgres + Firebase)**
  - **Rationale**: The bot's core logic relies heavily on complex relational queries (e.g., "Find all channels linked to this group"). rewriting this to NoSQL (Firestore) would require a complete re-architecture of the `bot/` directory and `apps/api/`. Keeping Postgres minimizes risk and development time.
  
- **Decision: Firebase Realtime Database for Logs**
  - **Rationale**: WebSockets are stateful and hard to scale/debug in serverless environments (like Cloud Run). RTDB provides a robust pub/sub mechanism out of the box.
  - **Path Structure**: `/logs/{user_id}/{log_id}` with TTL (managed by Cloud Functions or simple client-side limits).

## Risks / Trade-offs
- **Risk**: Vendor Lock-in.
  - **Mitigation**: The code is modular. `AuthService` and `LogService` are interfaces that can be swapped back if needed.
- **Trade-off**: Higher verification latency if Firebase Auth is slow?
  - **Mitigation**: Firebase ID Account validation is stateles (JWT signature check) after initial key fetch. Fast.
