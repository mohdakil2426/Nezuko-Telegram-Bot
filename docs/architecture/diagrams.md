# 📊 Architecture Diagrams

> **Visual representations of Nezuko's system architecture**

This document contains all the Mermaid diagrams used throughout the documentation, organized by category.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Database Schema](#database-schema)
4. [Component Architecture](#component-architecture)
5. [Deployment Architecture](#deployment-architecture)
6. [Authentication Flow](#authentication-flow)

---

## System Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        TELEGRAM["📱 Telegram Users"]
        BROWSER["🌐 Admin Dashboard"]
    end

    subgraph "Application Layer"
        BOT["🤖 Bot Engine<br/>(Python)"]
        API["⚡ REST API<br/>(FastAPI)"]
        WEB["🖥️ Web App<br/>(Next.js)"]
    end

    subgraph "Data Layer"
        PG[("🐘 PostgreSQL<br/>(Supabase)")]
        REDIS[("⚡ Redis<br/>Cache")]
    end

    subgraph "External Services"
        TG_API["Telegram API"]
        SUPA["Supabase Auth"]
        SENTRY["Sentry"]
    end

    TELEGRAM --> TG_API --> BOT
    BROWSER --> WEB --> API
    
    BOT --> PG
    BOT --> REDIS
    BOT --> SENTRY
    
    API --> PG
    API --> REDIS
    API --> SUPA
    API --> SENTRY
    
    WEB --> SUPA

    style BOT fill:#3b82f6,color:#fff
    style API fill:#10b981,color:#fff
    style WEB fill:#8b5cf6,color:#fff
    style PG fill:#0ea5e9,color:#fff
    style REDIS fill:#ef4444,color:#fff
```

### Monorepo Structure

```mermaid
graph LR
    subgraph "nezuko-monorepo"
        direction TB
        
        subgraph "apps/"
            WEB["📱 web<br/>Next.js 16"]
            API["⚙️ api<br/>FastAPI"]
            BOT["🤖 bot<br/>PTB v22"]
        end
        
        subgraph "packages/"
            TYPES["📦 types<br/>Zod + TS"]
            CONFIG["📦 config<br/>ESLint/TS"]
        end
        
        subgraph "config/"
            DOCKER["🐳 docker/"]
        end
        
        subgraph "storage/"
            LOGS["📄 logs/"]
            DATA["💾 data/"]
        end
    end
    
    WEB --> TYPES
    API --> TYPES
    WEB --> CONFIG

    style WEB fill:#8b5cf6
    style API fill:#10b981
    style BOT fill:#3b82f6
```

---

## Data Flow Diagrams

### User Verification Flow

```mermaid
sequenceDiagram
    autonumber
    
    participant U as 👤 User
    participant T as 📱 Telegram
    participant B as 🤖 Bot
    participant C as ⚡ Cache
    participant D as 🗄️ Database

    Note over U,D: Phase 1: User Joins Protected Group
    
    U->>T: Joins Group
    T->>B: ChatMemberUpdated Event
    
    B->>D: Get Group Config
    D-->>B: Config (enabled, channels)
    
    alt Protection Enabled
        B->>T: Restrict User (Mute)
        B->>T: Send Verification Button
    else Protection Disabled
        Note over B: No action needed
    end
    
    Note over U,D: Phase 2: User Clicks Verify
    
    U->>T: Click "✅ Verify" Button
    T->>B: CallbackQuery
    
    B->>B: Validate User ID
    B->>C: Check Cache
    
    alt Cache Hit
        C-->>B: User Verified ✓
        B->>T: Unrestrict User
    else Cache Miss
        loop For Each Required Channel
            B->>T: Check Membership
            T-->>B: Member Status
        end
        
        alt All Channels Joined
            B->>T: Unrestrict User
            B->>C: Cache Verification
            B->>D: Log Verification
            B->>T: "✅ Verified!"
        else Missing Channels
            B->>T: "Join all channels first!"
        end
    end
```

### API Request Flow

```mermaid
sequenceDiagram
    autonumber
    
    participant W as 🌐 Web Dashboard
    participant P as 🔐 Proxy
    participant A as ⚡ API Server
    participant M as 🛡️ Middleware Stack
    participant S as 📊 Service Layer
    participant D as 🗄️ Database

    W->>P: GET /dashboard/groups
    P->>P: Validate Session Cookie
    P->>A: Forward Request + JWT
    
    A->>M: Request ID Middleware
    Note over M: Add X-Request-ID header
    
    M->>M: Rate Limit Check
    alt Rate Limit Exceeded
        M-->>A: 429 Too Many Requests
    end
    
    M->>M: JWT Verification
    alt Invalid Token
        M-->>A: 401 Unauthorized
    end
    
    M->>S: GroupService.get_all()
    S->>D: SELECT * FROM protected_groups
    D-->>S: Results
    
    S-->>M: Groups List
    M->>M: Audit Log Entry
    M-->>A: JSON Response
    A-->>W: { groups: [...] }
```

### WebSocket Log Streaming

```mermaid
sequenceDiagram
    participant W as 🌐 Web Client
    participant A as ⚡ API Server
    participant WS as 📡 WebSocket Manager
    participant L as 📝 Logger
    participant B as 🤖 Bot

    W->>A: ws://api/ws/logs?token=xxx
    A->>A: Validate JWT Token
    A->>WS: Register Connection
    WS-->>W: Connection Accepted
    
    loop Real-time Logs
        B->>L: Log Event (verification, error, etc)
        L->>WS: Broadcast to Clients
        WS-->>W: { type: "log", data: {...} }
    end
    
    loop Heartbeat (30s)
        WS-->>W: { type: "heartbeat" }
    end
    
    W->>WS: { action: "filter", level: "ERROR" }
    WS-->>W: { type: "filter_updated" }
    
    W->>A: Disconnect
    WS->>WS: Cleanup Connection
```

---

## Database Schema

### Bot Database ERD

```mermaid
erDiagram
    OWNERS ||--o{ PROTECTED_GROUPS : "manages"
    PROTECTED_GROUPS ||--o{ GROUP_CHANNEL_LINKS : "requires"
    ENFORCED_CHANNELS ||--o{ GROUP_CHANNEL_LINKS : "enforced_in"

    OWNERS {
        bigint user_id PK "Telegram user ID"
        varchar(255) username "Optional @username"
        timestamp created_at "Record creation"
        timestamp updated_at "Last modification"
    }

    PROTECTED_GROUPS {
        bigint group_id PK "Telegram group ID"
        bigint owner_id FK "References owners.user_id"
        varchar(255) title "Group display name"
        boolean enabled "Protection active"
        jsonb params "Custom configuration"
        timestamp created_at "Record creation"
        timestamp updated_at "Last modification"
    }

    ENFORCED_CHANNELS {
        bigint channel_id PK "Telegram channel ID"
        varchar(255) title "Channel display name"
        varchar(255) username "Optional @username"
        text invite_link "Join link"
        timestamp created_at "Record creation"
        timestamp updated_at "Last modification"
    }

    GROUP_CHANNEL_LINKS {
        serial id PK "Auto-increment ID"
        bigint group_id FK "References protected_groups"
        bigint channel_id FK "References enforced_channels"
        timestamp created_at "Link creation time"
    }
```

### Admin Database ERD

```mermaid
erDiagram
    ADMIN_USERS ||--o{ ADMIN_SESSIONS : "has"
    ADMIN_USERS ||--o{ ADMIN_AUDIT_LOGS : "performs"

    ADMIN_USERS {
        uuid id PK "Supabase Auth ID"
        varchar(255) email UK "Unique email"
        varchar(50) role "admin or superadmin"
        timestamp created_at "Account creation"
        timestamp last_login "Last login time"
    }

    ADMIN_SESSIONS {
        uuid id PK "Session UUID"
        uuid user_id FK "References admin_users"
        varchar(45) ip_address "Login IP"
        text user_agent "Browser info"
        timestamp created_at "Session start"
        timestamp expires_at "Session expiry"
    }

    ADMIN_AUDIT_LOGS {
        serial id PK "Log entry ID"
        uuid user_id FK "Who performed action"
        varchar(100) action "Action type"
        varchar(50) resource_type "Resource category"
        varchar(100) resource_id "Resource identifier"
        jsonb changes "Before/after values"
        varchar(45) ip_address "Request IP"
        timestamp timestamp "Action time"
    }

    VERIFICATION_LOGS {
        serial id PK "Log entry ID"
        bigint user_id "Telegram user"
        bigint group_id "Group ID"
        varchar(20) status "success or failed"
        integer latency_ms "Check duration"
        timestamp timestamp "Verification time"
    }

    ADMIN_LOGS {
        serial id PK "Log entry ID"
        varchar(20) level "DEBUG to ERROR"
        varchar(100) logger "Logger name"
        text message "Log message"
        varchar(36) trace_id "Request trace"
        jsonb extra "Additional context"
        timestamp timestamp "Log time"
    }
```

---

## Component Architecture

### Bot Handler Architecture

```mermaid
graph TB
    subgraph "Telegram Events"
        JOIN["ChatMemberUpdated<br/>User Join"]
        LEFT["ChatMemberUpdated<br/>Channel Leave"]
        MSG["Message<br/>User Message"]
        CMD["Command<br/>/protect, /status"]
        CB["CallbackQuery<br/>Button Click"]
    end

    subgraph "Handler Layer"
        JH["join.py<br/>Join Handler"]
        LH["left.py<br/>Leave Handler"]
        MH["message.py<br/>Message Filter"]
        CH["admin/*.py<br/>Command Handlers"]
        VH["verify.py<br/>Verification Handler"]
    end

    subgraph "Service Layer"
        VS["verification.py<br/>Verification Service"]
        PS["protection.py<br/>Protection Service"]
    end

    subgraph "Data Layer"
        CACHE["cache.py<br/>Redis Cache"]
        CRUD["crud.py<br/>Database CRUD"]
    end

    JOIN --> JH --> VS
    LEFT --> LH --> PS
    MSG --> MH --> VS
    CMD --> CH --> PS
    CB --> VH --> VS

    VS --> CACHE
    VS --> CRUD
    PS --> CRUD

    style JH fill:#3b82f6
    style VH fill:#10b981
    style VS fill:#f59e0b
```

### Web Component Hierarchy

```mermaid
graph TB
    subgraph "Root"
        LAYOUT["layout.tsx<br/>Providers, Theme"]
    end

    subgraph "Auth"
        LOGIN["login/page.tsx"]
    end

    subgraph "Dashboard"
        DASH_LAYOUT["dashboard/layout.tsx<br/>Sidebar, Header"]
        DASH_PAGE["dashboard/page.tsx<br/>Stats Cards"]
        
        subgraph "Features"
            GROUPS["groups/page.tsx"]
            GROUP_DETAIL["groups/[id]/page.tsx"]
            CHANNELS["channels/page.tsx"]
            ANALYTICS["analytics/page.tsx"]
            LOGS["logs/page.tsx"]
            DATABASE["database/page.tsx"]
        end
    end

    subgraph "Shared Components"
        UI["ui/*<br/>shadcn primitives"]
        LAYOUT_COMP["layout/*<br/>Sidebar, Header"]
        DATA_TABLE["data-table.tsx"]
    end

    LAYOUT --> LOGIN
    LAYOUT --> DASH_LAYOUT
    DASH_LAYOUT --> DASH_PAGE
    DASH_LAYOUT --> GROUPS
    DASH_LAYOUT --> CHANNELS
    DASH_LAYOUT --> ANALYTICS
    DASH_LAYOUT --> LOGS

    GROUPS --> DATA_TABLE
    CHANNELS --> DATA_TABLE
    DATABASE --> DATA_TABLE

    style LAYOUT fill:#8b5cf6
    style DASH_LAYOUT fill:#6366f1
```

---

## Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "Internet"
        USERS["👥 Users"]
    end

    subgraph "Edge (Cloudflare/Vercel)"
        CDN["🌐 CDN<br/>Static Assets"]
        DNS["🔗 DNS"]
    end

    subgraph "Compute Layer"
        subgraph "Web Tier"
            WEB1["📱 Web Container 1"]
            WEB2["📱 Web Container 2"]
        end
        
        subgraph "API Tier"
            API1["⚡ API Container 1"]
            API2["⚡ API Container 2"]
            API3["⚡ API Container 3"]
        end
        
        subgraph "Bot Tier"
            BOT["🤖 Bot Container"]
        end

        LB["⚖️ Load Balancer<br/>(Caddy)"]
    end

    subgraph "Data Layer (Managed)"
        SUPABASE[("🐘 Supabase<br/>PostgreSQL + Auth + RT")]
        REDIS_CLOUD[("⚡ Redis Cloud")]
    end

    subgraph "Observability"
        SENTRY["🐛 Sentry"]
        PROMETHEUS["📊 Prometheus"]
        GRAFANA["📈 Grafana"]
    end

    USERS --> DNS --> CDN
    CDN --> LB
    LB --> WEB1 & WEB2
    LB --> API1 & API2 & API3
    
    WEB1 & WEB2 --> API1
    API1 & API2 & API3 --> SUPABASE
    API1 & API2 & API3 --> REDIS_CLOUD
    
    BOT --> SUPABASE
    BOT --> REDIS_CLOUD
    
    API1 & BOT --> SENTRY
    API1 & BOT --> PROMETHEUS
    PROMETHEUS --> GRAFANA

    style LB fill:#f59e0b
    style SUPABASE fill:#10b981
    style REDIS_CLOUD fill:#ef4444
```

### Docker Compose Setup

```mermaid
graph LR
    subgraph "docker-compose.prod.yml"
        BOT["bot<br/>Python 3.13"]
        API["api<br/>FastAPI"]
        REDIS["redis<br/>Redis 7"]
        CADDY["caddy<br/>Reverse Proxy"]
    end

    subgraph "External"
        SUPABASE["Supabase<br/>PostgreSQL"]
        TELEGRAM["Telegram<br/>API"]
    end

    subgraph "Volumes"
        REDIS_DATA["redis-data"]
        CADDY_DATA["caddy-data"]
    end

    CADDY -->|":443"| API
    BOT --> REDIS
    API --> REDIS
    BOT --> SUPABASE
    API --> SUPABASE
    BOT --> TELEGRAM
    
    REDIS --- REDIS_DATA
    CADDY --- CADDY_DATA

    style BOT fill:#3b82f6
    style API fill:#10b981
    style REDIS fill:#ef4444
```

---

## Authentication Flow

### Supabase Auth with Next.js 16

```mermaid
sequenceDiagram
    autonumber
    
    participant U as 👤 User
    participant B as 🌐 Browser
    participant N as 📱 Next.js
    participant S as 🔐 Supabase Auth
    participant A as ⚡ API

    Note over U,A: Login Flow
    
    U->>B: Enter credentials
    B->>S: signInWithPassword()
    S->>S: Validate credentials
    S-->>B: JWT + Refresh Token
    B->>B: Set cookies (sb-*)
    B->>N: Redirect to /dashboard
    
    Note over U,A: Authenticated Request
    
    B->>N: GET /dashboard/groups
    N->>N: proxy.ts runs
    N->>N: Read session cookie
    N->>S: getSession()
    
    alt Valid Session
        S-->>N: Session data
        N->>A: API request + JWT
        A->>A: Verify JWT
        A-->>N: Data
        N-->>B: Render page
    else Invalid/Expired
        S-->>N: No session
        N-->>B: Redirect to /login
    end

    Note over U,A: Token Refresh (Automatic)
    
    B->>S: Session about to expire
    S->>S: Use refresh token
    S-->>B: New JWT
    B->>B: Update cookies
```

### API JWT Verification

```mermaid
graph TB
    subgraph "Request"
        REQ["Incoming Request<br/>Authorization: Bearer xxx"]
    end

    subgraph "Verification"
        EXTRACT["Extract Token"]
        DECODE["JWT Decode"]
        VERIFY["Verify Signature"]
        CHECK_EXP["Check Expiration"]
        CHECK_AUD["Check Audience"]
    end

    subgraph "Result"
        SUCCESS["✅ Authenticated<br/>Return user_id"]
        FAIL["❌ 401 Unauthorized"]
    end

    REQ --> EXTRACT
    EXTRACT --> DECODE
    DECODE -->|Valid| VERIFY
    DECODE -->|Invalid| FAIL
    VERIFY -->|Valid| CHECK_EXP
    VERIFY -->|Invalid| FAIL
    CHECK_EXP -->|Valid| CHECK_AUD
    CHECK_EXP -->|Expired| FAIL
    CHECK_AUD -->|Valid| SUCCESS
    CHECK_AUD -->|Invalid| FAIL

    style SUCCESS fill:#10b981,color:#fff
    style FAIL fill:#ef4444,color:#fff
```

---

## Usage

### Embedding in Markdown

To use these diagrams in other documentation:

1. **Copy the Mermaid code block**
2. **Paste into any Markdown file**
3. **GitHub/GitLab/VSCode** will render automatically

### Generating Images

For platforms that don't support Mermaid:

```bash
# Using mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generate PNG
mmdc -i diagrams.md -o diagram.png -t dark

# Generate SVG
mmdc -i diagrams.md -o diagram.svg
```

### Live Editor

Edit diagrams interactively at:
- [Mermaid Live Editor](https://mermaid.live/)

---

*These diagrams are maintained in sync with the codebase.*
