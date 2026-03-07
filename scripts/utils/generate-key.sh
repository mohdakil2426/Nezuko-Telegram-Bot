#!/bin/bash
# ============================================================
# Nezuko Encryption Key Generator (Bash)
# Generates a 32-byte hex key for AES-256-GCM
# ============================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utilities
source "$SCRIPT_DIR/../core/utils.sh"

echo ""
echo -e "${CYAN}  ====================================${NC}"
echo -e "${YELLOW}   🔐 Nezuko Encryption Key Generator${NC}"
echo -e "${CYAN}  ====================================${NC}"
echo ""

write_step "1/2" "Generating 32-byte random key..."

# Generate 32 bytes of random data and convert to hex
# Uses openssl (available on macOS/Linux)
if command -v openssl &> /dev/null; then
    HEX_KEY=$(openssl rand -hex 32)
    write_success "Random 32-byte hex key generated."
else
    # Fallback using /dev/urandom
    HEX_KEY=$(head -c 32 /dev/urandom | xxd -p -c 32 | tr -d '\n')
    if [[ -z "$HEX_KEY" ]]; then
        write_failure "Failed to generate key. openssl or xxd required."
        exit 1
    fi
    write_success "Random 32-byte hex key generated (via /dev/urandom)."
fi

write_step "2/2" "New Encryption Key"
echo ""
echo -e "  ${WHITE}🔑 Key:${NC}  ${MAGENTA}$HEX_KEY${NC}"
echo ""
echo -e "  ${YELLOW}⚠️  IMPORTANT: Keep this key safe!${NC}"
echo -e "     Add it to your ${CYAN}apps/grammy/.env${NC} file:"
echo ""
echo -e "     ${WHITE}ENCRYPTION_KEY=$HEX_KEY${NC}"
echo ""
echo -e "  ${GRAY}This key is used for AES-256-GCM encryption of sensitive data (tokens).${NC}"
echo -e "  ${GRAY}If you lose it, encrypted data will be irrecoverable.${NC}"
echo ""
