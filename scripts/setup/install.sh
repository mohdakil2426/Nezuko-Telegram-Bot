#!/bin/bash
# ============================================================
# Nezuko First-Time Project Setup (Bash)
# Sets up the development environment for Mac/Linux
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/../core/utils.sh"

# Parse arguments
SKIP_WEB=false
SKIP_BOT=false
FORCE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-web) SKIP_WEB=true ;;
        --skip-bot) SKIP_BOT=true ;;
        --force|-f) FORCE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${YELLOW}   🦊 Nezuko Project Setup${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# ============================================================
# Step 1: Check Prerequisites
# ============================================================

write_step "1/5" "Checking prerequisites..."

if ! check_prerequisites; then
    echo ""
    echo -e "  ${RED}❌ Prerequisites check failed. Please install missing tools.${NC}"
    echo ""
    exit 1
fi

# ============================================================
# Step 2: Install Web Dashboard Dependencies
# ============================================================

if [[ "$SKIP_WEB" != "true" ]]; then
    write_step "2/5" "Installing Web dependencies (Bun — apps/web)..."

    WEB_DIR="$PROJECT_ROOT/apps/web"

    if [[ ! -d "$WEB_DIR" ]]; then
        write_failure "apps/web directory not found"
    else
        cd "$WEB_DIR"
        bun install 2>&1 | while IFS= read -r line; do
            [ -n "$line" ] && echo -e "        ${GRAY}$line${NC}"
        done
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            write_success "Web Dashboard packages installed."
        else
            write_failure "Failed to install web packages."
        fi
        cd "$PROJECT_ROOT"
    fi
else
    write_step "2/5" "Skipping Web setup (--skip-web)"
fi

# ============================================================
# Step 3: Install Bot Dependencies (grammY)
# ============================================================

if [[ "$SKIP_BOT" != "true" ]]; then
    write_step "3/5" "Installing Bot dependencies (Bun — apps/grammy)..."

    BOT_DIR="$PROJECT_ROOT/apps/grammy"

    if [[ ! -d "$BOT_DIR" ]]; then
        write_failure "apps/grammy directory not found"
    else
        cd "$BOT_DIR"
        bun install 2>&1 | while IFS= read -r line; do
            [ -n "$line" ] && echo -e "        ${GRAY}$line${NC}"
        done
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            write_success "Telegram Bot packages installed."
        else
            write_failure "Failed to install bot packages."
        fi
        cd "$PROJECT_ROOT"
    fi
else
    write_step "3/5" "Skipping Bot setup (--skip-bot)"
fi

# ============================================================
# Step 4: Create Environment Files
# ============================================================

write_step "4/5" "Creating environment files..."

# Web .env.local
if copy_env_if_missing "apps/web" ".env.local" ".env.example"; then
    write_success "Created apps/web/.env.local (from .env.example)"
else
    write_info "apps/web/.env.local already exists"
fi

# Bot .env
if copy_env_if_missing "apps/grammy" ".env" ".env.example"; then
    write_success "Created apps/grammy/.env (from .env.example)"
else
    write_info "apps/grammy/.env already exists"
fi

# ============================================================
# Step 5: Create Logging Directories
# ============================================================

write_step "5/5" "Creating logging directories..."

STORAGE_DIRS=("apps/grammy/logs")

for dir in "${STORAGE_DIRS[@]}"; do
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        write_success "Created $dir"
    else
        write_info "$dir already exists"
    fi
done

# ============================================================
# Summary
# ============================================================

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   ✅ Setup Complete!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
echo -e "  ${YELLOW}IMPORTANT:${NC} Edit these files with your credentials:"
echo ""
echo -e "  ${WHITE}📝 ${CYAN}apps/grammy/.env${NC}"
echo -e "     ${GRAY}- BOT_TOKEN              (from @BotFather, when DASHBOARD_MODE=false)${NC}"
echo -e "     ${GRAY}- INSFORGE_BASE_URL      (your InsForge project URL)${NC}"
echo -e "     ${GRAY}- INSFORGE_ANON_KEY      (from metadata — must match web)${NC}"
echo -e "     ${GRAY}- ENCRYPTION_KEY         (32-byte hex for AES-256-GCM tokens)${NC}"
echo -e "     ${GRAY}- REDIS_URL              (redis://127.0.0.1:6379/0)${NC}"
echo ""
echo -e "  ${WHITE}📝 ${CYAN}apps/web/.env.local${NC}"
echo -e "     ${GRAY}- NEXT_PUBLIC_INSFORGE_BASE_URL  (your InsForge project URL)${NC}"
echo -e "     ${GRAY}- NEXT_PUBLIC_INSFORGE_ANON_KEY  (must match bot key)${NC}"
echo -e "     ${GRAY}- NEXT_PUBLIC_LOGIN_BOT_USERNAME (your bot's username without @)${NC}"
echo ""
echo -e "  🐳 Start local Redis:"
echo -e "     ${GRAY}docker compose -f docker-compose.local.yml up -d${NC}"
echo -e "     ${GRAY}(Or just run: ./nezuko dev — Redis starts automatically)${NC}"
echo ""
echo -e "  Then run: ${GREEN}./nezuko dev${NC}"
echo ""
