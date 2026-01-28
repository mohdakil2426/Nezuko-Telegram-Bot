#!/bin/bash
# ============================================================
# Safely removes ONLY node_modules and Python .venv
# ============================================================
#
# This script removes ONLY:
# - node_modules folders at SPECIFIC whitelisted locations
# - Python .venv folder at project root (only with --include-venv flag)
#
# NOTHING ELSE IS EVER DELETED.
# NO source code, config files, or any other files are touched.
#
# Usage:
#   ./clean.sh                # Remove node_modules only
#   ./clean.sh --include-venv # Also remove .venv
#   ./clean.sh --dry-run      # Preview mode
# ============================================================

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# Parse arguments
INCLUDE_VENV=false
DRY_RUN=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --include-venv) INCLUDE_VENV=true ;;
        --dry-run|-n) DRY_RUN=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${YELLOW}   Nezuko Module Cleaner${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}[DRY RUN] Nothing will be deleted${NC}"
    echo ""
fi

cd "$PROJECT_ROOT"

# ============================================================
# STRICT WHITELIST - ONLY these exact paths can be deleted
# These are all node_modules folders - nothing else
# ============================================================

ALLOWED_NODE_MODULE_PATHS=(
    "node_modules"
    "apps/web/node_modules"
    "apps/api/node_modules"
    "apps/bot/node_modules"
    "packages/types/node_modules"
    "packages/config/node_modules"
)

# ============================================================
# Step 1: Remove node_modules (whitelisted paths only)
# ============================================================

echo -e "  ${BLUE}[1/2] Removing node_modules...${NC}"

removed_count=0

for path in "${ALLOWED_NODE_MODULE_PATHS[@]}"; do
    # Verify it's actually a node_modules directory
    if [[ -d "$path" ]] && [[ "$path" == *"node_modules"* ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo -e "        ${GRAY}[WOULD DELETE] $path${NC}"
        else
            echo -e "        ${GRAY}Removing $path...${NC}"
            rm -rf "$path"
            echo -e "        ${GREEN}Done.${NC}"
        fi
        ((removed_count++))
    fi
done

if [[ $removed_count -eq 0 ]]; then
    echo -e "        ${GRAY}No node_modules found.${NC}"
else
    echo -e "        ${GREEN}Removed $removed_count folder(s).${NC}"
fi

# ============================================================
# Step 2: Remove .venv (only if explicitly requested)
# ============================================================

echo ""
echo -e "  ${YELLOW}[2/2] Python virtual environment...${NC}"

if [[ "$INCLUDE_VENV" == "true" ]]; then
    if [[ -d ".venv" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo -e "        ${GRAY}[WOULD DELETE] .venv${NC}"
        else
            echo -e "        ${GRAY}Removing .venv...${NC}"
            rm -rf ".venv"
            echo -e "        ${GREEN}Done.${NC}"
        fi
    else
        echo -e "        ${GRAY}.venv not found.${NC}"
    fi
else
    echo -e "        ${GRAY}Skipped. Use --include-venv to remove.${NC}"
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   Complete!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
