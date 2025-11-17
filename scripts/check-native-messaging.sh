#!/bin/bash
# Check native messaging setup on macOS/Linux

echo "================================================"
echo "Native Messaging Setup Checker"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect OS
if [[ "$(uname)" == "Darwin" ]]; then
    MANIFEST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
else
    MANIFEST_DIR="$HOME/.mozilla/api-server-hosts"
fi

MANIFEST_FILE="$MANIFEST_DIR/aws_profile_bridge.json"
WRAPPER="$HOME/.local/bin/aws_profile_bridge"

echo "1. Checking manifest file..."
if [ -f "$MANIFEST_FILE" ]; then
    echo -e "${GREEN}✓${NC} Manifest exists: $MANIFEST_FILE"
    echo ""
    echo "Manifest contents:"
    cat "$MANIFEST_FILE" | python3 -m json.tool 2>/dev/null || cat "$MANIFEST_FILE"
    echo ""

    # Extract path from manifest
    MANIFEST_PATH=$(grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' "$MANIFEST_FILE" | cut -d'"' -f4)
    echo "Path in manifest: $MANIFEST_PATH"
else
    echo -e "${RED}✗${NC} Manifest NOT found: $MANIFEST_FILE"
    echo "  Run: ./install.sh --dev"
    exit 1
fi
echo ""

echo "2. Checking wrapper script..."
if [ -f "$WRAPPER" ]; then
    echo -e "${GREEN}✓${NC} Wrapper exists: $WRAPPER"

    if [ -x "$WRAPPER" ]; then
        echo -e "${GREEN}✓${NC} Wrapper is executable"
    else
        echo -e "${RED}✗${NC} Wrapper is NOT executable"
        echo "  Fix: chmod +x $WRAPPER"
    fi

    echo ""
    echo "Wrapper contents (first 30 lines):"
    head -30 "$WRAPPER"
else
    echo -e "${RED}✗${NC} Wrapper NOT found: $WRAPPER"
    echo "  Run: ./install.sh --dev"
    exit 1
fi
echo ""

echo "3. Testing wrapper execution..."
if timeout 2s "$WRAPPER" 2>&1 | head -1 > /dev/null; then
    echo -e "${GREEN}✓${NC} Wrapper can execute"
else
    echo -e "${YELLOW}⚠${NC} Wrapper timed out (this is normal if no input provided)"
fi
echo ""

echo "4. Checking if Firefox can access the manifest..."
echo "To verify in Firefox:"
echo "  1. Open Browser Console: Cmd+Shift+J (or Tools > Browser Tools > Browser Console)"
echo "  2. Look for any errors mentioning 'native messaging' or 'aws_profile_bridge'"
echo "  3. Try clicking your extension and check for connection errors"
echo ""

echo "5. Testing native messaging protocol..."
echo "Running: python3 scripts/test-bridge-protocol.py"
echo ""
if [ -f "scripts/test-bridge-protocol.py" ]; then
    python3 scripts/test-bridge-protocol.py
else
    echo -e "${YELLOW}⚠${NC} Test script not found, skipping"
fi

echo ""
echo "================================================"
echo "If everything shows ✓ but extension still doesn't work:"
echo "1. Check Firefox Browser Console (Cmd+Shift+J) for errors"
echo "2. Restart Firefox completely"
echo "3. Reload the extension in about:debugging"
echo "================================================"
