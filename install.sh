#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

trap 'echo -e "${RED}❌ Installation failed on line $LINENO.${NC}"; exit 1' ERR

echo "AWS Profile Containers - Installation"
echo "-------------------------------------"

# Pre-flight checks
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}Error: 'yarn' is not installed.${NC}"
    exit 1
fi

# Install API service
echo -n "Installing API service... "
bash "$PROJECT_ROOT/scripts/manage.sh" install > /dev/null
echo -e "${GREEN}✓${NC}"

# Build extension
echo -n "Building extension... "
cd "$PROJECT_ROOT"
yarn install --frozen-lockfile > /dev/null 2>&1
yarn build > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Show next steps
echo ""
echo -e "${GREEN}Installation Complete!${NC}"
echo ""
echo "Load extension in Firefox:"
echo "  1. Open: ${YELLOW}about:debugging#/runtime/this-firefox${NC}"
echo "  2. Click 'Load Temporary Add-on'"
echo "  3. Select: $PROJECT_ROOT/dist/manifest.json"
echo ""
if ls "$PROJECT_ROOT"/web-ext-artifacts/*.xpi 1> /dev/null 2>&1; then
    echo "Or install the XPI:"
    echo "  Open in Firefox: $PROJECT_ROOT/web-ext-artifacts/*.xpi"
else
    echo "Or install the XPI (not found - run 'yarn build' to create)"
fi
echo ""
