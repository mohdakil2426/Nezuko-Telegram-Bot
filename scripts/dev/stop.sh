#!/bin/bash
# ============================================================
# Nezuko Development Server Stopper (Bash)
# Stops Web Dashboard, Telegram Bot, and Redis Docker container
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

# Stop Web Dashboard (Node.js on port 3000)
echo -e "  ${BLUE}[1/3] Stopping Web Dashboard (Node.js on port 3000)...${NC}"
stop_on_port 3000 "Web"



echo -e "  ${YELLOW}[2/3] Stopping Telegram Bot (Python)...${NC}"
# Kill any python process running bot
if pkill -f "apps.bot.main" 2>/dev/null; then
    echo -e "        ${GREEN}Stopped!${NC}"
else
    echo -e "        ${GRAY}Not running${NC}"
fi

# Stop Redis Docker container
echo -e "  ${MAGENTA}[3/3] Redis (Docker: nezuko-redis-local)...${NC}"

COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/docker-compose.local.yml"

if ! command -v docker &>/dev/null; then
    echo -e "        ${GRAY}Docker not available${NC}"
elif [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "        ${GRAY}docker-compose.local.yml not found${NC}"
else
    REDIS_RUNNING=$(docker ps --filter "name=nezuko-redis-local" --format "{{.Names}}" 2>/dev/null)
    if [ "$REDIS_RUNNING" = "nezuko-redis-local" ]; then
        docker compose -f "$COMPOSE_FILE" stop 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "        ${GREEN}Stopped Redis container (data preserved)${NC}"
        else
            echo -e "        ${RED}Failed to stop Redis container${NC}"
        fi
    else
        echo -e "        ${GRAY}Not running${NC}"
    fi
fi

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   ✅ All services stopped!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
