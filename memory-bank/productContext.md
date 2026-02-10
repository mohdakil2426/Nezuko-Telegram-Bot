# Product Context: Nezuko Platform

## Problem Statement

Telegram community managers face critical challenges:

1. **Manual Verification**: Impossible to check thousands of members for channel subscriptions
2. **Spam Prevention**: Unverified users flood groups with spam
3. **Growth Bottleneck**: No automated way to convert group members to channel subscribers
4. **Operational Blindness**: No visibility into verification rates or user behavior

---

## Solution

Nezuko acts as an **automated gatekeeper** that:

1. **Instant Restriction**: Mutes new members immediately on join
2. **Verification Flow**: Shows inline buttons to join required channels
3. **Automatic Unmute**: Restores permissions when user verifies (<100ms)
4. **Analytics Dashboard**: Real-time visibility into all verification activity

---

## User Experience

### For Group Members
1. Join group → Immediately muted
2. See message with "Join Channel" buttons
3. Join required channel(s)
4. Click "Verify" button
5. Instantly unmuted and can chat

### For Administrators
1. Add bot to group with admin rights
2. Run `/protect @channelname` command
3. Bot automatically enforces membership
4. View analytics in web dashboard

---

## Dashboard Features

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview stats, verification chart, activity feed |
| **Analytics** | Verification trends, growth metrics, performance |
| **Groups** | Manage protected groups, view settings |
| **Channels** | Manage enforced channels, link to groups |
| **Bots** | Add/manage multiple bot instances |
| **Logs** | Real-time log streaming with filters |
| **Settings** | Theme, account info, preferences |

---

## Authentication

**Telegram Login Widget** (Owner-Only):
- No external accounts needed
- HMAC-SHA256 signature verification
- Session-based with HTTP-only cookies
- 24-hour session expiration

---

## Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Verification Latency (p99) | <150ms | ✅ Achieved |
| API Latency (p90) | <50ms | ✅ Achieved |
| Uptime | 99.9% | ✅ On Track |
| Dashboard Pages | 13 | ✅ Complete |

---

_Last Updated: 2026-02-07_
