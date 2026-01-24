# Alerting Rules for Nezuko

This document defines Prometheus alerting rules for monitoring Nezuko in production.
These rules can be deployed to Prometheus/Alertmanager for automated alerting.

---

## Prometheus Alert Rules

Save this as `nezuko_alerts.yml` in your Prometheus rules directory.

```yaml
groups:
  - name: nezuko_alerts
    interval: 30s
    rules:
      # ============================================
      # Critical Alerts (Immediate attention required)
      # ============================================
      
      - alert: NezukoDatabaseDown
        expr: bot_db_connected == 0
        for: 1m
        labels:
          severity: critical
          service: nezuko
        annotations:
          summary: "Nezuko database connection lost"
          description: "Database connection has been down for more than 1 minute. Bot cannot function without database."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-Database-Down"
      
      - alert: NezukoHighErrorRate
        expr: |
          (
            rate(bot_errors_total[5m]) / 
            (rate(bot_verifications_total[5m]) + 0.001)
          ) > 0.01
        for: 5m
        labels:
          severity: critical
          service: nezuko
        annotations:
          summary: "Nezuko error rate exceeds 1%"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-High-Error-Rate"

      # ============================================
      # Warning Alerts (Investigate soon)
      # ============================================
      
      - alert: NezukoHighLatency
        expr: histogram_quantile(0.95, rate(bot_verification_latency_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
          service: nezuko
        annotations:
          summary: "Nezuko verification latency exceeds 500ms (p95)"
          description: "P95 verification latency is {{ $value | humanizeDuration }}. Target is <100ms."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-High-Latency"
      
      - alert: NezukoRedisDown
        expr: bot_redis_connected == 0
        for: 5m
        labels:
          severity: warning
          service: nezuko
        annotations:
          summary: "Nezuko Redis connection lost (degraded mode)"
          description: "Redis has been unavailable for 5 minutes. Bot is running in degraded mode with direct API calls."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-Redis-Down"
      
      - alert: NezukoLowCacheHitRate
        expr: |
          (
            rate(bot_cache_hits_total[15m]) /
            (rate(bot_cache_hits_total[15m]) + rate(bot_cache_misses_total[15m]) + 0.001)
          ) < 0.50
        for: 15m
        labels:
          severity: warning
          service: nezuko
        annotations:
          summary: "Nezuko cache hit rate below 50%"
          description: "Cache hit rate is {{ $value | humanizePercentage }}. Expected >70%."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-Low-Cache-Hit-Rate"
      
      - alert: NezukoHighRateLimitDelays
        expr: rate(bot_rate_limit_delays_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          service: nezuko
        annotations:
          summary: "Nezuko hitting Telegram rate limits"
          description: "Rate limit delays occurring at {{ $value }} per second. May impact user experience."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-Rate-Limits"
      
      - alert: NezukoSlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
          service: nezuko
        annotations:
          summary: "Nezuko database queries slow (p95 > 50ms)"
          description: "P95 database query duration is {{ $value | humanizeDuration }}. Target is <50ms."
          runbook_url: "https://github.com/your-org/nezuko/wiki/Runbook-Slow-Queries"

      # ============================================
      # Informational Alerts (For awareness)
      # ============================================
      
      - alert: NezukoNoActiveGroups
        expr: bot_active_groups == 0
        for: 1h
        labels:
          severity: info
          service: nezuko
        annotations:
          summary: "Nezuko has no active protected groups"
          description: "No groups are currently protected. This may be expected if bot was just deployed."

      - alert: NezukoLowThroughput
        expr: rate(bot_verifications_total[5m]) < 0.01
        for: 30m
        labels:
          severity: info
          service: nezuko
        annotations:
          summary: "Nezuko low verification throughput"
          description: "Less than 1 verification per 100 seconds. May indicate low usage or connectivity issues."
```

---

## Alert Thresholds Summary

| Alert | Condition | Duration | Severity | Action |
|-------|-----------|----------|----------|--------|
| DatabaseDown | `bot_db_connected == 0` | 1m | Critical | Restart DB, check credentials |
| HighErrorRate | Error rate > 1% | 5m | Critical | Check logs, Sentry |
| HighLatency | p95 > 500ms | 5m | Warning | Check DB, Redis, load |
| RedisDown | `bot_redis_connected == 0` | 5m | Warning | Restart Redis (bot still works) |
| LowCacheHitRate | Hit rate < 50% | 15m | Warning | Check Redis, TTL settings |
| HighRateLimitDelays | > 0.1/sec | 5m | Warning | Reduce bot activity |
| SlowDatabaseQueries | p95 > 50ms | 5m | Warning | Check indexes, connection pool |
| NoActiveGroups | 0 groups | 1h | Info | Configure groups |
| LowThroughput | < 0.01 verif/sec | 30m | Info | Check connectivity |

---

## Escalation Procedures

### Critical Alerts

1. **Acknowledge** the alert in Alertmanager/PagerDuty
2. **Check** Sentry for error details
3. **Review** structured logs (`bot.log`) for context
4. **Restart** affected service if necessary
5. **Document** incident in post-mortem

### Warning Alerts

1. **Investigate** within 30 minutes
2. **Check** metrics dashboard for trends
3. **Identify** root cause (load, configuration, external factors)
4. **Plan** remediation if pattern persists

### Info Alerts

1. **Review** during next business day
2. **Determine** if action needed
3. **Consider** adjusting thresholds if too noisy

---

## Notification Channels

Configure in Alertmanager:

```yaml
receivers:
  - name: 'nezuko-critical'
    pagerduty_configs:
      - service_key: '<YOUR_PAGERDUTY_KEY>'
    
  - name: 'nezuko-warnings'
    slack_configs:
      - api_url: '<YOUR_SLACK_WEBHOOK>'
        channel: '#nezuko-alerts'
        send_resolved: true
    
  - name: 'nezuko-info'
    email_configs:
      - to: 'team@example.com'
        send_resolved: true

route:
  receiver: 'nezuko-info'
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'nezuko-critical'
      repeat_interval: 1h
    - match:
        severity: warning
      receiver: 'nezuko-warnings'
      repeat_interval: 2h
```

---

## Dashboard Recommendations

For Grafana, create panels for:

1. **Verification Rate** - `rate(bot_verifications_total[5m])`
2. **Latency Heatmap** - `bot_verification_latency_seconds_bucket`
3. **Cache Hit Rate** - `rate(bot_cache_hits_total[5m]) / (rate(bot_cache_hits_total[5m]) + rate(bot_cache_misses_total[5m]))`
4. **Error Rate** - `rate(bot_errors_total[5m])`
5. **Active Groups** - `bot_active_groups`
6. **API Calls by Method** - `rate(bot_api_calls_total[5m]) by (method)`
7. **Database Latency** - `histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))`

---

## Health Check Integration

For external monitoring (UptimeRobot, Pingdom, etc.):

- **Endpoint**: `http://your-bot:8000/health`
- **Expected**: HTTP 200 with `{"status": "healthy"}`
- **Degraded**: HTTP 200 with `{"status": "degraded"}` (Redis down)
- **Unhealthy**: HTTP 503 with `{"status": "unhealthy"}` (DB down)
- **Check Interval**: 30 seconds
- **Alert After**: 3 consecutive failures
