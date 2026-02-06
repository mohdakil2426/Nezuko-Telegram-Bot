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
    
    # Install requirements (root requirements.txt includes all dependencies)
    if [[ -f "$PROJECT_ROOT/requirements.txt" ]]; then
        "$VENV_PYTHON" -m pip install -r requirements.txt --quiet
        write_success "All Python dependencies installed"
    else
        write_failure "requirements.txt not found"
        exit 1
    fi
else
    write_step "2/6" "Skipping Python setup (--skip-python)"
    write_step "3/6" "Skipping Python dependencies (--skip-python)"
fi

# ============================================================
# Step 4: Install Node.js Dependencies
# ============================================================

if [[ "$SKIP_NODE" != "true" ]]; then
    write_step "4/6" "Installing Node.js dependencies (Bun)..."
    
    bun install > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        write_success "Node.js packages installed"
    else
        write_failure "Failed to install Node.js packages"
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

# API .env
if copy_env_if_missing "apps/api" ".env" ".env.example"; then
    write_success "Created apps/api/.env"
else
    write_info "apps/api/.env already exists"
fi

# Bot .env
if copy_env_if_missing "apps/bot" ".env" ".env.example"; then
    write_success "Created apps/bot/.env"
else
    write_info "apps/bot/.env already exists"
fi

# ============================================================
# Step 6: Create Storage Directories
# ============================================================

write_step "6/6" "Creating storage directories..."

STORAGE_DIRS=("storage/logs" "storage/data" "storage/cache")

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
echo -e "  ${WHITE}📝 ${CYAN}apps/web/.env.local${NC}"
echo -e "     ${GRAY}- NEXT_PUBLIC_API_URL (default: http://localhost:8080)${NC}"
echo -e "     ${GRAY}- NEXT_PUBLIC_LOGIN_BOT_USERNAME (your bot's username)${NC}"
echo ""
echo -e "  ${WHITE}📝 ${CYAN}apps/api/.env${NC}"
echo -e "     ${GRAY}- LOGIN_BOT_TOKEN (from @BotFather - for dashboard auth)${NC}"
echo -e "     ${GRAY}- BOT_OWNER_TELEGRAM_ID (your Telegram ID)${NC}"
echo -e "     ${GRAY}- ENCRYPTION_KEY (generate with Fernet.generate_key())${NC}"
echo ""
echo -e "  ${WHITE}📝 ${CYAN}apps/bot/.env${NC}"
echo -e "     ${GRAY}- BOT_TOKEN (optional - for standalone mode)${NC}"
echo ""
echo -e "  Then run: ${GREEN}./nezuko dev${NC}"
echo ""
