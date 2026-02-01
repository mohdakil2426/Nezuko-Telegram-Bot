#!/usr/bin/env bash
#
# Supabase Python SDK Installer - Handles problematic dependencies
#
# This script installs the Supabase Python SDK while handling the known issue where:
# supabase -> storage3 -> pyiceberg -> pyroaring
#
# pyroaring requires C++ build tools to compile from source, and prebuilt wheels
# may not exist for newer Python versions (like 3.14).
#
# This script works around this by:
# 1. First attempting normal installation with --prefer-binary
# 2. If pyroaring fails, installing supabase with --no-deps
# 3. Manually installing required sub-packages (excluding storage3)
#
# Usage:
#   ./install-supabase.sh [OPTIONS]
#
# Options:
#   -v, --venv PATH    Path to virtual environment (default: .venv)
#   -f, --force        Skip normal attempt, use workaround directly
#   -q, --quiet        Minimal output
#   -h, --help         Show this help message
#
# Author: Nezuko Bot Team
# Version: 1.0.0
# Last Updated: 2026-01-31
#

set -e

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

SUPABASE_VERSION="2.27.2"

# Core supabase dependencies (excluding storage3 which causes the pyroaring issue)
SUPABASE_CORE_DEPS=(
    "postgrest>=0.16.0"
    "realtime>=2.0.0"
    "gotrue>=2.0.0"
    "httpx>=0.26.0"
    "pydantic>=2.0.0"
    "python-dateutil"
    "websockets>=10.0"
)

# Optional supabase sub-packages
SUPABASE_OPTIONAL_DEPS=(
    "supabase-auth"
    "supabase-functions"
)

# ============================================================
# Default values
# ============================================================

VENV_PATH=""
FORCE=false
QUIET=false

# ============================================================
# Colors and Output
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    local type=$1
    local message=$2
    
    if [[ "$QUIET" == true && "$type" == "INFO" ]]; then
        return
    fi
    
    case $type in
        SUCCESS) echo -e "  ${GREEN}✅ $message${NC}" ;;
        ERROR)   echo -e "  ${RED}❌ $message${NC}" ;;
        WARN)    echo -e "  ${YELLOW}⚠️  $message${NC}" ;;
        INFO)    echo -e "  ${CYAN}ℹ️  $message${NC}" ;;
        *)       echo -e "  • $message" ;;
    esac
}

print_header() {
    echo ""
    echo -e "  ${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "  ${CYAN}║         Supabase Python SDK Installer                ║${NC}"
    echo -e "  ${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ============================================================
# Helper Functions
# ============================================================

get_pip_executable() {
    echo "$VENV_PATH/bin/pip"
}

get_python_executable() {
    echo "$VENV_PATH/bin/python"
}

test_supabase_installed() {
    local python_exe=$(get_python_executable)
    local version
    
    version=$("$python_exe" -c "import supabase; print(supabase.__version__)" 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        echo "$version"
        return 0
    fi
    
    return 1
}

test_pyroaring_build_error() {
    local output="$1"
    
    if echo "$output" | grep -qiE "(pyroaring|Failed building wheel|failed-wheel-build|error:.*C\+\+)"; then
        return 0
    fi
    
    return 1
}

# ============================================================
# Installation Functions
# ============================================================

install_supabase_normal() {
    local pip_exe=$(get_pip_executable)
    
    print_status "INFO" "Attempting normal installation: supabase>=$SUPABASE_VERSION"
    
    local output
    output=$("$pip_exe" install --prefer-binary "supabase>=$SUPABASE_VERSION" 2>&1) || true
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        print_status "SUCCESS" "Supabase installed successfully via normal method"
        return 0
    fi
    
    if test_pyroaring_build_error "$output"; then
        print_status "WARN" "pyroaring build failed - C++ build tools required"
        print_status "INFO" "Falling back to workaround installation..."
        return 1
    fi
    
    print_status "ERROR" "Installation failed with unknown error"
    echo "$output" | head -20
    return 1
}

install_supabase_workaround() {
    local pip_exe=$(get_pip_executable)
    
    print_status "INFO" "Using workaround: Installing supabase without storage3"
    
    # Step 1: Uninstall any existing broken installation
    print_status "INFO" "Step 1/4: Cleaning up existing installation..."
    "$pip_exe" uninstall -y supabase storage3 pyiceberg pyroaring 2>/dev/null || true
    
    # Step 2: Install supabase without dependencies
    print_status "INFO" "Step 2/4: Installing supabase (no-deps)..."
    if ! "$pip_exe" install --no-deps "supabase>=$SUPABASE_VERSION" 2>&1; then
        print_status "ERROR" "Failed to install supabase --no-deps"
        return 1
    fi
    
    # Step 3: Install core dependencies (excluding storage3)
    print_status "INFO" "Step 3/4: Installing core dependencies..."
    for dep in "${SUPABASE_CORE_DEPS[@]}"; do
        local dep_name="${dep%%[<>=]*}"
        echo "        Installing $dep_name..."
        "$pip_exe" install --prefer-binary "$dep" 2>&1 || print_status "WARN" "Failed to install $dep_name"
    done
    
    # Step 4: Install optional sub-packages (may fail, that's OK)
    print_status "INFO" "Step 4/4: Installing optional sub-packages..."
    for dep in "${SUPABASE_OPTIONAL_DEPS[@]}"; do
        echo "        Installing $dep..."
        "$pip_exe" install --prefer-binary --quiet "$dep" 2>/dev/null || true
    done
    
    print_status "SUCCESS" "Supabase installed successfully (without storage3)"
    print_status "WARN" "Note: File storage features are disabled"
    return 0
}

# ============================================================
# Argument Parsing
# ============================================================

show_help() {
    echo "Supabase Python SDK Installer"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --venv PATH    Path to virtual environment (default: .venv)"
    echo "  -f, --force        Skip normal attempt, use workaround directly"
    echo "  -q, --quiet        Minimal output"
    echo "  -h, --help         Show this help message"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--venv)
            VENV_PATH="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ============================================================
# Main Entry Point
# ============================================================

main() {
    print_header
    
    # Determine venv path
    if [[ -z "$VENV_PATH" ]]; then
        VENV_PATH="$PROJECT_ROOT/.venv"
    fi
    
    # Validate venv exists
    if [[ ! -f "$VENV_PATH/pyvenv.cfg" ]]; then
        print_status "ERROR" "Virtual environment not found at: $VENV_PATH"
        print_status "INFO" "Run the setup script first to create the virtual environment"
        return 1
    fi
    
    # Get pip executable
    local pip_exe=$(get_pip_executable)
    if [[ ! -x "$pip_exe" ]]; then
        print_status "ERROR" "pip not found at: $pip_exe"
        return 1
    fi
    
    # Get python executable
    local python_exe=$(get_python_executable)
    
    print_status "INFO" "Virtual environment: $VENV_PATH"
    print_status "INFO" "Target version: supabase>=$SUPABASE_VERSION"
    
    # Check if already installed
    if [[ "$FORCE" != true ]]; then
        local installed_version
        if installed_version=$(test_supabase_installed); then
            print_status "SUCCESS" "Supabase already installed: v$installed_version"
            return 0
        fi
    fi
    
    # Attempt installation
    local success=false
    
    if [[ "$FORCE" == true ]]; then
        # Skip normal attempt, go straight to workaround
        if install_supabase_workaround; then
            success=true
        fi
    else
        # Try normal installation first
        if install_supabase_normal; then
            success=true
        else
            # Fall back to workaround
            if install_supabase_workaround; then
                success=true
            fi
        fi
    fi
    
    # Verify installation
    if [[ "$success" == true ]]; then
        local installed_version
        if installed_version=$(test_supabase_installed); then
            echo ""
            print_status "SUCCESS" "Installation verified: supabase v$installed_version"
        else
            print_status "WARN" "Warning: Installation completed but import test failed"
        fi
    fi
    
    echo ""
    return $(if [[ "$success" == true ]]; then echo 0; else echo 1; fi)
}

# Run main
main
