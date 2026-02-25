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
SKIP_PYTHON=false
SKIP_NODE=false
FORCE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-python) SKIP_PYTHON=true ;;
        --skip-node) SKIP_NODE=true ;;
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

write_step "1/6" "Checking prerequisites..."

if ! check_prerequisites; then
    echo ""
    echo -e "  ${RED}❌ Prerequisites check failed. Please install missing tools.${NC}"
    echo ""
    exit 1
fi

# ============================================================
# Step 2: Create Virtual Environment
# ============================================================

if [[ "$SKIP_PYTHON" != "true" ]]; then
    write_step "2/6" "Creating Python virtual environment..."
    
    VENV_PATH="$(get_venv_path)"
    
    if [[ -d "$VENV_PATH" ]] && [[ "$FORCE" != "true" ]]; then
        write_info "Virtual environment already exists. Use --force to recreate."
    else
        if [[ -d "$VENV_PATH" ]]; then
            rm -rf "$VENV_PATH"
        fi
        
        python3 -m venv .venv
        
        if [[ -d "$VENV_PATH" ]]; then
            write_success "Virtual environment created at .venv"
        else
            write_failure "Failed to create virtual environment"
            exit 1
        fi
    fi
    
    # ============================================================
    # Step 3: Install Python Dependencies
    # ============================================================
    
    write_step "3/6" "Installing Python dependencies..."
    
    VENV_PYTHON="$(get_venv_python)"
    
    # Upgrade pip first
    "$VENV_PYTHON" -m pip install --upgrade pip --quiet
    
    # Install production requirements
    if [[ -f "$PROJECT_ROOT/requirements.txt" ]]; then
        "$VENV_PYTHON" -m pip install --prefer-binary -r "$PROJECT_ROOT/requirements.txt" --quiet
        write_success "Production dependencies installed"
    else
        write_failure "requirements.txt not found"
        exit 1
    fi

    # Install dev requirements (ruff, pytest, pyrefly, pylint)
    if [[ -f "$PROJECT_ROOT/requirements-dev.txt" ]]; then
        "$VENV_PYTHON" -m pip install --prefer-binary -r "$PROJECT_ROOT/requirements-dev.txt" --quiet
        write_success "Dev tools installed (ruff, pytest, pyrefly, pylint)"
    else
        write_info "requirements-dev.txt not found — skipping dev tools"
    fi
else
    write_step "2/6" "Skipping Python setup (--skip-python)"
    write_step "3/6" "Skipping Python dependencies (--skip-python)"
fi

# ============================================================
# Step 4: Install Node.js Dependencies
# ============================================================

if [[ "$SKIP_NODE" != "true" ]]; then
    write_step "4/6" "Installing Node.js dependencies (Bun — apps/web)..."

    WEB_DIR="$PROJECT_ROOT/apps/web"

    if [[ ! -d "$WEB_DIR" ]]; then
        write_failure "apps/web directory not found"
    else
        cd "$WEB_DIR"
        bun install 2>&1 | while IFS= read -r line; do
            [ -n "$line" ] && echo -e "        ${GRAY}$line${NC}"
        done
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            write_success "Node.js packages installed (apps/web)"
        else
            write_failure "Failed to install Node.js packages"
        fi
        cd "$PROJECT_ROOT"
    fi
else
    write_step "4/6" "Skipping Node.js setup (--skip-node)"
fi

# ============================================================
# Step 5: Create Environment Files
# ============================================================

write_step "5/6" "Creating environment files..."

# Web .env.local
if copy_env_if_missing "apps/web" ".env.local" ".env.example"; then
    write_success "Created apps/web/.env.local"
else
    write_info "apps/web/.env.local already exists"
fi



# Bot .env
if copy_env_if_missing "apps/bot" ".env" ".env.example"; then
    write_success "Created apps/bot/.env"
else
    write_info "apps/bot/.env already exists"
fi

# ============================================================
# Step 6: Create Logging Directories
# ============================================================

write_step "6/6" "Creating logging directories..."

STORAGE_DIRS=("apps/bot/logs")

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
echo -e "  ${WHITE}📝 ${CYAN}apps/bot/.env${NC}"
echo -e "     ${GRAY}- BOT_TOKEN              (from @BotFather, when DASHBOARD_MODE=false)${NC}"
echo -e "     ${GRAY}- INSFORGE_BASE_URL      (your InsForge project URL)${NC}"
echo -e "     ${GRAY}- INSFORGE_ANON_KEY      (from InsForge dashboard — must match web)${NC}"
echo -e "     ${GRAY}- ENCRYPTION_KEY         (generate with: nezuko keygen)${NC}"
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
