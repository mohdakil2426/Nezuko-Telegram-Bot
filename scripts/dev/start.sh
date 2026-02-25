#!/bin/bash
# ============================================================
# Nezuko Development Server Launcher (Bash)
# Starts Redis via Docker Compose, then opens Web Dashboard
# and Telegram Bot in separate terminal windows/tabs.
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/../core/utils.sh"

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${YELLOW}   🦊 Nezuko Development Launcher${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# ============================================================
# Step 0: Start Redis via Docker Compose
# ============================================================

echo -e "  ${MAGENTA}[Redis] Starting Redis cache (Docker)...${NC}"

COMPOSE_FILE="$PROJECT_ROOT/docker-compose.local.yml"

if ! command -v docker &>/dev/null; then
    echo -e "        ${YELLOW}⚠️  Docker not found — Redis will not start.${NC}"
    echo -e "        ${GRAY}Install Docker Desktop: https://www.docker.com/products/docker-desktop/${NC}"
elif [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "        ${YELLOW}⚠️  docker-compose.local.yml not found — skipping Redis.${NC}"
else
    docker compose -f "$COMPOSE_FILE" up -d 2>&1 | while IFS= read -r line; do
        [ -n "$line" ] && echo -e "        ${GRAY}$line${NC}"
    done
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "        ${GREEN}✅ Redis is up (nezuko-redis-local on port 6379)${NC}"
    else
        echo -e "        ${RED}❌ Failed to start Redis${NC}"
    fi
fi

echo ""

# Detect terminal emulator and OS
open_terminal() {
    local title="$1"
    local cmd="$2"
    
    if is_macos; then
        # macOS - use AppleScript to open new Terminal tab
        osascript <<EOF
tell application "Terminal"
    activate
    tell application "System Events" to tell process "Terminal" to keystroke "t" using command down
    delay 0.5
    do script "cd '$PROJECT_ROOT' && $cmd" in front window
end tell
EOF
    elif command -v gnome-terminal &> /dev/null; then
        # GNOME Terminal
        gnome-terminal --tab --title="$title" -- bash -c "cd '$PROJECT_ROOT' && $cmd; exec bash"
    elif command -v konsole &> /dev/null; then
        # KDE Konsole
        konsole --new-tab -e bash -c "cd '$PROJECT_ROOT' && $cmd; exec bash" &
    elif command -v xfce4-terminal &> /dev/null; then
        # XFCE Terminal
        xfce4-terminal --tab --title="$title" -e "bash -c 'cd $PROJECT_ROOT && $cmd; exec bash'" &
    elif command -v xterm &> /dev/null; then
        # xterm fallback
        xterm -T "$title" -e "cd '$PROJECT_ROOT' && $cmd; exec bash" &
    else
        # No GUI terminal - run in background
        echo -e "  ${YELLOW}No graphical terminal found. Running in background...${NC}"
        cd "$PROJECT_ROOT"
        eval "$cmd" &
    fi
}

# Start Web Dashboard (Next.js)
echo -e "  ${BLUE}[1/2] Starting Web Dashboard...${NC}"
open_terminal "Nezuko - Web" "cd apps/web && bun dev"

sleep 2

# Start Telegram Bot
echo -e "  ${YELLOW}[2/2] Starting Telegram Bot...${NC}"
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    open_terminal "Nezuko - Bot" "source .venv/bin/activate && python -m apps.bot.main"
else
    open_terminal "Nezuko - Bot" "python -m apps.bot.main"
fi

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${GREEN}   ✅ All services started!${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""
echo -e "   Redis: ${MAGENTA}nezuko-redis-local (port 6379)${NC}"
echo -e "   Web:   ${BLUE}http://localhost:3000${NC}"
echo -e "   Bot:   ${YELLOW}Running in polling mode${NC}"
echo ""
echo -e "   ${GRAY}Press Ctrl+C in each terminal to stop services.${NC}"
echo -e "   ${GRAY}Run stop.sh to shut down Redis + services.${NC}"
echo ""
