#!/bin/bash
# ============================================================
# Nezuko Interactive CLI Menu (Bash)
# Provides an interactive menu for common development tasks.
# This is the main entry point for Mac/Linux developers.
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/utils.sh"

# ============================================================
# Menu Display Functions
# ============================================================

show_banner() {
    clear
    echo ""
    echo -e "${CYAN}  ╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║                                                      ║${NC}"
    echo -e "${CYAN}  ║         🦊 ${YELLOW}NEZUKO DEVELOPER CLI${CYAN}                   ║${NC}"
    echo -e "${CYAN}  ║                                                      ║${NC}"
    echo -e "${CYAN}  ╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${GRAY}  ║   Telegram Bot Platform • Admin Dashboard • API      ║${NC}"
    echo -e "${CYAN}  ╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_menu() {
    echo -e "${WHITE}  ┌──────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}  │  ${GREEN}DEVELOPMENT${WHITE}                                         │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [1] 🚀 Start All Services                         │${NC}"
    echo -e "${WHITE}  │    [2] 🛑 Stop All Services                          │${NC}"
    echo -e "${WHITE}  │    [3] 🔄 Restart All Services                       │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  ├──────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}  │  ${YELLOW}SETUP & MAINTENANCE${WHITE}                               │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [4] 📦 First-Time Setup (Install Dependencies)    │${NC}"
    echo -e "${WHITE}  │    [5] 🧹 Clean All Artifacts                        │${NC}"
    echo -e "${WHITE}  │    [6] ♻️  Total Reset (Clean + Reinstall)            │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  ├──────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}  │  ${MAGENTA}TESTING & TOOLS${WHITE}                                   │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [7] 🧪 Run Tests                                  │${NC}"
    echo -e "${WHITE}  │    [8] 🗄️  Database Tools                            │${NC}"
    echo -e "${WHITE}  │    [9] 🐳 Docker Commands                            │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  ├──────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}  │    [0] ❌ Exit                                       │${NC}"
    echo -e "${WHITE}  └──────────────────────────────────────────────────────┘${NC}"
    echo ""
}

show_database_menu() {
    echo ""
    echo -e "${WHITE}  ┌──────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}  │  ${CYAN}DATABASE TOOLS${WHITE}                                    │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [1] 🔧 Setup Database (Create Tables)             │${NC}"
    echo -e "${WHITE}  │    [2] 🐛 Debug Database Connection                  │${NC}"
    echo -e "${WHITE}  │    [3] ⬆️  Run Migrations                             │${NC}"
    echo -e "${WHITE}  │    [0] ⬅️  Back to Main Menu                          │${NC}"
    echo -e "${WHITE}  └──────────────────────────────────────────────────────┘${NC}"
    echo ""
}

show_docker_menu() {
    echo ""
    echo -e "${WHITE}  ┌──────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}  │  ${BLUE}DOCKER COMMANDS${WHITE}                                   │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [1] 🏗️  Build All Containers                      │${NC}"
    echo -e "${WHITE}  │    [2] ▶️  Start Containers                           │${NC}"
    echo -e "${WHITE}  │    [3] ⏹️  Stop Containers                            │${NC}"
    echo -e "${WHITE}  │    [4] 📋 View Logs                                  │${NC}"
    echo -e "${WHITE}  │    [0] ⬅️  Back to Main Menu                          │${NC}"
    echo -e "${WHITE}  └──────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# ============================================================
# Action Functions
# ============================================================

do_start_services() {
    echo ""
    echo -e "  ${GREEN}🚀 Starting all development services...${NC}"
    "$SCRIPT_DIR/../dev/start.sh"
}

do_stop_services() {
    echo ""
    echo -e "  ${RED}🛑 Stopping all services...${NC}"
    "$SCRIPT_DIR/../dev/stop.sh"
}

do_restart_services() {
    echo ""
    echo -e "  ${YELLOW}🔄 Restarting all services...${NC}"
    do_stop_services
    sleep 2
    do_start_services
}

do_setup() {
    echo ""
    echo -e "  ${YELLOW}📦 Running first-time setup...${NC}"
    "$SCRIPT_DIR/../setup/install.sh"
}

do_clean() {
    echo ""
    echo -e "  ${YELLOW}🧹 Cleaning all build artifacts...${NC}"
    "$SCRIPT_DIR/../utils/clean.sh"
}

do_total_reset() {
    echo ""
    echo -e "  ${RED}♻️  Performing total reset (clean + reinstall)...${NC}"
    do_clean
    sleep 1
    do_setup
}

do_run_tests() {
    echo ""
    echo -e "  ${MAGENTA}🧪 Running test suite...${NC}"
    
    # Activate venv if exists
    if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
        source "$PROJECT_ROOT/.venv/bin/activate"
    fi
    
    cd "$PROJECT_ROOT"
    python -m pytest tests/ -v
}

do_database_menu() {
    while true; do
        show_banner
        show_database_menu
        
        read -p "  Enter choice: " choice
        
        case $choice in
            1)
                echo ""
                echo -e "  ${CYAN}🔧 Setting up database...${NC}"
                python "$SCRIPT_DIR/../db/setup.py"
                wait_for_keypress
                ;;
            2)
                echo ""
                echo -e "  ${CYAN}🐛 Debugging database connection...${NC}"
                python "$SCRIPT_DIR/../db/debug.py"
                wait_for_keypress
                ;;
            3)
                echo ""
                echo -e "  ${CYAN}⬆️  Running migrations...${NC}"
                cd "$PROJECT_ROOT/apps/api"
                alembic upgrade head
                wait_for_keypress
                ;;
            0)
                return
                ;;
            *)
                echo -e "  ${YELLOW}⚠️  Invalid choice. Please try again.${NC}"
                sleep 1
                ;;
        esac
    done
}

do_docker_menu() {
    DOCKER_DIR="$PROJECT_ROOT/config/docker"
    
    while true; do
        show_banner
        show_docker_menu
        
        read -p "  Enter choice: " choice
        
        case $choice in
            1)
                echo ""
                echo -e "  ${BLUE}🏗️  Building Docker containers...${NC}"
                cd "$DOCKER_DIR"
                docker-compose build
                wait_for_keypress
                ;;
            2)
                echo ""
                echo -e "  ${BLUE}▶️  Starting Docker containers...${NC}"
                cd "$DOCKER_DIR"
                docker-compose up -d
                wait_for_keypress
                ;;
            3)
                echo ""
                echo -e "  ${BLUE}⏹️  Stopping Docker containers...${NC}"
                cd "$DOCKER_DIR"
                docker-compose down
                wait_for_keypress
                ;;
            4)
                echo ""
                echo -e "  ${BLUE}📋 Viewing Docker logs (Ctrl+C to exit)...${NC}"
                cd "$DOCKER_DIR"
                docker-compose logs -f --tail=100
                ;;
            0)
                return
                ;;
            *)
                echo -e "  ${YELLOW}⚠️  Invalid choice. Please try again.${NC}"
                sleep 1
                ;;
        esac
    done
}

wait_for_keypress() {
    echo ""
    echo -e "  ${GRAY}Press any key to continue...${NC}"
    read -n 1 -s
}

# ============================================================
# Main Loop
# ============================================================

main_menu() {
    while true; do
        show_banner
        show_menu
        
        read -p "  Enter choice: " choice
        
        case $choice in
            1) do_start_services; wait_for_keypress ;;
            2) do_stop_services; wait_for_keypress ;;
            3) do_restart_services; wait_for_keypress ;;
            4) do_setup; wait_for_keypress ;;
            5) do_clean; wait_for_keypress ;;
            6) do_total_reset; wait_for_keypress ;;
            7) do_run_tests; wait_for_keypress ;;
            8) do_database_menu ;;
            9) do_docker_menu ;;
            0)
                echo ""
                echo -e "  ${CYAN}👋 Goodbye!${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo -e "  ${YELLOW}⚠️  Invalid choice. Please try again.${NC}"
                sleep 1
                ;;
        esac
    done
}

# Run the menu
main_menu
