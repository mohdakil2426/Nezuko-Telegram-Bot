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
    echo -e "${WHITE}  │    [7] 🔄 Pull & Sync (Update Dependencies)          │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  ├──────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}  │    [0] ❌ Exit                                       │${NC}"
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

show_clean_menu() {
    echo ""
    echo -e "${WHITE}  ┌──────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}  │  ${YELLOW}CLEAN OPTIONS${WHITE}                                     │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [1] 📦 Clean node_modules only                    │${NC}"
    echo -e "${WHITE}  │    [2] 🐍 Clean Python .venv only                    │${NC}"
    echo -e "${WHITE}  │    [3] 🧹 Clean ALL (node_modules + .venv)           │${NC}"
    echo -e "${WHITE}  │                                                      │${NC}"
    echo -e "${WHITE}  │    [0] ⬅️  Back to Main Menu                          │${NC}"
    echo -e "${WHITE}  └──────────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "  ${RED}⚠️  WARNING:${YELLOW} These actions are irreversible!${NC}"
    echo ""
}

do_clean_menu() {
    CLEAN_SCRIPT="$SCRIPT_DIR/../utils/clean.sh"
    
    while true; do
        show_banner
        show_clean_menu
        
        read -p "  Enter choice: " choice
        
        case $choice in
            1)
                # Clean node_modules only
                echo ""
                echo -e "  ${YELLOW}📦 This will delete all node_modules folders.${NC}"
                read -p "  Are you sure? (y/N): " confirm
                if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
                    echo ""
                    "$CLEAN_SCRIPT"
                    echo -e "  ${GREEN}✅ node_modules cleaned!${NC}"
                else
                    echo -e "  ${GRAY}❌ Cancelled.${NC}"
                fi
                wait_for_keypress
                ;;
            2)
                # Clean .venv only
                echo ""
                echo -e "  ${YELLOW}🐍 This will delete the Python virtual environment (.venv).${NC}"
                echo -e "  ${RED}⚠️  You will need to run './nezuko setup' to recreate it!${NC}"
                read -p "  Are you sure? (y/N): " confirm
                if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
                    echo ""
                    if [[ -d "$PROJECT_ROOT/.venv" ]]; then
                        echo -e "  ${GRAY}Removing .venv...${NC}"
                        rm -rf "$PROJECT_ROOT/.venv"
                        echo -e "  ${GREEN}✅ .venv deleted!${NC}"
                    else
                        echo -e "  ${GRAY}ℹ️  .venv not found.${NC}"
                    fi
                else
                    echo -e "  ${GRAY}❌ Cancelled.${NC}"
                fi
                wait_for_keypress
                ;;
            3)
                # Clean ALL
                echo ""
                echo -e "  ${YELLOW}🧹 This will delete ALL:${NC}"
                echo -e "     ${GRAY}- node_modules folders${NC}"
                echo -e "     ${GRAY}- Python .venv${NC}"
                echo ""
                echo -e "  ${RED}⚠️  You will need to run './nezuko setup' to reinstall!${NC}"
                read -p "  Are you sure? (y/N): " confirm
                if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
                    echo ""
                    "$CLEAN_SCRIPT" --include-venv
                    echo -e "  ${GREEN}✅ All artifacts cleaned!${NC}"
                else
                    echo -e "  ${GRAY}❌ Cancelled.${NC}"
                fi
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

do_total_reset() {
    echo ""
    echo -e "  ${RED}♻️  Performing total reset (clean + reinstall)...${NC}"
    echo -e "  ${YELLOW}This will delete node_modules AND .venv, then reinstall.${NC}"
    read -p "  Are you sure? (y/N): " confirm
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        "$SCRIPT_DIR/../utils/clean.sh" --include-venv
        sleep 1
        do_setup
    else
        echo -e "  ${GRAY}❌ Cancelled.${NC}"
    fi
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
            5) do_clean_menu ;;
            6) do_total_reset; wait_for_keypress ;;
            7) 
                echo ""
                echo -e "  ${CYAN}🔄 Pulling latest changes & syncing dependencies...${NC}"
                # Try git pull if in a git repo
                if [ -d "$PROJECT_ROOT/.git" ]; then
                    git pull || echo -e "  ${YELLOW}⚠️  Git pull failed, continuing with sync...${NC}"
                fi
                do_setup
                wait_for_keypress 
                ;;
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
