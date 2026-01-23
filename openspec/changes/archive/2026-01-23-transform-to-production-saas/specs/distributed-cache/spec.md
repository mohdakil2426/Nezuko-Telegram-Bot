# distributed-cache Specification

## Purpose
Provides Redis-based distributed caching to reduce Telegram API calls and improve verification latency across multiple bot instances.

## ADDED Requirements

### Requirement: Redis Connection Management
The system SHALL maintain an async Redis connection with automatic reconnection and graceful degradation on failure.

#### Scenario: Redis initialization
- **WHEN** the bot starts and `REDIS_URL` is configured
- **THEN** the system establishes an async Redis connection
- **AND** verifies connectivity with PING command
- **AND** logs: "Redis connected successfully"

#### Scenario: Redis unavailable
- **WHEN** Redis connection fails OR `REDIS_URL` is not set
- **THEN** the system logs warning: "Redis unavailable, caching disabled"
- **AND** continues operating without cache (degrades to direct API calls)
- **AND** does not crash or block verification flow

#### Scenario: Automatic reconnection
- **WHEN** Redis connection drops during operation
- **THEN** the system attempts reconnection on next cache operation
- **AND** if successful, logs: "Redis reconnected"
- **AND** if failed, continues in degraded mode

### Requirement: Membership Verification Cache
The system SHALL cache Telegram channel membership verification results with differentiated TTLs for positive and negative outcomes.

#### Scenario: Cache positive verification
- **WHEN** a user is verified as a channel member
- **THEN** the system stores in Redis: `verify:{user_id}:{channel_id} = "1"`
- **AND** sets TTL to 600 seconds ± 90 seconds (10 min with 15% jitter)
- **AND** subsequent verifications for same user-channel pair within TTL return cached result

#### Scenario: Cache negative verification
- **WHEN** a user is verified as NOT a channel member
- **THEN** the system stores in Redis: `verify:{user_id}:{channel_id} = "0"`
- **AND** sets TTL to 60 seconds ± 9 seconds (1 min with 15% jitter)
- **AND** allows faster retry after user joins (short TTL)

#### Scenario: Cache lookup
- **WHEN** verification is needed for a user-channel pair
- **THEN** the system executes `GET verify:{user_id}:{channel_id}`
- **AND** if key exists and value = "1", returns is_member=True
- **AND** if key exists and value = "0", returns is_member=False
- **AND** if key does not exist, performs API call and caches result

### Requirement: TTL Jitter Implementation
The system SHALL apply random jitter to cache TTLs to prevent thundering herd scenarios when many cached entries expire simultaneously.

#### Scenario: Calculate jittered TTL
- **WHEN** setting a cache entry with base_ttl=600 and jitter_percent=15
- **THEN** the system calculates: `actual_ttl = 600 + random.randint(-90, 90)`
- **AND** actual_ttl ranges from 510 to 690 seconds
- **AND** prevents all cached entries from expiring at the same timestamp

#### Scenario: Different jitter for different TTLs
- **WHEN** caching positive results (600s base)
- **THEN** jitter = ±90 seconds
- **WHEN** caching negative results (60s base)
- **THEN** jitter = ±9 seconds
- **AND** jitter percentage remains consistent (15%)

### Requirement: Cache Invalidation
The system SHALL provide explicit cache invalidation for scenarios requiring fresh verification data.

#### Scenario: Invalidate on verify button click
- **WHEN** a restricted user clicks "I have joined" button
- **THEN** the system executes `DEL verify:{user_id}:{channel_id}`
- **AND** forces fresh API call to check current membership status
- **AND** caches the new result with standard TTL

#### Scenario: Invalidate on channel leave event
- **WHEN** ChatMemberHandler detects a user leaving the channel
- **THEN** the system deletes cache entry for that user-channel pair
- **AND** subsequent verification attempts will query API (preventing stale cache)

### Requirement: Cache Metrics
The system SHALL track cache hit/miss rates to monitor effectiveness and guide TTL optimization.

#### Scenario: Record cache hit
- **WHEN** a verification request finds a cached entry
- **THEN** the system increments Prometheus counter: `bot_cache_hits_total`
- **AND** logs: "Cache hit for user={user_id}, channel={channel_id}"

#### Scenario: Record cache miss
- **WHEN** a verification request does not find a cached entry
- **THEN** the system increments Prometheus counter: `bot_cache_misses_total`
- **AND** performs API call and caches result

#### Scenario: Calculate hit rate
- **WHEN** monitoring cache performance
- **THEN** the system exposes metric: `cache_hit_rate = hits / (hits + misses)`
- **AND** target hit rate is >70% for normal operation
- **AND** alerts trigger if hit rate drops below 50% (indicates cache issues or high churn)

### Requirement: Multi-Instance Compatibility
The system SHALL use Redis as a shared cache across multiple bot instances for consistent verification state.

#### Scenario: Shared cache across instances
- **WHEN** multiple bot instances connect to the same Redis server
- **THEN** instance A caching a verification result makes it available to instance B
- **AND** avoids duplicate API calls across instances
- **AND** reduces overall API load

#### Scenario: Instance-local fallback
- **WHEN** Redis is unavailable and instance A verifies a user
- **THEN** instance A stores result in memory (local dict, not shared)
- **AND** instance B performs independent verification (no shared state)
- **AND** system operates correctly but with higher API usage

### Requirement: Cache Key Namespace
The system SHALL use structured cache keys to prevent collisions and enable selective invalidation.

#### Scenario: Verification cache key format
- **WHEN** storing membership verification
- **THEN** the key format is: `verify:{user_id}:{channel_id}`
- **EXAMPLE**: `verify:123456789:-1001234567890`

#### Scenario: Future cache namespaces
- **WHEN** additional caching needs arise (e.g., user permissions, group settings)
- **THEN** new namespaces are used: `perm:{user_id}:{group_id}`, `group_config:{group_id}`
- **AND** allows bulk invalidation: `DEL group_config:*` (if needed)

### Requirement: Data Serialization
The system SHALL use simple string serialization for cache values to minimize overhead.

#### Scenario: Store boolean as string
- **WHEN** caching verification result (boolean: True/False)
- **THEN** the system stores as string: "1" for True, "0" for False
- **AND** retrieves with `GET` command (no deserialization overhead)
- **AND** converts to boolean in application logic

#### Scenario: Store complex data (if needed)
- **WHEN** caching structured data (e.g., user permissions object)
- **THEN** the system serializes to JSON string before storing
- **AND** deserializes on retrieval
- **AND** monitors serialization overhead (should be <1ms)

### Requirement: Cache Timeout Configuration
The system SHALL make cache TTL values configurable via environment variables for tuning without code changes.

#### Scenario: Default TTL values
- **WHEN** no environment variables are set
- **THEN** the system uses defaults: `CACHE_POSITIVE_TTL=600`, `CACHE_NEGATIVE_TTL=60`, `CACHE_JITTER_PERCENT=15`

#### Scenario: Custom TTL configuration
- **WHEN** environment variables are set: `CACHE_POSITIVE_TTL=1200`, `CACHE_NEGATIVE_TTL=30`
- **THEN** the system uses configured values for caching
- **AND** logs: "Using custom cache TTLs: positive=1200s, negative=30s"

### Requirement: Health Check Integration
The system SHALL include Redis connectivity in health check endpoint status reporting.

#### Scenario: Healthy Redis
- **WHEN** `/health` endpoint is called and Redis is connected
- **THEN** response includes: `{"checks": {"redis": {"status": "healthy", "latency_ms": 2}}}`

#### Scenario: Degraded Redis
- **WHEN** `/health` endpoint is called and Redis is unavailable
- **THEN** response includes: `{"checks": {"redis": {"status": "unavailable", "mode": "degraded"}}}`
- **AND** overall health status is "degraded" (not "unhealthy")
- **AND** bot continues operating (caching disabled, but functional)
