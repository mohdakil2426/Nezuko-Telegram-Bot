# 17. Scalability & Horizontal Scaling

## Stateless Design

**RULE: Backend must be stateless. All state in database or cache. No per-worker memory.**

```python
# ✅ CORRECT: Stateless service
@app.get("/data/{data_id}")
async def get_data(data_id: str, db: AsyncSession = Depends(get_db)):
    # All data fetched from database
    data = await db.get(Data, data_id)
    return data

# ✅ CORRECT: Distributed job queue (not in-memory tasks)
@app.post("/process")
async def start_processing(request: ProcessRequest):
    # Queue job in Redis, not in-memory
    job_id = str(uuid.uuid4())
    await redis.setex(f"job:{job_id}", 86400, request.json())
    
    # Worker service picks up job from queue
    return {"job_id": job_id}

# ❌ WRONG: In-memory state
active_jobs = {}

@app.post("/process")
async def start_processing(request: ProcessRequest):
    job_id = str(uuid.uuid4())
    active_jobs[job_id] = {"status": "running"}  # WRONG—not shared across workers
    return {"job_id": job_id}

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    return active_jobs.get(job_id)  # May not exist if request hits different worker
```

## Load Balancing Considerations

**RULE: Assume requests can go to any worker. Use sticky sessions only if necessary (avoid).**

```python
# ✅ CORRECT: Works with round-robin load balancing
@app.get("/data/{data_id}")
async def get_data(data_id: str):
    # Each request is independent—any worker can handle it
    return await db.get_data(data_id)

# ❌ WRONG: Depends on sticky sessions
user_sessions = {}  # In-memory

@app.post("/login")
async def login(credentials: LoginRequest):
    session_id = str(uuid.uuid4())
    user_sessions[session_id] = {"user_id": credentials.user_id}
    return {"session_id": session_id}

@app.get("/profile")
async def get_profile(session_id: str = Query(...)):
    # Works only if request goes to SAME worker
    return user_sessions[session_id]
```

## Database as Bottleneck

**RULE: Database is the bottleneck at scale. Cache aggressively. Denormalize if needed. Monitor query performance.**

```python
# ✅ CORRECT: Cache frequently accessed data
async def get_user_with_cache(user_id: str):
    # Try cache
    cached = await redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Cache miss
    user = await db.get_user(user_id)
    
    # Populate cache
    await redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    
    return user

# ✅ CORRECT: Query optimization
async def get_users_for_tenant(tenant_id: str):
    # Index on (tenant_id, created_at) for fast filtering
    query = select(User).where(
        User.tenant_id == tenant_id
    ).order_by(User.created_at.desc()).limit(100)
    
    result = await db.execute(query)
    return result.scalars().all()

# ❌ WRONG: Full table scan
query = select(User)  # No WHERE clause
users = [u for u in users if u.tenant_id == tenant_id]

# ❌ WRONG: N+1 queries
for user in users:
    posts = await db.execute(select(Post).where(Post.user_id == user.id))
    # Executes N additional queries
```
