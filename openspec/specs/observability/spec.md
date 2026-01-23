# observability Specification

## Purpose
TBD - created by archiving change transform-to-production-saas. Update Purpose after archive.
## Requirements
### Requirement: Prometheus Metrics Exposure
The system SHALL expose Prometheus-format metrics via HTTP endpoint for scraping by monitoring systems.

#### Scenario: Metrics endpoint availability
- **WHEN** a monitoring service requests `GET /metrics`
- **THEN**the system returns text/plain response in Prometheus format
- **AND** includes all registered metrics (counters, histograms, gauges)
- **AND** response completes in <50ms

#### Scenario: Metrics during bot startup
- **WHEN** the bot starts
- **THEN** metrics endpoint is available before handler registration
- **AND** returns empty or zero-value metrics (no scrape errors)

### Requirement: Verification Metrics
The system SHALL track membership verification attempts, outcomes, and latency.

#### Scenario: Count verification outcomes
- **WHEN** a user verification completes
- **THEN** the system increments `bot_verifications_total{status="verified|restricted|error"}`
- **EXAMPLE**: After verifying 100 users (80 passed, 20 failed), counters show:
  - `bot_verifications_total{status="verified"} 80`
  - `bot_verifications_total{status="restricted"} 20`

#### Scenario: Measure verification latency
- **WHEN** a verification request completes
- **THEN** the system records duration in `bot_verification_latency_seconds` histogram
- **AND** histogram buckets: [0.01, 0.05, 0.1, 0.5, 1.0, 2.0]
- **AND** enables percentile queries: p50, p95, p99

### Requirement: API Call Metrics
The system SHALL track all Telegram API calls by method and outcome for debugging and quota monitoring.

#### Scenario: Count API calls by method
- **WHEN** the bot calls Telegram API (e.g., getChatMember, restrictChatMember, sendMessage)
- **THEN** the system increments `bot_api_calls_total{method="getChatMember", status="success|error"}`
- **AND** allows monitoring of most-used API methods

#### Scenario: Track API errors
- **WHEN** a Telegram API call fails
- **THEN** the system increments `bot_api_errors_total{method="getChatMember", error_type="timeout|rate_limit|permission_denied"}`
- **AND** categorizes errors by type for targeted debugging

### Requirement: Cache Metrics
The system SHALL track cache hit/miss rates and query effectiveness.

#### Scenario: Record cache hits
- **WHEN** a verification finds cached membership status
- **THEN** the system increments `bot_cache_hits_total`

#### Scenario: Record cache misses
- **WHEN** a verification requires fresh API call (cache miss)
- **THEN** the system increments `bot_cache_misses_total`

#### Scenario: Calculate cache hit rate
- **WHEN** analyzing cache effectiveness
- **THEN** hit_rate = `bot_cache_hits_total / (bot_cache_hits_total + bot_cache_misses_total)`
- **AND** target: >70% hit rate
- **AND** alert if <50% (indicates cache issues or high churn)

### Requirement: Database Metrics
The system SHALL track database query performance to identify slow queries and connection pool issues.

#### Scenario: Measure query duration
- **WHEN** a database query executes
- **THEN** the system records duration in `db_query_duration_seconds{operation="get_group_channels"}` histogram
- **AND** enables identification of slow queries (p95 >50ms triggers investigation)

#### Scenario: Monitor connection pool
- **WHEN** monitoring database health
- **THEN** the system exposes `db_connection_pool_size` gauge (current active connections)
- **AND** `db_connection_pool_available` gauge (available connections)
- **AND** alerts if available connections drop to 0 (pool exhaustion)

### Requirement: Active Groups Gauge
The system SHALL track the number of protected groups to monitor bot adoption and capacity.

#### Scenario: Update active groups count
- **WHEN** a new group runs `/protect`
- **THEN** the system increments `bot_active_groups` gauge
- **WHEN** a group runs `/unprotect`
- **THEN** the system decrements `bot_active_groups` gauge

#### Scenario: On-demand recalculation
- **WHEN** the bot restarts
- **THEN** the system queries database: `SELECT COUNT(*) FROM protected_groups WHERE enabled = TRUE`
- **AND** sets `bot_active_groups` to the current count

### Requirement: Rate Limit Metrics
The system SHALL track rate limit delays and queue sizes to monitor API quota usage.

#### Scenario: Record rate limit delays
- **WHEN** a message is delayed due to rate limiting
- **THEN** the system increments `bot_rate_limit_delays_total`

#### Scenario: Measure queue size
- **WHEN** rate limiter queue builds up
- **THEN** the system updates `bot_rate_limit_queue_size` gauge
- **AND** alerts if queue exceeds 500 for >5 minutes (backlog warning)

### Requirement: Structured Logging
The system SHALL use structured logging (JSON format) with contextual fields for effective log aggregation and search.

#### Scenario: Log with context
- **WHEN** an event occurs (e.g., user verification, protection setup)
- **THEN** the system logs with structured fields:
  ```json
  {
    "timestamp": "2026-01-23T23:30:00Z",
    "level": "INFO",
    "logger": "bot.handlers.verify",
    "message": "User verified successfully",
    "user_id": 123456789,
    "group_id": -1001234567890,
    "channel_id": -1009876543210,
    "latency_ms": 45
  }
  ```

#### Scenario: Log levels
- **WHEN** logging events
- **THEN** the system uses appropriate levels:
  - **DEBUG**: Detailed flow (disabled in production)
  - **INFO**: Normal operations (user verified, command executed)
  - **WARNING**: Degraded state (Redis unavailable, cache disabled)
  - **ERROR**: Failures requiring attention (API error, database timeout)
  - **CRITICAL**: System-wide failures (cannot start, database unreachable)

### Requirement: Sentry Error Tracking
The system SHALL integrate Sentry for automatic error capture, alerting, and debugging.

#### Scenario: Initialize Sentry
- **WHEN** the bot starts and `SENTRY_DSN` environment variable is set
- **THEN** the system initializes Sentry SDK
- **AND** sets environment tag: `development` or `production`
- **AND** configures integrations: logging, sqlalchemy, redis

#### Scenario: Automatic error capture
- **WHEN** an unhandled exception occurs
- **THEN** Sentry captures the error with:
  - Full stack trace
  - Request context (user_id, group_id, command)
  - Breadcrumbs (recent log messages)
  - Environment (Python version, OS, bot version)

#### Scenario: Error context enrichment
- **WHEN** an error occurs during verification
- **THEN** Sentry includes custom context:
  ```python
  sentry_sdk.set_context("verification", {
      "user_id": user_id,
      "channel_id": channel_id,
      "cache_hit": False
  })
  ```
- **AND** enables filtering errors by user/group in Sentry dashboard

#### Scenario: Sentry optional
- **WHEN** `SENTRY_DSN` is not configured
- **THEN** the system logs errors locally only
- **AND** continues operating normally (Sentry is optional enhancement)

### Requirement: Health Check Endpoint
The system SHALL provide a health check endpoint for load balancers and uptime monitors.

#### Scenario: Healthy status
- **WHEN** `GET /health` is requested and all dependencies are available
- **THEN** the system returns HTTP 200 with:
  ```json
  {
    "status": "healthy",
    "uptime_seconds": 3600,
    "checks": {
      "database": {"status": "healthy", "latency_ms": 5},
      "redis": {"status": "healthy", "latency_ms": 2}
    }
  }
  ```

#### Scenario: Degraded status
- **WHEN** `GET /health` is requested and Redis is unavailable (but database is healthy)
- **THEN** the system returns HTTP 200 with:
  ```json
  {
    "status": "degraded",
    "uptime_seconds": 3600,
    "checks": {
      "database": {"status": "healthy", "latency_ms": 5},
      "redis": {"status": "unavailable", "mode": "degraded"}
    }
  }
  ```

#### Scenario: Unhealthy status
- **WHEN** `GET /health` is requested and database is unavailable
- **THEN** the system returns HTTP 503 with:
  ```json
  {
    "status": "unhealthy",
    "uptime_seconds": 3600,
    "checks": {
      "database": {"status": "unavailable", "error": "connection timeout"},
      "redis": {"status": "healthy", "latency_ms": 2}
    }
  }
  ```

### Requirement: Log Retention and Rotation
The system SHALL configure log rotation to prevent disk space exhaustion.

#### Scenario: File-based logging rotation
- **WHEN** logs are written to files
- **THEN** the system uses rotating file handler:
  - Max size: 50 MB per file
  - Keep 5 backup files (total 250 MB)
  - Compression: gzip old logs

#### Scenario: Stdout logging (containerized)
- **WHEN** running in Docker (production)
- **THEN** the system logs to stdout/stderr (JSON format)
- **AND** relies on external log aggregation (e.g., Loki, CloudWatch)
- **AND** no local file rotation needed

### Requirement: Alerting Rules Documentation
The system SHALL document recommended alerting rules for production monitoring.

#### Scenario: High error rate alert
- **WHEN** `rate(bot_api_errors_total[5m]) > 0.01` (>1% error rate)
- **THEN** alert fires: "High API Error Rate"
- **AND** recommended action: Check Sentry for error details

#### Scenario: High latency alert
- **WHEN** `histogram_quantile(0.95, bot_verification_latency_seconds) > 0.5` (p95 >500ms)
- **THEN** alert fires: "High Verification Latency"
- **AND** recommended action: Check database and cache performance

#### Scenario: Database down alert
- **WHEN** `/health` endpoint returns 503 for >2 minutes
- **THEN** alert fires: "Database Unavailable"
- **AND** recommended action: Restart database, check connection pool

#### Scenario: Low cache hit rate alert
- **WHEN** cache hit rate <50% for >15 minutes
- **THEN** alert fires: "Low Cache Hit Rate"
- **AND** recommended action: Check Redis status, review TTL configuration

### Requirement: Performance Benchmarking
The system SHALL include benchmark utilities to measure and validate performance targets.

#### Scenario: Benchmark database queries
- **WHEN** running benchmark suite
- **THEN** measure and report:
  - `get_protected_group()`: target <10ms
  - `get_group_channels()`: target <50ms
  - Full JOIN query: target <50ms

#### Scenario: Benchmark cache operations
- **WHEN** running benchmark suite
- **THEN** measure and report:
  - Redis GET: target <5ms
  - Redis SET: target <5ms
  - Cache hit verification: target <10ms

#### Scenario: Benchmark end-to-end verification
- **WHEN** running benchmark suite
- **THEN** measure and report:
  - Verification with cache hit: target <10ms
  - Verification with cache miss: target <100ms
  - Full message handling: target <200ms

### Requirement: Uptime Tracking
The system SHALL track bot uptime and restart events.

#### Scenario: Record startup time
- **WHEN** the bot starts
- **THEN** the system records startup timestamp
- **AND** exposes `bot_start_time_seconds` metric (Unix timestamp)
- **AND** allows calculation of uptime: `time() - bot_start_time_seconds`

#### Scenario: Track restarts
- **WHEN** the bot restarts
- **THEN** the system increments `bot_restarts_total` counter
- **AND** logs restart reason (manual, crash, deployment)

