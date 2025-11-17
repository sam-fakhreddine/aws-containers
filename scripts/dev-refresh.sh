#!/bin/bash
# Quick refresh script for development
# Run this after making code changes to ensure Firefox uses the latest version

set -e

echo "=========================================="
echo "Development Refresh"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo "Step 1: Clearing Python bytecode cache..."
find api-server/src -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find api-server/src -type f -name "*.pyc" -delete 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cache cleared"
echo ""

echo "Step 2: Reinstalling package in editable mode..."
cd api-server
uv pip install -e . --force-reinstall --no-deps
cd ..
echo -e "${GREEN}✓${NC} Package reinstalled"
echo ""

echo "Step 3: Building extension..."
npm run build
echo -e "${GREEN}✓${NC} Extension rebuilt"
echo ""

echo "=========================================="
echo "Refresh Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. In Firefox, go to about:debugging#/runtime/this-firefox"
echo "2. Click 'Reload' on your extension"
echo "3. Click the extension icon to test"
echo ""
echo "To watch logs in real-time:"
echo "  tail -f ~/.aws/logs/aws_profile_bridge.log"
echo ""
