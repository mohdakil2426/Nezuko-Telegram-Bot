# rate-limiting Specification

## Purpose  
Provides intelligent rate limiting for Telegram API calls to prevent hitting rate limits (30 messages/second) while prioritizing user-facing interactions.

## ADDED Requirements

### Requirement: AIORateLimiter Integration
The system SHALL use telegram-ext-rate-limiter library to automatically manage API request rates and prevent Telegram rate limit violations.

#### Scenario: Rate limiter initialization
- **WHEN** the bot application starts
- **THEN** the system creates AIORateLimiter with:
  - `overall_max_rate=25` (5msg/sec buffer below Telegram's 30/sec limit)
  - `overall_time_period=1.0` (per second)
  - `group_max_rate=20` (per-chat rate limit)
  - `group_time_period=60.0` (per minute per chat)
  - `max_retries=3` (automatic retry on rate limit)

#### Scenario: Rate limit enforcement
- **WHEN** the bot sends >25 messages in 1 second
- **THEN** the rate limiter queues additional messages
- **AND** releases them at controlled rate (25/sec max)
- **AND** prevents `429 Too Many Requests` errors from Telegram

### Requirement: Priority Queue System
The system SHALL implement a priority queue to ensure user interactions are never delayed by bulk operations.

#### Scenario: P0 priority (immediate) - User interactions
- **WHEN** a user clicks "I have joined" verify button OR sends a command (/status, /help)
- **THEN** the verification API call OR command response is tagged P0
- **AND** executes immediately (bypasses queue if possible)
- **AND** target latency: <100ms

#### Scenario: P1 priority (high) - Join/leave events
- **WHEN** a user joins the group OR leaves the channel
- **THEN** the membership check and restriction API calls are tagged P1
- **AND** processes within 500ms
- **AND** queued behind P0 only

#### Scenario: P2 priority (low) - Bulk operations
- **WHEN** batch verification runs OR broadcast messages sent
- **THEN** operations are tagged P2
- **AND** throttled to 5 messages/second
- **AND** queued behind P0 and P1

### Requirement: Automatic Retry Logic
The system SHALL automatically retry failed API calls with exponential backoff to handle transient network errors.

#### Scenario: Transient failure retry
- **WHEN** a Telegram API call fails with network error (e.g., timeout, connection reset)
- **THEN** the rate limiter retries after 1 second (first retry)
- **AND** if still failing, retries after 2 seconds (second retry)
- **AND** if still failing, retries after 4 seconds (third retry)
- **AND** if all retries exhausted, logs error and raises exception

#### Scenario: Rate limit retry (429 error)
- **WHEN** Telegram responds with 429 Too Many Requests
- **THEN** the rate limiter waits for duration specified in `Retry-After` header
- **AND** retries the request automatically
- **AND** increments `bot_rate_limit_delays_total` metric

#### Scenario: Permanent failure
- **WHEN** a Telegram API call fails with 4xx error (e.g., 403 Forbidden, 400 Bad Request)
- **THEN** the rate limiter does NOT retry (permanent error)
- **AND** immediately raises exception to caller
- **AND** logs error with full context

### Requirement: Per-Chat Rate Limiting
The system SHALL enforce per-chat rate limits to prevent spamming individual groups while allowing high global throughput.

#### Scenario: Per-chat limit enforcement
- **WHEN** the bot sends >20 messages to a single chat within 60 seconds
- **THEN** additional messages to that chat are queued
- **AND** released at 20/min rate (prevents chat flood)
- **AND** messages to other chats continue at full rate (fair distribution)

#### Scenario: Multiple groups served fairly
- **WHEN** bot is active in 10 groups simultaneously
- **THEN** each group can receive up to 20 messages/min
- **AND** global rate stays below 25 messages/sec total
- **AND** no single group monopolizes bot capacity

### Requirement: Rate Limit Metrics
The system SHALL track rate limiting behavior via Prometheus metrics for monitoring and optimization.

#### Scenario: Record rate limit delay
- **WHEN** a message is queued due to rate limiting
- **THEN** the system increments `bot_rate_limit_delays_total` counter
- **AND** records delay duration in `bot_rate_limit_delay_seconds` histogram

#### Scenario: Monitor API errors
- **WHEN** a Telegram API call fails (after all retries)
- **THEN** the system increments `bot_api_errors_total{method="getChatMember", error_type="timeout"}`
- **AND** logs error details for debugging

#### Scenario: Track throughput
- **WHEN** monitoring overall bot performance
- **THEN** the system exposes `bot_api_calls_total{method="getChatMember|restrictChatMember|sendMessage|..."}`
- **AND** allows calculation of requests/second rate
- **AND** alerts if sustained rate approaches 25/sec (near limit)

### Requirement: Graceful Degradation Under Load
The system SHALL prioritize critical operations and gracefully degrade non-essential features when approaching rate limits.

#### Scenario: High load prioritization
- **WHEN** global rate approaches 25 messages/second
- **THEN** the system continues processing P0 (user interactions) and P1 (enforcement) requests
- **AND** pauses P2 (bulk operations) until rate drops
- **AND** logs: "High load detected, pausing bulk operations"

#### Scenario: Emergency mode
- **WHEN** sustained rate limit violations occur (multiple 429 errors)
- **THEN** the system temporarily reduces overall_max_rate to 20/sec (more conservative)
- **AND** logs: "Emergency rate limit mode activated"
- **AND** auto-restores after 5 minutes of stable operation

### Requirement: Queue Size Monitoring
The system SHALL monitor rate limiter queue size to detect and alert on backlog buildups.

#### Scenario: Normal queue size
- **WHEN** rate limiter queue has <100 pending requests
- **THEN** operations continue normally
- **AND** no alerts triggered

#### Scenario: High queue size
- **WHEN** rate limiter queue exceeds 500 pending requests
- **THEN** the system logs warning: "Rate limiter queue backlog: 500 requests"
- **AND** increments `bot_rate_limit_queue_size` gauge
- **AND** triggers alert if sustained >5 minutes

#### Scenario: Queue overflow
- **WHEN** rate limiter queue exceeds 2000 pending requests
- **THEN** the system rejects new P2 (low priority) requests with error
- **AND** continues accepting P0/P1 requests only
- **AND** logs critical error: "Rate limiter queue overflow, dropping low-priority requests"

### Requirement: Configurable Rate Limits
The system SHALL allow rate limit configuration via environment variables for tuning without code changes.

#### Scenario: Default configuration
- **WHEN** no environment variables are set
- **THEN** the system uses defaults: `RATE_LIMIT_GLOBAL=25`, `RATE_LIMIT_PER_CHAT=20`, `RATE_LIMIT_RETRIES=3`

#### Scenario: Custom configuration
- **WHEN** administrator sets `RATE_LIMIT_GLOBAL=20` (more conservative)
- **THEN** the bot applies 20msg/sec global limit
- **AND** logs: "Using custom rate limit: 20 msg/sec"

### Requirement: Rate Limit Testing
The system SHALL provide utilities for testing rate limit behavior without hitting Telegram's actual limits.

#### Scenario: Mock rate limiter for tests
- **WHEN** running unit tests
- **THEN** tests use a mock rate limiter (no actual delays)
- **AND** verify rate limit logic without waiting for timers

#### Scenario: Load test with rate limiter
- **WHEN** running load tests
- **THEN** rate limiter throttles requests realistically
- **AND** validates that bot can sustain 25 msg/sec throughput
- **AND** measures queue latency under load
