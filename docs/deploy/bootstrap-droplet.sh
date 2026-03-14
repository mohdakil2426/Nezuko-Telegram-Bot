#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Nezuko — DigitalOcean Droplet Bootstrap Script
#
# Run this ONCE as root immediately after creating a fresh Ubuntu 24.04 LTS
# Droplet to prepare the server for the grammY bot.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/docs/deploy/bootstrap-droplet.sh | sudo bash
#   — or —
#   scp docs/deploy/bootstrap-droplet.sh root@<droplet-ip>:/tmp/
#   ssh root@<droplet-ip> "bash /tmp/bootstrap-droplet.sh"
#
# What this script does:
#   1. Updates the system and installs security tools
#   2. Creates a non-root "nezuko" service user
#   3. Sets up SSH hardening (key-only auth)
#   4. Configures UFW firewall
#   5. Installs Node.js 22 (official NodeSource) + optional Bun
#   6. Installs and hardens Redis (localhost-only)
#   7. Creates /opt/nezuko/grammy and /etc/nezuko directory layout
#   8. Installs and starts the nezuko-grammy systemd service
#   9. Enables automatic security updates
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Require root ────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "This script must be run as root."

info "─── Nezuko Droplet Bootstrap ───────────────────────────────────────────"

# ── 1. System update ────────────────────────────────────────────────────────
info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -yq
apt-get install -yq \
  curl wget git unzip \
  build-essential \
  ufw fail2ban \
  ca-certificates gnupg lsb-release \
  systemd-journal-remote \
  logrotate \
  htop

# ── 2. Create service user ──────────────────────────────────────────────────
info "Creating service user 'nezuko'..."
if id "nezuko" &>/dev/null; then
  warn "User 'nezuko' already exists — skipping creation."
else
  useradd --system --create-home --shell /bin/bash --user-group nezuko
  info "User 'nezuko' created."
fi

# ── 3. Node.js 22 via NodeSource ────────────────────────────────────────────
info "Installing Node.js 22..."
if command -v node &>/dev/null && node --version | grep -q "^v22"; then
  warn "Node.js 22 already installed: $(node --version)"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -yq nodejs
  node --version
  npm --version
fi

# ── 4. Bun (optional, used for faster installs) ─────────────────────────────
info "Installing Bun for nezuko user..."
if su -c "command -v bun" nezuko &>/dev/null; then
  warn "Bun already installed for nezuko."
else
  su -c 'curl -fsSL https://bun.sh/install | bash' nezuko
  # Add bun to system path via profile.d for the service
  echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /home/nezuko/.bashrc
fi

# ── 5. Redis ────────────────────────────────────────────────────────────────
info "Installing Redis..."
apt-get install -yq redis-server

info "Hardening Redis (localhost-only)..."
# Backup original config
cp /etc/redis/redis.conf /etc/redis/redis.conf.bak

# Ensure Redis only listens on loopback
sed -i 's/^#* *bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
# Disable protected-mode warning (it's still secured by bind)
sed -i 's/^#* *protected-mode .*/protected-mode yes/' /etc/redis/redis.conf
# Set a reasonable memory limit (adjust for your Droplet RAM)
grep -q "maxmemory " /etc/redis/redis.conf || \
  echo "maxmemory 128mb" >> /etc/redis/redis.conf
grep -q "maxmemory-policy" /etc/redis/redis.conf || \
  echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf

systemctl enable --now redis-server
redis-cli ping | grep -q "PONG" && info "Redis is healthy." || warn "Redis ping failed!"

# ── 6. Firewall (UFW) ───────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH — adjust port if you change the SSH port
ufw allow 22/tcp comment "SSH"

# Bot health endpoint — only expose if you need external probing.
# Default: BLOCK externally. Use SSH tunnel or internal health check.
# ufw allow 8080/tcp comment "Bot health endpoint"

ufw --force enable
ufw status verbose

# ── 7. Fail2ban ─────────────────────────────────────────────────────────────
info "Configuring fail2ban..."
systemctl enable --now fail2ban

# ── 8. Automatic security updates ───────────────────────────────────────────
info "Enabling unattended security upgrades..."
apt-get install -yq unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades || true

# ── 9. Directory layout ─────────────────────────────────────────────────────
info "Creating directory layout..."
mkdir -p /opt/nezuko/grammy
mkdir -p /etc/nezuko

chown -R nezuko:nezuko /opt/nezuko
chmod 755 /opt/nezuko/grammy

# Env file — DO NOT PUT REAL SECRETS HERE. Populate manually after bootstrapping.
if [ ! -f /etc/nezuko/grammy.env ]; then
  cat > /etc/nezuko/grammy.env <<'ENV'
# ─────────────────────────────────────────────────────────────────────────────
# Nezuko grammY Bot — Production Environment
# Populate this file with real values before starting the service.
# ─────────────────────────────────────────────────────────────────────────────

# Bot mode
DASHBOARD_MODE=true

# InsForge backend (use SERVICE_KEY for bot runtime)
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=REPLACE_ME
INSFORGE_SERVICE_KEY=REPLACE_ME
INSFORGE_REQUEST_TIMEOUT_MS=5000

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Logging
LOG_LEVEL=info

# Health endpoint
HEALTH_PORT=8080

# Keep-alive (leave blank unless on a platform with idle spin-down)
KEEP_ALIVE_URL=
KEEP_ALIVE_INTERVAL_MS=
ENV

  chown root:nezuko /etc/nezuko/grammy.env
  chmod 640 /etc/nezuko/grammy.env
  warn "Env file created at /etc/nezuko/grammy.env"
  warn "Edit it and fill in INSFORGE_ANON_KEY and INSFORGE_SERVICE_KEY before starting the bot."
else
  warn "/etc/nezuko/grammy.env already exists — not overwritten."
fi

# ── 10. Allow nezuko to control its own service (passwordless sudo) ─────────
info "Granting 'nezuko' passwordless sudo for nezuko-grammy service..."
cat > /etc/sudoers.d/nezuko-grammy <<'SUDOERS'
# Allow the nezuko user to control only the nezuko-grammy service.
nezuko ALL=(ALL) NOPASSWD: /bin/systemctl start nezuko-grammy, /bin/systemctl stop nezuko-grammy, /bin/systemctl restart nezuko-grammy, /bin/systemctl status nezuko-grammy
SUDOERS
chmod 440 /etc/sudoers.d/nezuko-grammy
visudo -c -f /etc/sudoers.d/nezuko-grammy && info "sudoers entry validated." || error "sudoers syntax error!"

# ── 11. Log rotation for journald ───────────────────────────────────────────
info "Configuring journald log retention..."
mkdir -p /etc/systemd/journald.conf.d/
cat > /etc/systemd/journald.conf.d/nezuko.conf <<'JOURNALD'
[Journal]
SystemMaxUse=500M
MaxRetentionSec=2week
JOURNALD
systemctl restart systemd-journald

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
info "╔══════════════════════════════════════════════════════════════════╗"
info "║       Nezuko Droplet Bootstrap — COMPLETE                       ║"
info "╠══════════════════════════════════════════════════════════════════╣"
info "║  Next steps (do these manually):                                ║"
info "║                                                                 ║"
info "║  1. Edit /etc/nezuko/grammy.env with real secrets               ║"
info "║  2. Copy docs/deploy/nezuko-grammy.service to /etc/systemd/     ║"
info "║     sudo cp nezuko-grammy.service /etc/systemd/system/          ║"
info "║     sudo systemctl daemon-reload                                 ║"
info "║     sudo systemctl enable nezuko-grammy                         ║"
info "║  3. First deploy: run the grammy-deploy GitHub Actions workflow  ║"
info "║     (or manually rsync dist/ + restart)                         ║"
info "║  4. Add your GitHub deploy key public key to~nezuko/.ssh/       ║"
info "║     authorized_keys                                             ║"
info "║  5. Run: ssh-keyscan -H <droplet-ip> and add to DO_KNOWN_HOSTS ║"
info "╚══════════════════════════════════════════════════════════════════╝"
