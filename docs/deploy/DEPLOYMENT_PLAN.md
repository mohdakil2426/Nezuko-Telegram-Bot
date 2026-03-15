# Deployment Plan: Vercel Web + DigitalOcean grammY Bot

Date: 2026-03-15
Status: Planning only
Scope: Production deployment plan for `apps/web` on Vercel and `apps/grammy` on a DigitalOcean Droplet

## 1. Goal

Deploy the current Nezuko architecture without changing the application runtime model:

- `apps/web` stays a Next.js 16 dashboard and deploys to `Vercel`
- `apps/grammy` stays an always-on long-polling grammY worker and deploys to a `DigitalOcean Droplet`
- `InsForge` remains the backend for PostgreSQL, realtime, storage, auth, and edge functions
- `Redis` runs alongside the bot on the Droplet for cache, idempotency locks, and moderation state

This plan deliberately avoids forcing the bot into a webhook/serverless shape because the current bot relies on:

- long polling
- background status writer
- background member sync
- realtime socket client
- multi-bot lifecycle management
- Redis-backed coordination

## 2. Deployment Decision

### Web: Vercel

Why:

- Best fit for `Next.js 16`
- Native support for App Router and the current web deployment model
- No need to redesign the dashboard architecture
- Clean GitHub integration and environment variable management

### Bot: DigitalOcean Droplet

Why:

- Best fit for a persistent grammY runtime
- Supports long-running processes cleanly
- Works well with `systemd`
- Keeps Redis local and low-latency
- Better operational shape than trying to run the current bot on Vercel

### Redis: same Droplet initially

Why:

- simplest production rollout
- cheapest path while validating production
- good enough for the current project scale

Future upgrade path:

- move Redis to managed Redis only if memory pressure, failover, or cross-node scaling becomes necessary

## 3. Official Guidance Used

This plan is based on:

- grammY official guidance: Vercel hosting is webhook/serverless oriented, VPS is a first-class fit for long polling
- grammY deployment-types guidance: long polling is the simpler fit for always-on backend instances
- Vercel official Next.js documentation
- DigitalOcean official guidance for Ubuntu-based droplets, SSH-based deployment, and Node app operations
- InsForge official deployment guidance for frontend deployments and BaaS usage

## 4. Target Production Architecture

```text
Users
  |
  v
Vercel -> apps/web (Next.js dashboard)
  |
  v
InsForge (DB + Auth + Realtime + Storage + Functions)
  ^
  |
DigitalOcean Droplet -> apps/grammy (grammY long-polling worker)
                      -> local Redis
```

### Runtime shape

- Web is stateless and horizontally managed by Vercel
- Bot is a single always-on service process on the Droplet
- Redis is private and local to the Droplet
- InsForge is the shared control plane and data plane

## 5. Non-Goals

This plan does not include:

- rewriting the bot to webhook mode
- moving the bot to Vercel functions
- moving Redis to managed Redis on day one
- changing InsForge schema or runtime contracts
- changing the app architecture beyond deployment wiring

## 6. Prerequisites

Before implementation begins, confirm all of the following:

### Accounts and access

- Vercel account connected to GitHub
- DigitalOcean account active
- DigitalOcean Droplet created or ready to create
- InsForge project active
- GitHub repo access with Actions enabled

### Project state

- `apps/web` builds cleanly locally
- `apps/grammy` passes type-check, lint, test, and build locally
- current production env values are known
- bot token and InsForge secrets are available

### DNS and domains

- a production dashboard domain is available for Vercel
- Droplet has a stable public IP
- optional: a bot admin subdomain for health checks or future reverse proxy use

## 7. Environment Inventory

### Web env on Vercel

Required:

- `NEXT_PUBLIC_INSFORGE_BASE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `NEXT_PUBLIC_USE_MOCK=false`
- `NEXT_PUBLIC_DEV_LOGIN=false`

Server-side if used in production:

- `INSFORGE_SERVICE_KEY`

Review before deploy:

- no development-only flags enabled
- no local-only callback URLs
- auth redirect URLs align with final Vercel domain

### Bot env on DigitalOcean

Required:

- `DASHBOARD_MODE=true`
- `INSFORGE_BASE_URL`
- `INSFORGE_ANON_KEY`
- `INSFORGE_SERVICE_KEY`
- `INSFORGE_REQUEST_TIMEOUT_MS=5000`
- `REDIS_URL=redis://127.0.0.1:6379`
- `LOG_LEVEL=info`
- `HEALTH_PORT=8080`

Conditional:

- `BOT_TOKEN` only if standalone mode is used
- keep-alive variables only if intentionally used

Review before deploy:

- prefer `INSFORGE_SERVICE_KEY` for bot runtime
- do not rely on old anon-policy write paths long term
- ensure no local `.env` values leak into production docs or workflows

## 8. Vercel Web Plan

### Project configuration

Create one Vercel project for the repo with:

- Framework preset: `Next.js`
- Root directory: `apps/web`
- Production branch: `main`
- Install command: allow Vercel default if Bun is auto-detected from lockfile, otherwise pin explicitly during implementation
- Build command: default `next build` or explicit `bun run build` if needed after validation
- Output directory: default Next.js behavior

### Environment setup

Add production env vars in Vercel:

- `NEXT_PUBLIC_INSFORGE_BASE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `NEXT_PUBLIC_USE_MOCK=false`
- `NEXT_PUBLIC_DEV_LOGIN=false`
- `INSFORGE_SERVICE_KEY` if server actions require it in production

### Domain and auth verification

After first deploy:

- attach custom domain
- verify login flows
- verify redirect URLs
- verify any OAuth callback URLs in InsForge auth settings

### Validation checklist

- dashboard loads
- login works
- protected routes work
- realtime connects
- charts load
- bot management page loads
- settings page vault actions work

### Risks

- env mismatch between local and Vercel
- auth callback mismatch
- Turbopack/build differences across local and cloud

### Rollback

- redeploy previous Vercel production deployment
- restore previous env vars if a bad env rollout caused the issue

## 9. DigitalOcean Bot Plan

### Droplet shape

Recommended starting point:

- Ubuntu LTS Droplet
- 1 vCPU / 1 GB RAM minimum
- 1 vCPU / 2 GB RAM preferred for headroom

### Server baseline

Provision the Droplet with:

- non-root admin user
- SSH key auth only
- UFW enabled
- automatic security updates
- Node.js 22 installed
- Bun installed
- Redis installed and bound to localhost

Optional but recommended:

- fail2ban
- basic log rotation review

### Directory layout

Use a stable layout such as:

```text
/opt/nezuko/grammy
/etc/nezuko/grammy.env
```

### Process manager

Use `systemd`, not ad hoc shell sessions.

Reason:

- starts on boot
- restarts on failure
- integrates cleanly with Ubuntu
- easier operational control than keeping a terminal open

### Service shape

The service should:

- run from `/opt/nezuko/grammy`
- read env from `/etc/nezuko/grammy.env`
- execute the built artifact via Node 22
- restart automatically on failure
- start after network and Redis

### Redis shape

Use local Redis first with:

- bind to `127.0.0.1`
- no public exposure
- default port only on loopback

### Health and logs

Use:

- bot health endpoint on `HEALTH_PORT`
- `journalctl` for service logs
- structured app logs already emitted by the bot

### Validation checklist

- service starts on boot
- bot connects to Telegram without 409 conflicts
- bot reads active bot instances from InsForge
- health endpoint returns success
- Redis reachable
- status writer updates `bot_status`
- command worker receives commands
- verification flow works end-to-end

### Risks

- duplicate bot processes during migration
- missing or invalid env file
- Redis not available at service start
- old anon-key contract assumptions

### Rollback

- stop new service
- restore previous env file
- redeploy previous artifact
- restart systemd service

## 10. Deployment Automation Plan

### Web

Use Vercel native GitHub integration.

Why:

- simplest path
- best fit for Next.js
- no custom CI deploy logic needed initially

### Bot

Use GitHub Actions to deploy to the DigitalOcean Droplet over SSH.

Recommended deployment flow:

1. On push to `main`, run bot quality gates
2. Build the bot artifact
3. Ship release files to the Droplet
4. Install production dependencies on the Droplet
5. Restart the `systemd` service
6. Verify service health

### Bot release contents

Ship only what is needed:

- `dist/`
- `package.json`
- `bun.lock`

Do not ship:

- `.env`
- tests
- memory bank
- docs
- local caches

### GitHub secrets expected

- `DO_HOST`
- `DO_PORT`
- `DO_USER`
- `DO_SSH_PRIVATE_KEY`
- `GRAMMY_REMOTE_DIR`

Potential extra secrets if needed:

- `DO_KNOWN_HOSTS`

## 11. Rollout Order

Use this exact rollout order:

1. Finalize deployment assets and documentation
2. Validate local quality gates for web and bot
3. Provision and harden the Droplet
4. Install Redis, Node 22, and Bun on the Droplet
5. Create bot env file on the Droplet
6. Install and verify the bot `systemd` service manually once
7. Configure GitHub Actions bot deployment
8. Deploy web to Vercel
9. Verify web production auth and dashboard behavior
10. Cut over bot production deployment
11. Monitor logs, heartbeat, commands, and verification flows

Reason for this order:

- the bot is the higher-risk stateful runtime
- bot stability must be proven before locking down remaining backend access assumptions

## 12. Production Verification Plan

### Web verification

- home and login pages render
- dashboard route protection works
- charts render against production InsForge
- logs page receives realtime updates
- settings page can read vault status
- bot management works

### Bot verification

- `systemctl status` shows active
- health endpoint responds
- Telegram `getMe` succeeds in logs
- `bot_status` heartbeats appear in InsForge
- admin commands execute
- verification events are logged
- no duplicate polling or `409 Conflict: terminated by other getUpdates request`

### Cross-system verification

- web sees live bot status
- web can manage bots
- bot consumes backend changes
- Redis-backed moderation flow works

## 13. Security Plan

### Web

- keep production-only env vars in Vercel
- never expose `INSFORGE_SERVICE_KEY` client-side
- verify auth callback URLs exactly

### Bot

- no secrets in repo
- env file readable only by the service/admin user
- Redis not publicly reachable
- SSH key auth only
- disable password login if possible
- use non-root runtime user for the bot process

## 14. Operational Plan

### Monitoring

Track:

- `bot_status`
- service health endpoint
- `admin_logs`
- `api_call_log`
- system journal

### Incident response

If bot stops:

1. inspect `systemctl status`
2. inspect `journalctl -u <service>`
3. verify Redis
4. verify InsForge connectivity
5. verify no duplicate bot process exists

If web fails:

1. inspect Vercel deployment logs
2. verify env variables
3. verify auth callback configuration
4. rollback to previous Vercel deployment if needed

## 15. Known Architecture Constraints To Respect

- Bot must remain on long polling unless intentionally redesigned
- Web and bot continue to talk directly to InsForge
- Bot must use `INSFORGE_SERVICE_KEY` preference in production
- Redis remains required for best runtime behavior
- No root-level monorepo assumptions should be reintroduced

## 16. Deliverables For Implementation Phase

Implementation should produce:

- Vercel deployment instructions or config where truly needed
- DigitalOcean bot deployment documentation
- `systemd` service template for the bot
- GitHub Actions workflow for bot deployment to the Droplet
- optional server bootstrap notes for Node 22, Bun, Redis, firewall, and service setup

## 17. Implementation Sequence After Plan Approval

Once approved, implementation should proceed in this order:

1. add deployment documentation
2. add bot service template
3. add bot deploy workflow
4. review existing Dockerfile for future optional container path
5. validate all affected quality gates
6. perform dry-run review of env requirements and secret names

## 18. Success Criteria

This deployment project is complete only when:

- web deploys to Vercel from GitHub
- bot deploys to DigitalOcean from GitHub or a documented manual release path
- bot survives reboot via systemd
- Redis is private and healthy
- dashboard and bot both work against production InsForge
- rollback steps are documented and testable

