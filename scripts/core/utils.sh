#!/bin/bash
# ============================================================
# Shared utility functions for Nezuko CLI scripts (Bash)
# Contains common functions used across multiple scripts.
# ============================================================

# ============================================================
# Colors
# ============================================================

export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export GRAY='\033[0;90m'
export NC='\033[0m' # No Color

# ============================================================
# Path Utilities
# ============================================================

get_project_root() {
    # Gets the project root directory
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

get_venv_path() {
    # Gets the virtual environment path
    echo "$(get_project_root)/.venv"
}

get_venv_python() {
    # Gets the path to the Python executable in the virtual environment
    echo "$(get_venv_path)/bin/python"
}

# ============================================================
# Prerequisite Checks
# ============================================================

check_prerequisites() {
    # Checks if all required tools are installed
    # Returns 0 if all prerequisites are met, 1 otherwise
    local quiet="${1:-false}"
    local all_good=0
    
    # Check Python
    if command -v python3 &> /dev/null; then
        local py_version
        py_version=$(python3 --version 2>&1)
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${GREEN}✅ $py_version${NC}"
        fi
    else
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${RED}❌ Python 3.x not found${NC}"
        fi
        all_good=1
    fi
    
    # Check Bun
    if command -v bun &> /dev/null; then
        local bun_version
        bun_version=$(bun --version 2>&1)
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${GREEN}✅ Bun: $bun_version${NC}"
        fi
    else
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${RED}❌ Bun not found (https://bun.sh)${NC}"
        fi
        all_good=1
    fi
    
    # Check Git (optional)
    if command -v git &> /dev/null; then
        local git_version
        git_version=$(git --version 2>&1)
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${GREEN}✅ $git_version${NC}"
        fi
    else
        if [[ "$quiet" != "true" ]]; then
            echo -e "  ${YELLOW}⚠️  Git not found (optional)${NC}"
        fi
    fi
    
    return $all_good
}

venv_exists() {
    # Checks if the virtual environment exists
    [[ -d "$(get_venv_path)" ]]
}

activate_venv() {
    # Activates the virtual environment if it exists
    local venv_activate
    venv_activate="$(get_venv_path)/bin/activate"
    
    if [[ -f "$venv_activate" ]]; then
        source "$venv_activate"
        return 0
    fi
    return 1
}

# ============================================================
# Process Management
# ============================================================

stop_process_by_name() {
    # Stops all processes matching the given name
    # Usage: stop_process_by_name "node"
    local process_name="$1"
    local count=0
    
    # Use pkill if available, otherwise use killall
    if command -v pkill &> /dev/null; then
        if pkill -f "$process_name" 2>/dev/null; then
            count=$((count + 1))
        fi
    elif command -v killall &> /dev/null; then
        if killall "$process_name" 2>/dev/null; then
            count=$((count + 1))
        fi
    fi
    
    echo $count
}

stop_process_by_port() {
    # Stops process running on a specific port
    # Usage: stop_process_by_port 3000
    local port="$1"
    
    if command -v lsof &> /dev/null; then
        local pid
        pid=$(lsof -ti:"$port" 2>/dev/null)
        if [[ -n "$pid" ]]; then
            kill -9 "$pid" 2>/dev/null
            return 0
        fi
    elif command -v fuser &> /dev/null; then
        fuser -k "$port/tcp" 2>/dev/null
        return $?
    fi
    
    return 1
}

# ============================================================
# Output Utilities
# ============================================================

write_step() {
    # Writes a formatted step message
    # Usage: write_step "1/5" "Installing dependencies"
    local step="$1"
    local message="$2"
    
    echo ""
    echo -e "  ${CYAN}[$step] $message${NC}"
}

write_success() {
    # Writes a success message
    local message="$1"
    echo -e "        ${GREEN}✅ $message${NC}"
}

write_failure() {
    # Writes a failure message
    local message="$1"
    echo -e "        ${RED}❌ $message${NC}"
}

write_info() {
    # Writes an info message
    local message="$1"
    echo -e "        ${GRAY}ℹ️  $message${NC}"
}

write_warning() {
    # Writes a warning message
    local message="$1"
    echo -e "        ${YELLOW}⚠️  $message${NC}"
}

# ============================================================
# Environment File Utilities
# ============================================================

copy_env_if_missing() {
    # Copies .env.example to .env if .env doesn't exist
    # Usage: copy_env_if_missing "/path/to/dir" ".env.local" ".env.example"
    local target_dir="$1"
    local env_file="${2:-.env}"
    local example_file="${3:-.env.example}"
    
    local env_path="$target_dir/$env_file"
    local example_path="$target_dir/$example_file"
    
    if [[ ! -f "$env_path" ]]; then
        if [[ -f "$example_path" ]]; then
            cp "$example_path" "$env_path"
            return 0
        fi
    fi
    
    return 1
}

# ============================================================
# OS Detection
# ============================================================

get_os() {
    # Returns the current operating system
    case "$(uname -s)" in
        Linux*)     echo "linux" ;;
        Darwin*)    echo "macos" ;;
        CYGWIN*)    echo "windows" ;;
        MINGW*)     echo "windows" ;;
        MSYS*)      echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

is_macos() {
    [[ "$(get_os)" == "macos" ]]
}

is_linux() {
    [[ "$(get_os)" == "linux" ]]
}
