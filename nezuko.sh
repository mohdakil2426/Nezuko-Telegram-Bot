#!/bin/bash
# ============================================================
# Nezuko CLI - Mac/Linux Entry Point
# Launches the interactive bash menu or runs commands
# ============================================================
# Usage: ./nezuko [command]
#   ./nezuko          - Opens interactive menu
#   ./nezuko dev      - Start development servers (Web + Bot)
#   ./nezuko stop     - Stop all services
#   ./nezuko setup    - First-time setup (Bun install)
#   ./nezuko test     - Run tests
#   ./nezuko keygen    - Generate 32-byte hex encryption key
#   ./nezuko sync     - Update dependencies (Bun install)
#   ./nezuko clean    - Clean node_modules and caches
#   ./nezuko tree     - Generate project structure
#   ./nezuko help     - Show commands
# ============================================================

set -e

# Get script directory (works with symlinks)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

show_help() {
    echo ""
    echo -e "${CYAN}  ====================================${NC}"
    echo -e "${YELLOW}   🦊 Nezuko CLI - Available Commands${NC}"
    echo -e "${CYAN}  ====================================${NC}"
    echo ""
    echo "  Usage: ./nezuko [command]"
    echo ""
    echo "  Commands:"
    echo "    (none)    Open interactive menu"
    echo "    dev       Start development servers (Web + Bot)"
    echo "    stop      Stop all services"
    echo "    setup     First-time project setup (Bun install)"
    echo "    test      Run test suite"
    echo "    keygen    Generate 32-byte hex encryption key"
    echo "    sync      Update dependencies (Bun install)"
    echo "    clean     Clean node_modules and caches"
    echo "    tree      Generate project folder structure"
    echo "    help      Show this help message"
    echo ""
    echo "  Examples:"
    echo "    ./nezuko            # Open menu"
    echo "    ./nezuko dev        # Start all servers"
    echo "    ./nezuko setup      # Install dependencies"
    echo "    ./nezuko tree       # Show project structure"
    echo ""
}

# Generate tree structure (bash equivalent)
generate_tree() {
    echo ""
    echo -e "${CYAN}  ====================================${NC}"
    echo -e "${YELLOW}   📁 Nezuko Project Structure${NC}"
    echo -e "${CYAN}  ====================================${NC}"
    echo ""
    
    # Check if tree command is available
    if command -v tree &> /dev/null; then
        tree -I 'node_modules|.venv|__pycache__|.git|.next|.turbo|.ruff_cache|.pytest_cache|dist|build|htmlcov|.opencode|.playwright-mcp|.agent|docs' -L 4 --dirsfirst
    else
        # Fallback using find
        echo "Nezuko-Telegram-Bot"
        echo "│"
        find . -maxdepth 4 \
            -not -path '*/node_modules/*' \
            -not -path '*/.venv/*' \
            -not -path '*/__pycache__/*' \
            -not -path '*/.git/*' \
            -not -path '*/.next/*' \
            -not -path '*/.turbo/*' \
            -not -path '*/.ruff_cache/*' \
            -not -path '*/.agent/*' \
            -not -path '*/docs/*' \
            -not -name '.git' \
            -not -name 'node_modules' \
            -not -name '.venv' \
            | sed 's|^\./||' | head -50
        echo ""
        echo -e "${GRAY}(Install 'tree' for better output: brew install tree)${NC}"
    fi
    echo ""
}

# Route to appropriate script based on argument
case "${1:-menu}" in
    ""|"menu")
        exec "$SCRIPT_DIR/scripts/core/menu.sh"
        ;;
    "dev"|"start")
        exec "$SCRIPT_DIR/scripts/dev/start.sh"
        ;;
    "stop")
        exec "$SCRIPT_DIR/scripts/dev/stop.sh"
        ;;
    "setup"|"install")
        exec "$SCRIPT_DIR/scripts/setup/install.sh"
        ;;
    "test")
        # Ensure scripts/test/run.sh exist, or redirect to apps/grammy tests
        if [ -f "$SCRIPT_DIR/scripts/test/run.sh" ]; then
            exec "$SCRIPT_DIR/scripts/test/run.sh"
        else
            echo -e "${YELLOW}Running grammY bot tests...${NC}"
            cd "$SCRIPT_DIR/apps/grammy" && bun run test
        fi
        ;;
    "sync"|"update")
        exec "$SCRIPT_DIR/scripts/setup/install.sh"
        ;;
    "keygen")
        exec "$SCRIPT_DIR/scripts/utils/generate-key.sh"
        ;;
    "clean")
        exec "$SCRIPT_DIR/scripts/utils/clean.sh"
        ;;
    "tree"|"structure")
        generate_tree
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}[ERROR] Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
