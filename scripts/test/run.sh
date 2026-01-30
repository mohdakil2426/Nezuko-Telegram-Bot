#!/bin/bash
# ============================================================
# Test runner for Nezuko project (Bash)
# Runs pytest with various options for testing the project.
# ============================================================
#
# Usage:
#   ./run.sh              # Show available test options
#   ./run.sh all          # Run all tests
#   ./run.sh handlers     # Run handler tests
#   ./run.sh all -c       # Run all tests with coverage
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/../core/utils.sh"

# Parse arguments
SUITE=""
VERBOSE=""
COVERAGE=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        all|edge|handlers|services)
            SUITE="$1"
            ;;
        -v|--verbose)
            VERBOSE="-v"
            ;;
        -c|--coverage)
            COVERAGE="true"
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
    shift
done

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${YELLOW}   🧪 Nezuko Test Runner${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

# Activate virtual environment
if [[ -f "$PROJECT_ROOT/.venv/bin/activate" ]]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
else
    echo -e "  ${YELLOW}⚠️  Virtual environment not found. Using system Python.${NC}"
fi

cd "$PROJECT_ROOT"

# Build pytest arguments
PYTEST_ARGS="tests/"

if [[ -n "$VERBOSE" ]]; then
    PYTEST_ARGS="$PYTEST_ARGS -v"
fi

if [[ "$COVERAGE" == "true" ]]; then
    PYTEST_ARGS="$PYTEST_ARGS --cov=apps --cov-report=html --cov-report=term-missing"
fi

# If no suite specified, show menu
if [[ -z "$SUITE" ]]; then
    echo -e "  ${WHITE}Available test suites:${NC}"
    echo ""
    echo -e "    [1] 🧪 All Tests"
    echo -e "    [2] 🔬 Edge Cases"
    echo -e "    [3] 📡 Handlers"
    echo -e "    [4] ⚙️  Services"
    echo ""
    echo -e "  ${GRAY}Usage:${NC}"
    echo -e "    ${GRAY}./run.sh all           # Run all tests${NC}"
    echo -e "    ${GRAY}./run.sh handlers -v   # Verbose handler tests${NC}"
    echo -e "    ${GRAY}./run.sh all -c        # With coverage report${NC}"
    echo ""
    
    read -p "  Select suite (1-4, or Enter to cancel): " choice
    
    case $choice in
        1) SUITE="all" ;;
        2) SUITE="edge" ;;
        3) SUITE="handlers" ;;
        4) SUITE="services" ;;
        *)
            echo -e "  ${GRAY}Cancelled.${NC}"
            exit 0
            ;;
    esac
fi

# Filter by suite
case $SUITE in
    "all")
        echo -e "  ${GREEN}🧪 Running all tests...${NC}"
        # No filter needed
        ;;
    "edge")
        echo -e "  ${GREEN}🔬 Running edge case tests...${NC}"
        PYTEST_ARGS="tests/api/test_edge_cases.py $VERBOSE"
        [[ "$COVERAGE" == "true" ]] && PYTEST_ARGS="$PYTEST_ARGS --cov=apps"
        ;;
    "handlers")
        echo -e "  ${GREEN}📡 Running handler tests...${NC}"
        PYTEST_ARGS="tests/bot/test_handlers.py $VERBOSE"
        [[ "$COVERAGE" == "true" ]] && PYTEST_ARGS="$PYTEST_ARGS --cov=apps"
        ;;
    "services")
        echo -e "  ${GREEN}⚙️  Running service tests...${NC}"
        PYTEST_ARGS="tests/bot/test_services.py $VERBOSE"
        [[ "$COVERAGE" == "true" ]] && PYTEST_ARGS="$PYTEST_ARGS --cov=apps"
        ;;
esac

echo ""

# Run pytest
python -m pytest $PYTEST_ARGS
exit_code=$?

echo ""
if [[ $exit_code -eq 0 ]]; then
    echo -e "  ${GREEN}✅ All tests passed!${NC}"
else
    echo -e "  ${RED}❌ Some tests failed.${NC}"
fi
echo ""

exit $exit_code
