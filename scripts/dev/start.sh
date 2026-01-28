#!/bin/bash
# ============================================================
# Nezuko Development Server Launcher (Bash)
# Starts Web, API, and Bot in separate terminal windows/tabs
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

echo -e "  Starting services..."
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
echo -e "  ${BLUE}[1/3] Starting Web Dashboard...${NC}"
open_terminal "Nezuko - Web" "cd apps/web && bun dev"

sleep 2

# Start API Server (FastAPI)
echo -e "  ${GREEN}[2/3] Starting API Server...${NC}"
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    open_terminal "Nezuko - API" "source .venv/bin/activate && cd apps/api && uvicorn src.main:app --reload --port 8080"
else
    open_terminal "Nezuko - API" "cd apps/api && uvicorn src.main:app --reload --port 8080"
fi

sleep 2

# Start Telegram Bot
echo -e "  ${YELLOW}[3/3] Starting Telegram Bot...${NC}"
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
echo -e "   Web:  ${BLUE}http://localhost:3000${NC}"
echo -e "   API:  ${GREEN}http://localhost:8080${NC}"
echo -e "   Bot:  ${YELLOW}Running in polling mode${NC}"
echo ""
echo -e "   ${GRAY}Press Ctrl+C in each terminal to stop services.${NC}"
echo ""
