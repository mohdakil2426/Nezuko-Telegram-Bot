# Nezuko Platform — Deployment Guide

> **Last Updated:** 2026-03-15
> **Status:** Production-ready
> **Architecture:** `apps/web` → Vercel · `apps/grammy` → DigitalOcean Droplet · BaaS → InsForge

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites & Accounts](#2-prerequisites--accounts)
3. [GitHub Secrets Reference](#3-github-secrets-reference)
4. [Vercel — Web Dashboard Setup](#4-vercel--web-dashboard-setup)
5. [DigitalOcean — Bot Setup](#5-digitalocean--bot-setup)
6. [CI/CD Workflows Reference](#6-cicd-workflows-reference)
7. [First Deploy Sequence](#7-first-deploy-sequence)
8. [Rollback Procedures](#8-rollback-procedures)
9. [Ongoing Operations](#9-ongoing-operations)
10. [Edge Cases & Troubleshooting](#10-edge-cases--troubleshooting)
11. [Security Checklist](#11-security-checklist)
12. [Post-Deploy Migration Gates](#12-post-deploy-migration-gates)

---

## 1. Overview

```text
GitHub (push to main)
  │
  ├─── web-ci.yml ─────────────────────────────────────────────────────────►
  │    Quality gates (type-check · lint · prettier · knip · build)
  │    Vercel GitHub App auto-deploys independently (always runs on push)
  │    Add "Web Dashboard CI / quality" as a required status check
  │    to gate PRs on quality before merge.
  │
  └─── grammy-ci.yml ──────────────────────────────────────────────────────►
         Quality gates + build artifact upload
           │
           └─ grammy-deploy.yml (triggered by grammy-ci success on main) ──►
                SSH to DigitalOcean Droplet
                  rsync dist/ → /opt/nezuko/grammy/dist/
                  bun install --production
                  systemctl restart nezuko-grammy
                  Health check: GET http://127.0.0.1:8080/health
                  Automatic rollback if health check fails
```

---

## 2. Prerequisites & Accounts

| Requirement              | Notes                                                     |
| ------------------------ | --------------------------------------------------------- |
| **GitHub repo**          | Actions enabled, Admin or Write access                    |
| **Vercel account**       | Connect to GitHub at vercel.com/new                       |
| **DigitalOcean account** | Create a Droplet (Ubuntu 24.04 LTS, 1–2 GB RAM)           |
| **InsForge project**     | Active with known `BASE_URL` + `ANON_KEY` + `SERVICE_KEY` |
| **Domain (optional)**    | For custom Vercel URL and health subdomain                |

---

## 3. GitHub Secrets Reference

### Repository Secrets

Go to: `GitHub repo → Settings → Secrets and variables → Actions → New repository secret`

#### Web (Vercel)

| Secret         | Value                        | Used By                                       |
| -------------- | ---------------------------- | --------------------------------------------- |
| `VERCEL_TOKEN` | Vercel personal access token | (optional — only if you use Vercel CLI in CI) |

> Vercel deploys via its GitHub App integration — no secrets needed for basic deploy.
> `VERCEL_TOKEN` is only required if you add Vercel CLI commands to CI workflows.

#### Bot (DigitalOcean)

| Secret               | Value                      | Example                                  |
| -------------------- | -------------------------- | ---------------------------------------- |
| `DO_HOST`            | Droplet IP or hostname     | `143.198.x.x`                            |
| `DO_PORT`            | SSH port                   | `22`                                     |
| `DO_USER`            | Non-root SSH user          | `nezuko`                                 |
| `DO_SSH_PRIVATE_KEY` | Private key (full content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DO_KNOWN_HOSTS`     | Droplet host keys          | Output of `ssh-keyscan -H <droplet-ip>`  |
| `GRAMMY_REMOTE_DIR`  | Bot directory on Droplet   | `/opt/nezuko/grammy`                     |
| `GRAMMY_SERVICE`     | systemd service name       | `nezuko-grammy`                          |
| `GRAMMY_HEALTH_URL`  | Health endpoint            | `http://127.0.0.1:8080/health`           |

#### Generating the SSH key pair

```bash
# Run locally — generates a deploy-only key pair
ssh-keygen -t ed25519 -C "nezuko-github-deploy" -f ~/.ssh/nezuko_deploy -N ""

# Copy public key to Droplet
ssh-copy-id -i ~/.ssh/nezuko_deploy.pub nezuko@<droplet-ip>

# Get known_hosts value
ssh-keyscan -H <droplet-ip>
# → Paste this output as the DO_KNOWN_HOSTS secret

# Get private key value
cat ~/.ssh/nezuko_deploy
# → Paste this as the DO_SSH_PRIVATE_KEY secret
```

---

## 4. Vercel — Web Dashboard Setup

### 4.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Set **Root Directory**: `apps/web`
4. Framework preset: **Next.js** (auto-detected)

### 4.2 Build Settings

Vercel will respect `apps/web/vercel.json`. Verify these in the Vercel dashboard:

| Setting          | Value                           |
| ---------------- | ------------------------------- |
| Framework        | Next.js                         |
| Root Directory   | `apps/web`                      |
| Build Command    | `bun run build`                 |
| Install Command  | `bun install --frozen-lockfile` |
| Output Directory | `.next` (default)               |

### 4.3 Environment Variables

Add these in: `Vercel → Project → Settings → Environment Variables`

#### Production

| Variable                        | Value                                   | Scope                    |
| ------------------------------- | --------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_INSFORGE_BASE_URL` | `https://u4ckbciy.us-west.insforge.app` | Production               |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | `<your anon key>`                       | Production               |
| `NEXT_PUBLIC_USE_MOCK`          | `false`                                 | Production               |
| `NEXT_PUBLIC_DEV_LOGIN`         | `false`                                 | Production               |
| `INSFORGE_SERVICE_KEY`          | `<your service key>`                    | Production (server-only) |

#### Preview (for PR deployments)

Same as Production — set the scope to "Preview" as well.

> ⚠️ **NEVER** add `INSFORGE_SERVICE_KEY` to client-side env vars (non-`NEXT_PUBLIC_` means server-only by default — keep it that way).

### 4.4 Domain Setup

1. `Vercel → Project → Settings → Domains`
2. Add your custom domain
3. Add the Vercel-provided CNAME/A record to your DNS provider
4. ⚠️ **Critical**: Update InsForge auth allowed origins to include the production domain:
   - `InsForge Dashboard → Auth → URL Configuration`
   - Add: `https://yourdomain.com` to allowed origins
   - Add: `https://yourdomain.com/api/auth/callback` to redirect URLs

### 4.5 Branch Protection (Gate Vercel on CI)

To prevent Vercel from deploying when CI fails:

1. `GitHub → Settings → Branches → Add rule → main`
2. Enable: **Require status checks to pass before merging**
3. Add required checks:
   - `Web Dashboard CI / quality`
4. Enable: **Require branches to be up to date before merging**

### 4.6 Vercel Deploy Behaviour

```text
Any push to main
  │
  ├── Vercel detects push → starts its own build (cannot be blocked)
  │
  └── web-ci.yml runs quality gates (independent)
       If quality fails → PR cannot be merged (if branch protection is set)
       If quality passes → safe to merge

PR opened/updated
  ├── Vercel creates a preview deployment (unique URL per PR)
  └── web-ci.yml runs quality gates on the PR branch
```

---

## 5. DigitalOcean — Bot Setup

### 5.1 Create the Droplet

- **Image**: Ubuntu 24.04 LTS
- **Size**: Basic Shared CPU — 1 vCPU / 2 GB RAM ($12/month) recommended
- **Region**: Choose closest to your users / InsForge region
- **SSH Key**: Add your **personal** SSH key for initial root access

### 5.2 Run the Bootstrap Script

```bash
# From your local machine
scp docs/deploy/bootstrap-droplet.sh root@<droplet-ip>:/tmp/
ssh root@<droplet-ip> "bash /tmp/bootstrap-droplet.sh"
```

The script will:

- Create the `nezuko` service user
- Install Node.js 22, Bun, Redis
- Configure UFW + fail2ban
- Create `/opt/nezuko/grammy` and `/etc/nezuko/grammy.env`
- Grant scoped passwordless sudo for the service

### 5.3 Add the Deploy Key

```bash
# On the Droplet (as root)
mkdir -p /home/nezuko/.ssh
echo "<content of nezuko_deploy.pub>" >> /home/nezuko/.ssh/authorized_keys
chown -R nezuko:nezuko /home/nezuko/.ssh
chmod 700 /home/nezuko/.ssh
chmod 600 /home/nezuko/.ssh/authorized_keys
```

### 5.4 Fill in the Env File

```bash
ssh root@<droplet-ip>
nano /etc/nezuko/grammy.env
```

Replace all `REPLACE_ME` values:

```bash
DASHBOARD_MODE=true
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=<your anon key>
INSFORGE_SERVICE_KEY=<your service key>
INSFORGE_REQUEST_TIMEOUT_MS=5000
REDIS_URL=redis://127.0.0.1:6379
LOG_LEVEL=info
HEALTH_PORT=8080
```

### 5.5 Install the systemd Service

```bash
# Copy from docs/deploy (or copy the content directly)
scp docs/deploy/nezuko-grammy.service root@<droplet-ip>:/etc/systemd/system/
ssh root@<droplet-ip> "
  systemctl daemon-reload
  systemctl enable nezuko-grammy
"
# Do NOT start yet — wait until first deploy ships the dist/
```

---

## 6. CI/CD Workflows Reference

| File                                  | Trigger                                                | Purpose                              |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `.github/workflows/grammy-ci.yml`     | Push/PR touching `apps/grammy/**` or `tests/grammy/**` | All quality gates + build artifact   |
| `.github/workflows/grammy-deploy.yml` | `grammy-ci` succeeds on `main` (or manual)             | SSH deploy to DigitalOcean           |
| `.github/workflows/web-ci.yml`        | Push/PR touching `apps/web/**`                         | All web quality gates                |
| Vercel GitHub App                     | Any push to any branch                                 | Automatic preview/production deploys |

### CI Flow Details

```
grammy-ci gates (single job):
  1. bun run type-check   → 0 errors
  2. bun run lint         → 0 warnings
  3. bun run format:check → All clean
  4. bun run knip         → No issues
  5. bun run test         → 163/163 pass
  6. bun run build        → dist/ produced
  7. Upload artifact      → grammy-dist-{sha} (main branch only)

grammy-deploy steps:
  1. Download artifact from CI run
  2. Verify artifact contents
  3. Configure SSH + known_hosts
  4. Verify SSH connectivity
  5. Snapshot current dist → dist.bak (rollback point)
  6. rsync new dist/ to Droplet
  7. bun install --production
  8. systemctl stop nezuko-grammy (wait 3s)
  9. systemctl start nezuko-grammy
 10. Poll /health for 60s (12 × 5s attempts)
 11. If health fails → auto rollback to dist.bak
```

---

## 7. First Deploy Sequence

Follow this exact order:

```
1. Complete Section 5 (Droplet bootstrap + env file + service installed)
2. Run: git push origin main (with grammy changes OR manually trigger deploy)
3. Watch grammy-ci.yml in GitHub Actions → must pass all gates
4. Watch grammy-deploy.yml → SSH deploy + health check
5. Verify: ssh nezuko@<droplet-ip> "systemctl status nezuko-grammy"
6. Verify: ssh nezuko@<droplet-ip> "curl -s http://127.0.0.1:8080/health"
7. Complete Section 4 (Vercel setup + env vars)
8. Push any web change to trigger Vercel deploy (or push no-op commit)
9. Verify: Dashboard loads, auth works, realtime connects, charts render
```

---

## 8. Rollback Procedures

### Bot Rollback

**Automatic**: If the health check fails in `grammy-deploy.yml`, the workflow automatically restores `dist.bak` and restarts the service.

**Manual**:

```bash
ssh nezuko@<droplet-ip>
sudo systemctl stop nezuko-grammy
cd /opt/nezuko/grammy
rm -rf dist
cp -a dist.bak dist
sudo systemctl start nezuko-grammy
# Verify
sleep 5 && curl -s http://127.0.0.1:8080/health
```

**Re-deploy a specific commit**:

```
GitHub → Actions → grammY Bot Deploy → Run workflow → input the SHA
```

### Web Rollback

```
Vercel → Project → Deployments → find previous good deploy
→ click the three-dot menu → "Promote to Production"
```

---

## 9. Ongoing Operations

### Bot Monitoring

```bash
# Service status
systemctl status nezuko-grammy

# Live logs
journalctl -u nezuko-grammy -f

# Last 100 lines
journalctl -u nezuko-grammy -n 100

# Health check
curl http://127.0.0.1:8080/health | jq

# Redis health
redis-cli ping
redis-cli info memory | grep used_memory_human

# Check bot_status heartbeats (run in InsForge SQL)
# SELECT bot_id, status, last_seen_at FROM bot_status ORDER BY last_seen_at DESC;
```

### Incident Response

If the bot stops responding:

1. `systemctl status nezuko-grammy` — is it running?
2. `journalctl -u nezuko-grammy -n 50` — what's the last error?
3. `redis-cli ping` — is Redis up?
4. `curl -s http://127.0.0.1:8080/health` — what does health say?
5. Check InsForge connectivity: `curl -s https://u4ckbciy.us-west.insforge.app/api/health`
6. Check for duplicate processes: `ps aux | grep "main.js"` → should be exactly 1
7. If `409 Conflict: terminated by other getUpdates request` in logs → kill all and restart

---

## 10. Edge Cases & Troubleshooting

### Bot: 409 getUpdates Conflict

**Symptom**: Logs show `409 Conflict: terminated by other getUpdates request`
**Cause**: Multiple bot processes polling the same token
**Fix**:

```bash
# Kill all node processes (verify there's only one bot running)
ps aux | grep "node.*main.js"
# Kill duplicates, then:
sudo systemctl restart nezuko-grammy
```

**Prevention**: `process-lock.ts` prevents this on startup. Only happens if systemd races during deploy.

### Bot: Health check fails after deploy

**Symptom**: Deploy workflow reports health failure, rollback triggers
**Causes**:

- InsForge is unreachable (check InsForge status)
- `INSFORGE_SERVICE_KEY` is wrong or expired
- Redis not available at startup
- Bot taking > 60s to initialize (more than 12 bots in `bot_instances`)

**Debug**:

```bash
ssh nezuko@<droplet-ip>
sudo systemctl status nezuko-grammy
journalctl -u nezuko-grammy -n 30
```

### Bot: Bun not found on Droplet

If deploy logs say "Bun not found — falling back to npm":

```bash
ssh nezuko@<droplet-ip>
# Install Bun for nezuko user
curl -fsSL https://bun.sh/install | bash
# Then update PATH in .bashrc
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
bun --version
```

### Web: Build fails in CI but passes locally

**Common cause**: `bun.lock` is out of sync with `package.json`

```bash
cd apps/web
bun install          # regenerates bun.lock
git add bun.lock
git commit -m "chore: sync bun.lock"
```

### Web: Auth redirect mismatch after Vercel domain change

**Symptom**: Login redirects to wrong URL or gets a 400 error
**Fix**:

1. `InsForge Dashboard → Auth → URL Configuration`
2. Update allowed callback URLs to match the new Vercel domain
3. Update `NEXT_PUBLIC_INSFORGE_BASE_URL` if you changed InsForge projects

### Web: `NEXT_PUBLIC_DEV_LOGIN=true` accidentally deployed

**Impact**: Anyone can access the dashboard without credentials
**Verify production env**:

```
Vercel → Project → Settings → Environment Variables
→ Confirm NEXT_PUBLIC_DEV_LOGIN = false for Production scope
```

### Vercel: `output: "standalone"` and Bun

`apps/web/next.config.ts` sets `output: "standalone"`. Vercel ignores this for its own serverless system (it handles output itself). This is fine — `standalone` is useful if you ever run the web app outside Vercel.

### Redis: Memory pressure

If `redis-cli info memory` shows `used_memory_human` close to 128mb:

```bash
# Check keys
redis-cli info keyspace
# The bot uses "nezuko:v2:" prefix
redis-cli keys "nezuko:v2:*" | wc -l
```

Increase `maxmemory` in `/etc/redis/redis.conf` or upgrade Droplet RAM.

---

## 11. Security Checklist

Before going live, confirm:

- [ ] `INSFORGE_SERVICE_KEY` is set in bot env (not just anon key)
- [ ] `NEXT_PUBLIC_DEV_LOGIN=false` in Vercel production env
- [ ] `DO_SSH_PRIVATE_KEY` is the deploy-only key (not your personal key)
- [ ] Redis only listens on `127.0.0.1` (verify: `ss -tlnp | grep 6379`)
- [ ] UFW is enabled: `ufw status` shows `active`
- [ ] SSH password auth is disabled on Droplet
- [ ] `/etc/nezuko/grammy.env` is mode 640 (not world-readable)
- [ ] `HEALTH_PORT` (8080) is NOT exposed in UFW (internal only)
- [ ] `INSFORGE_SERVICE_KEY` is NOT set as a `NEXT_PUBLIC_` var

---

## 12. Post-Deploy Migration Gates

These database migrations exist in `insforge/migrations/` but must be applied **manually** in the correct order. They are **not automated** to prevent accidental lockout.

| Migration                                 | Status           | When to Apply                                                |
| ----------------------------------------- | ---------------- | ------------------------------------------------------------ |
| `024_verification_contract_hardening.sql` | Not applied live | Apply after bot is deployed and healthy                      |
| `026_lock_down_anon_policies.sql`         | ⚠️ HIGH RISK     | Apply ONLY after both web and bot use `INSFORGE_SERVICE_KEY` |

### Applying migration 024

```bash
# Via InsForge MCP tool
# run-raw-sql with contents of insforge/migrations/024_verification_contract_hardening.sql
```

### Applying migration 026 (anon lockdown)

> **Pre-condition**: Verify in production logs that the bot is connecting with `INSFORGE_SERVICE_KEY`, not the anon key. Check `journalctl -u nezuko-grammy | grep "service_key"` or verify InsForge access logs.

```bash
# Only after confirming service-key auth works end-to-end
# run-raw-sql with contents of insforge/migrations/026_lock_down_anon_policies.sql
```
