#!/bin/bash
# ============================================================
# Safely removes node_modules, dist, and build artifacts
# ============================================================
#
# This script removes ONLY:
# - node_modules folders at SPECIFIC whitelisted locations
# - build/dist folders at SPECIFIC whitelisted locations
#
# NOTHING ELSE IS EVER DELETED.
# NO source code, config files, or any other files are touched.
#
# Usage:
#   ./clean.sh                # Remove node_modules and artifacts
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
DRY_RUN=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
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
# No catch-all wildcards used for safety.
# ============================================================

ALLOWED_PATHS=(
    "node_modules"
    "apps/web/node_modules"
    "apps/web/.next"
    "apps/grammy/node_modules"
    "apps/grammy/dist"
    ".turbo"
)

# ============================================================
# Step 1: Remove artifacts (whitelisted paths only)
# ============================================================

echo -e "  ${BLUE}[1/1] Removing build artifacts and dependencies...${NC}"

removed_count=0

for path in "${ALLOWED_PATHS[@]}"; do
    if [[ -d "$path" ]]; then
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
    echo -e "        ${GRAY}No artifacts found to clean.${NC}"
else
    echo -e "        ${GREEN}Removed $removed_count folder(s).${NC}"
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   Complete!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
