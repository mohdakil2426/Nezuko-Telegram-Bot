# 11. Memory Management & Leak Prevention

## Garbage Collection & Cyclic References

**RULE: Be aware of circular references in async code. Use weak references when appropriate.**

```python
# ✅ CORRECT: Avoid circular references in callbacks
import weakref

class UserService:
    def __init__(self):
        self.cache = {}
    
    async def get_user(self, user_id: str):
        if user_id in self.cache:
            return self.cache[user_id]
        
        user = await fetch_user(user_id)
        self.cache[user_id] = user
        return user
    
    def clear_cache(self):
        self.cache.clear()

# ✅ CORRECT: Use WeakSet for listener management
class EventBus:
    def __init__(self):
        self.listeners = weakref.WeakSet()
    
    def subscribe(self, listener):
        self.listeners.add(listener)  # Won't prevent garbage collection
    
    async def publish(self, event):
        # Iterate over a list copy (listeners may be GC'd)
        for listener in list(self.listeners):
            try:
                await listener(event)
            except Exception as e:
                logger.error("Listener error", exc_info=e)

# ✅ CORRECT: Proper cleanup in finally block
async def process_large_file(file_path: str):
    file_handle = open(file_path, 'rb')
    try:
        chunks = []
        async for chunk in iterate_file(file_handle):
            processed = await process_chunk(chunk)
            chunks.append(processed)
        return chunks
    finally:
        file_handle.close()  # Always closed

# ❌ WRONG: Circular reference in task callback
def subscribe(listener):
    task = asyncio.create_task(listener())
    
    def on_done(t):
        # Holds reference to listener—circular reference
        logger.info(f"Listener {listener} done")
    
    task.add_done_callback(on_done)

# ❌ WRONG: Unbounded cache growth
self.user_cache = {}

async def get_user(self, user_id: str):
    if user_id not in self.user_cache:
        self.user_cache[user_id] = await fetch_user(user_id)
    # Cache grows forever, no TTL, no eviction
    return self.user_cache[user_id]
```

## Context Variable Cleanup

**RULE: ContextVars are per-task. Ensure cleanup happens if tasks are cancelled.**

```python
# ✅ CORRECT: Context variable with cleanup
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str] = ContextVar("user_id", default=None)

@app.middleware("http")
async def add_request_context(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    
    token_id = request_id_var.set(request_id)
    try:
        response = await call_next(request)
        return response
    finally:
        request_id_var.reset(token_id)  # Cleanup

# ✅ CORRECT: Use in logging
logger.info("Processing request", extra={
    "request_id": request_id_var.get(),
})

# ❌ WRONG: ContextVar not reset
@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request_id_var.set(str(uuid.uuid4()))
    # No reset—next task may see previous task's request_id
    return await call_next(request)
```

## Long-Running Tasks & Streaming

**RULE: For long-running operations (video processing, large file download), use streaming and chunking. Never load entire file in memory.**

```python
# ✅ CORRECT: Streaming response
from fastapi.responses import StreamingResponse

async def iter_file(file_path: str, chunk_size: int = 1024 * 1024):
    """Iterate file in chunks to avoid loading entire file in memory."""
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk

@app.get("/download/{file_id}")
async def download_file(file_id: str, current_user: User = Depends(get_current_user)):
    file_path = await db.get_file_path(file_id, current_user.id)
    
    if not file_path:
        raise HTTPException(status_code=404)
    
    return StreamingResponse(
        iter_file(file_path),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_id}"}
    )

# ✅ CORRECT: Streaming request
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    file_path = f"/uploads/{user.id}/{uuid.uuid4()}"
    
    with open(file_path, 'wb') as f:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            f.write(chunk)
    
    return {"file_id": file_path}

# ❌ WRONG: Loading entire file in memory
@app.get("/download/{file_id}")
async def download_file(file_id: str):
    file_content = open(file_id, 'rb').read()  # Entire file in memory!
    return FileResponse(file_id)

# ❌ WRONG: Large UploadFile buffering
@app.post("/upload")
async def upload_file(file: UploadFile):
    contents = await file.read()  # Entire file in memory
    # Process
```
