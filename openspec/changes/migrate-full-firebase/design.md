# Design: Firebase Firestore Architecture

## Context

Nezuko is a multi-tenant Telegram bot with three layers:
1. **Bot** (Python) - Telegram event handling, verification logic
2. **API** (FastAPI) - Admin panel backend, authentication
3. **Web** (Next.js) - Admin dashboard UI

Currently, each layer connects independently to PostgreSQL/SQLite via SQLAlchemy.
We need a unified data layer that:
- Scales automatically
- Provides real-time updates
- Reduces operational complexity
- Works the same in development and production

## Goals

- **G1**: Single source of truth across Bot, API, and Web
- **G2**: Real-time data sync (no polling required)
- **G3**: Zero database DevOps (no migrations, backups, scaling)
- **G4**: Sub-100ms read latency for verification lookups
- **G5**: Cost-effective for small to medium scale (free tier viable)

## Non-Goals

- **NG1**: Complex relational queries (use denormalization instead)
- **NG2**: SQL compatibility (NoSQL-first design)
- **NG3**: Multi-region active-active (single region sufficient for now)

## Decisions

### D1: Firestore as Primary Database

**Decision**: Use Cloud Firestore (Native mode) for all application data.

**Rationale**:
- Auto-scaling: Handles 1 to 1 million users without configuration
- Real-time: Native `onSnapshot` listeners for live updates
- Offline support: Client SDKs cache data locally
- Security rules: Declarative access control
- Free tier: 50K reads, 20K writes, 1GB storage per day

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Keep PostgreSQL | SQL, familiar | DevOps, no real-time |
| Firebase RTDB | Faster writes | JSON limitations, scaling |
| MongoDB Atlas | JSON documents | Separate service, cost |
| Supabase | PostgreSQL + real-time | Still requires migrations |

### D2: Denormalized Data Model

**Decision**: Use denormalized collections with embedded data for read performance.

**Rationale**:
- Firestore charges per document read
- Nested reads are free
- Verification lookups need all data in one read

**Data Model**:
```
/owners/{telegram_user_id}
  username: string
  created_at: timestamp
  settings: { ... }

/protected_groups/{group_id}
  owner_id: number
  title: string
  enabled: boolean
  member_count: number
  enforced_channels: [
    { channel_id, title, username }  // Embedded for fast reads
  ]
  created_at: timestamp
  updated_at: timestamp

/enforced_channels/{channel_id}
  title: string
  username: string
  subscriber_count: number
  linked_groups: [group_id, ...]  // Reverse lookup
  created_at: timestamp

/verifications/{auto_id}
  user_id: number
  group_id: number
  channel_id: number
  status: "pending" | "success" | "failed"
  created_at: timestamp (server)
  verified_at: timestamp | null

/admin_users/{firebase_uid}
  email: string
  role: "owner" | "admin" | "viewer"
  telegram_id: number | null
  last_login: timestamp

/admin_audit_log/{auto_id}
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  old_value: map
  new_value: map
  ip_address: string
  created_at: timestamp (server)

/_metadata/stats
  total_groups: number
  total_channels: number
  total_verifications: number
  success_rate: number
  last_updated: timestamp
```

### D3: Shared Firebase Admin SDK

**Decision**: Both Bot and API use `firebase-admin` Python SDK with the same service account.

**Rationale**:
- Single Firestore instance
- Consistent data access patterns
- Shared security context (admin SDK bypasses rules)

**Implementation**:
```python
# bot/core/firebase.py AND apps/api/src/core/firebase.py (shared)
from firebase_admin import credentials, firestore, initialize_app

def get_firestore():
    if not firebase_admin._apps:
        cred = credentials.Certificate({
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY"),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        })
        initialize_app(cred)
    return firestore.client()

db = get_firestore()
```

### D4: Real-time Web Updates via Firestore SDK

**Decision**: Web uses Firestore JS SDK directly for real-time data.

**Rationale**:
- Eliminates API polling
- Instant UI updates when data changes
- Reduces API server load
- Already using Firebase Auth

**Implementation**:
```typescript
// apps/web/src/lib/hooks/useGroups.ts
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, "protected_groups"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);
  
  return groups;
}
```

### D5: Verification Event Logging

**Decision**: Log all verification events to Firestore for analytics.

**Rationale**:
- Real-time analytics (no BigQuery needed initially)
- Query verification history per user/group
- Calculate success rates from real data

**Event Schema**:
```python
# On each verification attempt
db.collection("verifications").add({
    "user_id": user_id,
    "group_id": group_id,
    "channel_id": channel_id,
    "status": "success",  # or "failed", "pending"
    "created_at": firestore.SERVER_TIMESTAMP,
    "verified_at": firestore.SERVER_TIMESTAMP,
})
```

### D6: Metadata Collection for Dashboard Stats

**Decision**: Maintain a `_metadata/stats` document for dashboard counters.

**Rationale**:
- Avoid counting all documents on every dashboard load
- Update stats incrementally via Cloud Functions or bot events
- Sub-10ms dashboard initial load

**Implementation**:
```python
# Increment on new group protection
stats_ref = db.collection("_metadata").document("stats")
stats_ref.update({
    "total_groups": firestore.Increment(1),
    "last_updated": firestore.SERVER_TIMESTAMP,
})
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firestore costs at scale | High reads = high cost | Aggressive caching, batch reads |
| NoSQL denormalization complexity | Data inconsistency | Transactions, Cloud Functions |
| Vendor lock-in | Migration difficulty | Abstract data layer |
| Offline data conflicts | Stale data | Last-write-wins, server timestamps |

## Migration Plan

### Phase 1: Add Firestore (Parallel)
1. Install `firebase-admin` in Bot and API
2. Create Firestore collections with initial schema
3. Add write-through: Write to both SQL and Firestore
4. Verify data consistency

### Phase 2: Switch Reads to Firestore
1. Update Bot verification to read from Firestore
2. Update API services to read from Firestore
3. Update Web to use Firestore real-time hooks
4. Keep SQL as fallback

### Phase 3: Remove SQL
1. Stop writes to SQL
2. Remove SQLAlchemy dependencies
3. Delete migration files
4. Update Docker Compose

### Rollback Plan
- Keep SQL database intact during Phase 1-2
- Feature flag to switch data source
- Automated sync check before cutting over

## Open Questions

1. **Cloud Functions for stats?** 
   - Currently: Update stats in Bot/API
   - Alternative: Cloud Functions on Firestore triggers
   - Decision: Start with Bot/API, add Functions if needed

2. **Security Rules complexity?**
   - Admin SDK bypasses rules (Bot/API)
   - Web uses rules for read-only access
   - Decision: Start with permissive rules, tighten later

3. **Offline support priority?**
   - Web: Optional (admin panel usually online)
   - Bot: Critical (graceful degradation)
   - Decision: Implement caching layer in Bot
