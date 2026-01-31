# Firebase Admin SDK Integration

## Initialization & Credential Management

**RULE: Initialize Firebase once per application (or per worker in multi-worker setup). Credentials must be loaded from environment, never committed to code.**

```python
# ✅ CORRECT: Single initialization in lifespan
from firebase_admin import credentials, initialize_app, db as firebase_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load credentials from environment
    service_account_key = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
    
    cred = credentials.Certificate(service_account_key)
    firebase_app = initialize_app(cred, {
        "databaseURL": os.getenv("FIREBASE_DATABASE_URL"),
    })
    
    app.state.firebase = firebase_app
    logger.info("Firebase initialized")
    
    yield
    
    # Cleanup not necessary—Firebase cleanup is automatic

app = FastAPI(lifespan=lifespan)

# ✅ CORRECT: Lazy initialization per worker (alternative)
def get_firebase():
    if not hasattr(get_firebase, "_app"):
        service_account_key = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
        cred = credentials.Certificate(service_account_key)
        get_firebase._app = initialize_app(cred, {...})
    return get_firebase._app

# ❌ WRONG: Credentials hardcoded
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": "my-project",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...",
})

# ❌ WRONG: Multiple initializations
firebase_app_1 = initialize_app(cred)
firebase_app_2 = initialize_app(cred)  # TypeError—already initialized
```

## Firestore Operations

**RULE: Firestore v3+ supports async APIs. Use async-native operations, not sync wrappers.**

```python
# ✅ CORRECT: Async Firestore operations (v3+)
from firebase_admin import firestore_async

async def get_user(db: firestore_async.AsyncClient, user_id: str) -> dict:
    doc = await db.collection("users").document(user_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()

async def create_user(db: firestore_async.AsyncClient, user_id: str, data: dict) -> None:
    # Use transaction for atomic writes
    async def set_user(transaction):
        await transaction.set(
            db.collection("users").document(user_id),
            {
                "id": user_id,
                **data,
                "created_at": firestore.SERVER_TIMESTAMP,
            }
        )
    
    transaction = db.transaction()
    await transaction.in_transaction(set_user)

@app.post("/users")
async def create_new_user(user_data: UserSchema, db: firestore_async.AsyncClient = Depends(get_firestore)):
    try:
        await create_user(db, str(uuid.uuid4()), user_data.dict())
        return {"status": "created"}
    except Exception as e:
        logger.error("User creation failed", exc_info=e)
        raise HTTPException(status_code=500)

# ❌ WRONG: Sync Firestore API blocking event loop
from firebase_admin import firestore

def get_user(user_id: str) -> dict:
    db = firestore.client()  # Blocking call
    doc = db.collection("users").document(user_id).get()  # Blocking
    return doc.to_dict()

# ❌ WRONG: Calling blocking method from async context
async def get_user_wrong(user_id: str):
    db = firestore.client()  # Blocking—don't do this
    doc = db.collection("users").document(user_id).get()
    return doc.to_dict()
```

## Firestore Transactions

**RULE: Transactions must be atomic. Use `transaction.in_transaction()` for async, `transaction.run()` for sync-only code.**

```python
# ✅ CORRECT: Async transaction with rollback safety
async def transfer_credits(
    db: firestore_async.AsyncClient,
    from_user: str,
    to_user: str,
    amount: int
) -> None:
    """Transfer credits between users atomically."""
    
    async def transact(transaction):
        from_ref = db.collection("users").document(from_user)
        to_ref = db.collection("users").document(to_user)
        
        # Read phase
        from_doc = await transaction.get(from_ref)
        to_doc = await transaction.get(to_ref)
        
        from_balance = from_doc.get("balance", 0)
        to_balance = to_doc.get("balance", 0)
        
        # Validation
        if from_balance < amount:
            raise ValueError("Insufficient balance")
        
        # Write phase
        await transaction.update(from_ref, {"balance": from_balance - amount})
        await transaction.update(to_ref, {"balance": to_balance + amount})
    
    transaction = db.transaction()
    await transaction.in_transaction(transact)

# ✅ CORRECT: Explicit error handling
try:
    await transfer_credits(db, "user1", "user2", 100)
except ValueError as e:
    logger.warning("Transfer validation failed", exc_info=e)
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error("Transfer failed", exc_info=e)
    raise HTTPException(status_code=500)

# ❌ WRONG: Missing validation in transaction
async def transfer_credits_wrong(db, from_user, to_user, amount):
    async def transact(transaction):
        # No balance check!
        await transaction.update(from_ref, {"balance": from_balance - amount})
        await transaction.update(to_ref, {"balance": to_balance + amount})
    
    transaction = db.transaction()
    await transaction.in_transaction(transact)

# ❌ WRONG: Non-atomic operations
from_doc = await db.collection("users").document(from_user).get()
from_balance = from_doc.get("balance", 0)
await db.collection("users").document(from_user).update({"balance": from_balance - amount})
# Race condition: another operation could modify balance between read and write
```

## Firestore Security Rules & Authorization

**RULE: Every Firestore query must include tenant filtering. Authorization must happen on both client (Firestore Rules) and server (query filter).**

```python
# ✅ CORRECT: Backend enforces tenant isolation
async def get_tenant_users(
    db: firestore_async.AsyncClient,
    tenant_id: str,
    current_user: User = Depends(get_current_user)
) -> list[dict]:
    """Get users for tenant (with authorization check)."""
    
    # Verify user belongs to tenant
    user_tenant = await db.collection("users").document(current_user.id).get()
    user_tenant_id = user_tenant.get("tenant_id")
    
    if user_tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Query users for tenant
    query = db.collection("users").where("tenant_id", "==", tenant_id)
    docs = await query.stream()
    
    users = []
    async for doc in docs:
        users.append(doc.to_dict())
    
    return users

# ✅ CORRECT: Firestore Security Rules (example)
# allow read, write: if request.auth.uid != null 
#                    && resource.data.tenant_id == request.auth.claims.tenant_id;

# ❌ WRONG: No tenant filtering
async def get_users(db: firestore_async.AsyncClient):
    docs = await db.collection("users").stream()  # Returns ALL users
    return [doc.to_dict() for doc in docs]

# ❌ WRONG: Tenant filtering only in Rules, not in backend
async def get_users(db: firestore_async.AsyncClient, tenant_id: str):
    # Relies entirely on Firestore Rules; no backend validation
    query = db.collection("users").where("tenant_id", "==", tenant_id)
    docs = await query.stream()
    return [doc.to_dict() async for doc in docs]
```

## Firestore Real-Time Listeners (Limited Async Support)

**RULE: Firestore Real-Time Listeners are callback-based, not async-native. Use for background sync only, not in request handlers.**

```python
# ✅ CORRECT: Real-time listener for background sync
def on_user_update(doc_snapshot, changes, read_time):
    for doc in doc_snapshot:
        user = doc.to_dict()
        logger.info("User updated", extra={"user_id": user["id"]})
        # Update cache, send events, etc.

# Start listener in lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = firestore.client()
    unsubscribe = db.collection("users").on_snapshot(on_user_update)
    
    yield
    
    unsubscribe()  # Stop listener on shutdown

# ❌ WRONG: Using Real-Time Listener in request handler
@app.get("/users/{user_id}")
async def get_user_with_listener(user_id: str):
    db = firestore.client()
    
    def on_snapshot(doc_snapshot):
        user = doc_snapshot[0].to_dict()
        # This callback runs asynchronously—hard to handle in request context
    
    # Listener starts but request returns immediately—no user data
    unsubscribe = db.collection("users").document(user_id).on_snapshot(on_snapshot)
    return {"status": "listening"}  # Wrong!
```

## Firebase Realtime Database

**RULE: Prefer Firestore for new projects. Use Realtime Database only for low-latency presence or state synchronization.**

```python
# ✅ CORRECT: Realtime Database for presence
async def set_user_online(db: firebase_db.Reference, user_id: str):
    try:
        await asyncio.to_thread(
            db.child("presence").child(user_id).set,
            {"online": True, "timestamp": server_time()}
        )
    except Exception as e:
        logger.error("Presence update failed", exc_info=e)

# ❌ WRONG: Using Realtime Database as primary database
db = firebase_db.reference()
db.child("users").child(user_id).set(user_data)  # Blocking
```

## Firebase Authentication (ID Tokens & Sessions)

**RULE: Always verify ID tokens on the backend. Trust only tokens verified with `verify_id_token()`.**

```python
from firebase_admin import auth

# ✅ CORRECT: Verify ID token with timeout and clock skew
async def verify_token(token: str, tenant_id: str = None) -> dict:
    try:
        # Verify token (includes signature check)
        decoded = await asyncio.to_thread(
            lambda: auth.verify_id_token(token, clock_skew_seconds=10)
        )
        
        # Verify custom claims
        tenant = decoded.get("custom_claims", {}).get("tenant_id")
        if tenant_id and tenant != tenant_id:
            raise ValueError("Tenant mismatch")
        
        return decoded
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error("Token verification failed", exc_info=e)
        raise HTTPException(status_code=401)

# ✅ CORRECT: Use custom claims for multi-tenant
@app.post("/login")
async def login(credentials: LoginRequest):
    # Authenticate user
    user = await auth_service.authenticate(credentials.email, credentials.password)
    
    # Set custom claims with tenant_id
    await asyncio.to_thread(
        lambda: auth.set_custom_user_claims(user.id, {"tenant_id": user.tenant_id})
    )
    
    # Generate ID token
    token = await asyncio.to_thread(
        lambda: auth.create_custom_token(user.id)
    )
    
    return {"token": token}

# ❌ WRONG: Trusting claims without verification
token = request.headers.get("Authorization").split(" ")[1]
decoded = jwt.decode(token, options={"verify_signature": False})  # DANGEROUS
user_id = decoded["sub"]

# ❌ WRONG: Not checking token expiration
decoded = auth.verify_id_token(token)
return decoded  # May be expired; Firebase doesn't throw for clock skew > 10s
```

## Firebase Analytics

**RULE: Log events asynchronously. Never block on analytics. Batch events if possible.**

```python
from firebase_admin import analytics

# ✅ CORRECT: Async analytics logging
async def log_user_action(
    user_id: str,
    action: str,
    properties: dict = None
):
    try:
        event_data = {
            "user_id": user_id,
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
            **(properties or {}),
        }
        
        # Non-blocking analytics call
        await asyncio.to_thread(
            lambda: analytics.log_event("user_action", event_data)
        )
    except Exception as e:
        logger.warning("Analytics logging failed", exc_info=e)
        # Don't raise—analytics failure shouldn't break the request

@app.post("/data")
async def process_data(request: DataRequest, user: User = Depends(get_current_user)):
    result = await process_core(request)
    
    # Log event non-blocking
    asyncio.create_task(log_user_action(user.id, "data_processed"))
    
    return result

# ❌ WRONG: Blocking analytics in request
@app.post("/data")
async def process_data(request: DataRequest):
    result = await process_core(request)
    analytics.log_event("data_processed", {})  # BLOCKS
    return result

# ❌ WRONG: Analytics call fails and crashes request
try:
    await analytics.log_event(...)  # If this fails, request fails
except Exception:
    pass  # Silent failure
```

---

[← Back to Telegram Bot](./05-telegram-bot.md) | [Next: Error Handling →](./07-error-handling.md)
