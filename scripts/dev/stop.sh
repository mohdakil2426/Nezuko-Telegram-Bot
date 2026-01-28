#!/bin/bash
# ============================================================
# Nezuko Development Server Stopper (Bash)
# Stops all running dev services
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utilities
source "$SCRIPT_DIR/../core/utils.sh"

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${RED}   🛑 Stopping Nezuko Services${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

# Function to stop process by port
stop_on_port() {
    local port="$1"
    local name="$2"
    
    if stop_process_by_port "$port"; then
        echo -e "        ${GREEN}Stopped!${NC}"
    else
        echo -e "        ${GRAY}Not running${NC}"
    fi
}

# Kill processes by name
echo -e "  ${BLUE}[1/4] Stopping Web Dashboard (Node.js on port 3000)...${NC}"
stop_on_port 3000 "Web"

echo -e "  ${GREEN}[2/4] Stopping API Server (Python on port 8080)...${NC}"
stop_on_port 8080 "API"

echo -e "  ${YELLOW}[3/4] Stopping Telegram Bot (Python)...${NC}"
# Kill any python process running bot
if pkill -f "apps.bot.main" 2>/dev/null; then
    echo -e "        ${GREEN}Stopped!${NC}"
else
    echo -e "        ${GRAY}Not running${NC}"
fi

echo -e "  ${MAGENTA}[4/4] Stopping Bun processes...${NC}"
if pkill -f "bun" 2>/dev/null; then
    echo -e "        ${GREEN}Stopped!${NC}"
else
    echo -e "        ${GRAY}Not running${NC}"
fi

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   ✅ All services stopped!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
