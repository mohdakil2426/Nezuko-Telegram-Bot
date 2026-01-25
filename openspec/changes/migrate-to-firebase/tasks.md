## 1. Infrastructure Strategy
- [x] 1.1 Create `firebase.json` and `.firebaserc` for project configuration.
- [x] 1.2 Document required Firebase environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).


## 2. Backend Implementation (FastAPI)
- [x] 2.1 Remove Supabase dependencies and install `firebase-admin`.
- [x] 2.2 Initialize `firebase-admin` in `src/core/config.py`.
- [x] 2.3 Refactor `src/core/security.py` to verify Firebase ID Tokens.
- [x] 2.4 Update `AuthService` to sync Firebase Users to local `admin_users` table (maintain RBAC).
- [x] 2.5 Refactor `RedisListener` (or create `FirebaseLogListener`) to push log entries to Firebase Realtime Database using `firebase-admin`.
- [x] 2.6 Remove legacy WebSocket endpoints and dependencies.

## 3. Frontend Implementation (Next.js)
- [x] 3.1 Uninstall Supabase SDKs and install `firebase`.
- [x] 3.2 Create `src/lib/firebase.ts` to initialize Firebase App.
- [x] 3.3 Re-implement `useAuth` hook (`src/lib/hooks/use-auth.tsx`) to use `onAuthStateChanged`.
- [x] 3.4 Update `LoginForm` to use `signInWithEmailAndPassword` from Firebase.
- [x] 3.5 Update `LogViewer` component to subscribe to Firebase Realtime Database (`onValue`).
- [x] 3.6 Update Middleware (`middleware.ts`) to validate session (or delegate to client-side checks for simple implementations, or use `firebase-admin` in middleware if edge-compatible). *Note: Firebase Admin is not Edge compatible usually; we might switch to client-side protection or a session cookie approach if strict server middleware is needed.* -> **Strategy**: Use client-side protection for now + API token verification.

## 4. Verification
- [ ] 4.1 Test Login flow with Firebase User.
- [ ] 4.2 Verify API requests are accepted with Firebase Identity Token.
- [ ] 4.3 Verify Logs appear in Dashboard when triggering bot actions.
- [ ] 4.4 Run full test suite to ensure no regressions in Bot core.
