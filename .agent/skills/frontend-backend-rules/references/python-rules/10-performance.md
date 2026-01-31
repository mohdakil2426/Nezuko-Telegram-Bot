# Performance Optimization & Latency

## Connection Pooling

**RULE: Use connection pooling for all external services. Never create new connections per request.**

```python
# ✅ CORRECT: Connection pooling with proper lifecycle
from contextlib import asynccontextmanager
from aiohttp import ClientSession, TCPConnector

class HttpClient:
    """Shared HTTP client with connection pooling."""
    
    _instance: Optional["HttpClient"] = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._session: Optional[ClientSession] = None
        return cls._instance
    
    async def initialize(self):
        """Initialize connection pool."""
        if self._session is None:
            connector = TCPConnector(
                limit=100,              # Max total connections
                limit_per_host=30,      # Max connections per host
                enable_cleanup_closed=True,
                force_close=False,
                ttl_dns_cache=300,      # DNS cache TTL
            )
            timeout = ClientTimeout(total=30, connect=10)
            self._session = ClientSession(
                connector=connector,
                timeout=timeout,
                headers={"User-Agent": "MyApp/1.0"},
            )
    
    async def close(self):
        """Close connection pool."""
        if self._session:
            await self._session.close()
            self._session = None
    
    @property
    def session(self) -> ClientSession:
        if not self._session:
            raise RuntimeError("HTTP client not initialized")
        return self._session

# FastAPI lifespan integration
@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client = HttpClient()
    await http_client.initialize()
    app.state.http_client = http_client
    yield
    await http_client.close()

# Usage
async def fetch_external_data(url: str) -> dict:
    client = HttpClient()
    async with client.session.get(url) as response:
        return await response.json()

# ❌ WRONG: New connection per request
async def fetch_data_bad(url: str) -> dict:
    async with aiohttp.ClientSession() as session:  # New session every time!
        async with session.get(url) as response:
            return await response.json()
```

## Database Query Optimization

**RULE: Optimize database queries. Use pagination, select only needed columns, and add proper indexes.**

```python
# ✅ CORRECT: Optimized database queries
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

class OptimizedUserRepository:
    """Repository with optimized queries."""
    
    async def get_users_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        filters: Optional[dict] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> PaginatedResult[User]:
        """Get paginated users with efficient counting."""
        
        # Build base query
        query = select(User).where(User.tenant_id == self.tenant_id)
        
        # Apply filters
        if filters:
            if filters.get("status"):
                query = query.where(User.status == filters["status"])
            if filters.get("search"):
                search = f"%{filters['search']}%"
                query = query.where(
                    or_(
                        User.name.ilike(search),
                        User.email.ilike(search)
                    )
                )
        
        # Get total count efficiently
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Apply sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        # Execute
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        return PaginatedResult(
            items=users,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        )
    
    async def get_user_with_relations(self, user_id: str) -> Optional[User]:
        """Get user with eager-loaded relations."""
        query = (
            select(User)
            .where(User.id == user_id, User.tenant_id == self.tenant_id)
            .options(
                selectinload(User.orders),
                selectinload(User.profile),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

# ❌ WRONG: Inefficient queries
async def get_users_bad(db: AsyncSession):
    # No pagination - loads all users
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    # N+1 query problem
    for user in users:
        orders = await db.execute(
            select(Order).where(Order.user_id == user.id)
        )
        user.orders = orders.scalars().all()
    
    return users
```

## Caching Strategies

**RULE: Implement multi-layer caching. Cache at Redis, in-memory, and CDN levels appropriately.**

```python
# ✅ CORRECT: Multi-layer caching
from functools import wraps
import hashlib
import json

class MultiLayerCache:
    """Multi-layer caching: L1 (memory) -> L2 (Redis) -> L3 (origin)."""
    
    def __init__(self):
        self._local_cache: dict = {}
        self.redis = get_redis()
        self.local_ttl = 60  # 1 minute
        self.redis_ttl = 300  # 5 minutes
    
    def _make_key(self, prefix: str, *args, **kwargs) -> str:
        """Create cache key from function arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        hash_key = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{hash_key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get from cache (L1 -> L2)."""
        # L1: Local cache
        if key in self._local_cache:
            value, expiry = self._local_cache[key]
            if time.time() < expiry:
                return value
            del self._local_cache[key]
        
        # L2: Redis
        data = await self.redis.get(key)
        if data:
            value = json.loads(data)
            # Populate L1
            self._local_cache[key] = (value, time.time() + self.local_ttl)
            return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set in both cache layers."""
        # L1
        self._local_cache[key] = (value, time.time() + self.local_ttl)
        
        # L2
        await self.redis.setex(
            key,
            ttl or self.redis_ttl,
            json.dumps(value, default=str)
        )
    
    async def delete(self, key: str):
        """Delete from both cache layers."""
        self._local_cache.pop(key, None)
        await self.redis.delete(key)
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache by pattern."""
        # Clear local cache matching pattern
        keys_to_remove = [k for k in self._local_cache if pattern in k]
        for k in keys_to_remove:
            del self._local_cache[k]
        
        # Clear Redis cache
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=f"*{pattern}*", count=100)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

def cached(prefix: str, ttl: int = 300):
    """Decorator for caching function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = MultiLayerCache()
            cache_key = cache._make_key(prefix, *args, **kwargs)
            
            # Try cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

# Usage
@cached("user_profile", ttl=600)
async def get_user_profile(user_id: str) -> UserProfile:
    """Get user profile with caching."""
    return await db.users.find_one({"_id": user_id})

@cached("product_catalog", ttl=3600)
async def get_product_catalog(tenant_id: str) -> list[Product]:
    """Get product catalog with long cache."""
    return await product_service.list_all(tenant_id)
```

## Async Batching

**RULE: Batch operations to reduce round-trips. Use bulk inserts/updates when possible.**

```python
# ✅ CORRECT: Batched operations
async def batch_update_status(
    item_ids: list[str],
    new_status: str,
    batch_size: int = 100
) -> int:
    """Update status in batches."""
    updated = 0
    
    for i in range(0, len(item_ids), batch_size):
        batch = item_ids[i:i + batch_size]
        
        # Single query for batch
        result = await db.execute(
            update(Item)
            .where(Item.id.in_(batch))
            .values(status=new_status, updated_at=datetime.utcnow())
        )
        updated += result.rowcount
        
        # Brief yield to prevent blocking
        if i + batch_size < len(item_ids):
            await asyncio.sleep(0)
    
    return updated

async def bulk_insert_users(
    users_data: list[dict],
    batch_size: int = 1000
) -> list[str]:
    """Bulk insert users."""
    inserted_ids = []
    
    for i in range(0, len(users_data), batch_size):
        batch = users_data[i:i + batch_size]
        
        # Use bulk insert
        result = await db.execute(
            insert(User).values(batch).returning(User.id)
        )
        inserted_ids.extend([row[0] for row in result])
    
    await db.commit()
    return inserted_ids

# ❌ WRONG: Individual operations
async def update_status_bad(item_ids: list[str], new_status: str):
    for item_id in item_ids:  # One query per item!
        await db.execute(
            update(Item)
            .where(Item.id == item_id)
            .values(status=new_status)
        )
    await db.commit()
```

## Lazy Loading vs Eager Loading

**RULE: Choose loading strategy based on access patterns. Use lazy loading for optional data, eager for required.**

```python
# ✅ CORRECT: Strategic loading
class OrderService:
    async def list_orders_summary(self, user_id: str) -> list[OrderSummary]:
        """List orders - only load summary data."""
        query = (
            select(Order.id, Order.total, Order.status, Order.created_at)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
        )
        result = await db.execute(query)
        return [OrderSummary(**row) for row in result]
    
    async def get_order_detail(self, order_id: str) -> Optional[OrderDetail]:
        """Get full order - eager load all relations."""
        query = (
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.shipping_address),
                selectinload(Order.payment),
                selectinload(Order.user),
            )
        )
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        
        if not order:
            return None
        
        return OrderDetail.from_orm(order)

# GraphQL-style selective loading
async def get_orders_with_fields(
    user_id: str,
    fields: list[str]
) -> list[dict]:
    """Load only requested fields."""
    # Build select based on requested fields
    columns = [getattr(Order, f) for f in fields if hasattr(Order, f)]
    
    if not columns:
        columns = [Order.id]  # Minimum: ID
    
    query = select(*columns).where(Order.user_id == user_id)
    result = await db.execute(query)
    
    return [dict(row) for row in result]
```

## Compression

**RULE: Compress large payloads. Use gzip/brotli for HTTP responses and large cache values.**

```python
# ✅ CORRECT: Response compression
import gzip
import brotli

class CompressionMiddleware:
    """Middleware for response compression."""
    
    MIN_SIZE = 1024  # Only compress responses > 1KB
    
    async def __call__(self, request: Request, call_next):
        response = await call_next(request)
        
        # Check if compression is requested
        accept_encoding = request.headers.get("accept-encoding", "")
        
        if response.status_code != 200:
            return response
        
        body = b"".join([chunk async for chunk in response.body_iterator])
        
        if len(body) < self.MIN_SIZE:
            return Response(content=body, status_code=response.status_code)
        
        # Choose compression
        if "br" in accept_encoding:
            compressed = brotli.compress(body, quality=4)
            content_encoding = "br"
        elif "gzip" in accept_encoding:
            compressed = gzip.compress(body, compresslevel=6)
            content_encoding = "gzip"
        else:
            return Response(content=body, status_code=response.status_code)
        
        return Response(
            content=compressed,
            status_code=response.status_code,
            headers={
                "Content-Encoding": content_encoding,
                "Content-Length": str(len(compressed)),
                "Vary": "Accept-Encoding",
            },
            media_type=response.media_type,
        )

# Cache compression
async def set_compressed_cache(key: str, data: Any, ttl: int = 300):
    """Store compressed data in cache."""
    json_data = json.dumps(data, default=str).encode()
    compressed = gzip.compress(json_data, compresslevel=6)
    
    await redis.setex(f"compressed:{key}", ttl, compressed)

async def get_compressed_cache(key: str) -> Optional[Any]:
    """Get and decompress data from cache."""
    compressed = await redis.get(f"compressed:{key}")
    if not compressed:
        return None
    
    json_data = gzip.decompress(compressed)
    return json.loads(json_data)
```

---

[← Back to Multi-Tenant Isolation](./09-multi-tenant.md) | [Next: Memory Management →](./11-memory-management.md)