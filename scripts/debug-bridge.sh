#!/bin/bash
# Debug script to check why the bridge isn't working

echo "=========================================="
echo "AWS Profile Bridge - Debug Diagnostics"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check wrapper script
echo "1. Checking wrapper script..."
WRAPPER="$HOME/.local/bin/aws_profile_bridge"
if [ -f "$WRAPPER" ]; then
    echo -e "${GREEN}✓${NC} Wrapper exists: $WRAPPER"
    if [ -x "$WRAPPER" ]; then
        echo -e "${GREEN}✓${NC} Wrapper is executable"
    else
        echo -e "${RED}✗${NC} Wrapper is NOT executable"
        echo "  Fix: chmod +x $WRAPPER"
    fi
else
    echo -e "${RED}✗${NC} Wrapper not found: $WRAPPER"
    echo "  Fix: Run ./install.sh --dev"
fi
echo ""

# Check native messaging manifest
echo "2. Checking native messaging manifest..."
# Detect OS and set correct manifest path
if [[ "$(uname)" == "Darwin" ]]; then
    MANIFEST="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json"
else
    MANIFEST="$HOME/.mozilla/api-server-hosts/aws_profile_bridge.json"
fi
if [ -f "$MANIFEST" ]; then
    echo -e "${GREEN}✓${NC} Manifest exists: $MANIFEST"

    # Check if path in manifest matches wrapper
    MANIFEST_PATH=$(grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' "$MANIFEST" | cut -d'"' -f4)
    if [ "$MANIFEST_PATH" = "$WRAPPER" ]; then
        echo -e "${GREEN}✓${NC} Manifest path matches wrapper"
    else
        echo -e "${RED}✗${NC} Manifest path mismatch!"
        echo "  Manifest points to: $MANIFEST_PATH"
        echo "  Should point to: $WRAPPER"
    fi

    # Show manifest contents
    echo "  Manifest contents:"
    cat "$MANIFEST" | sed 's/^/    /'
else
    echo -e "${RED}✗${NC} Manifest not found: $MANIFEST"
    echo "  Fix: Run ./install.sh --dev"
fi
echo ""

# Check Python environment
echo "3. Checking Python environment..."
# Detect project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
VENV_DIR="$PROJECT_ROOT/api-server/.venv"
if [ -d "$VENV_DIR" ]; then
    echo -e "${GREEN}✓${NC} Virtual environment exists"

    # Test activation
    if source "$VENV_DIR/bin/activate" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Can activate venv"

        # Check if aws_profile_bridge module exists
        if python3 -c "import aws_profile_bridge" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} aws_profile_bridge module is importable"
        else
            echo -e "${RED}✗${NC} aws_profile_bridge module NOT importable"
        fi

        deactivate 2>/dev/null
    else
        echo -e "${RED}✗${NC} Cannot activate venv"
    fi
else
    echo -e "${RED}✗${NC} Virtual environment not found: $VENV_DIR"
    echo "  Fix: Run ./install.sh --dev"
fi
echo ""

# Try to run the bridge manually (will fail without input, but shows if it starts)
echo "4. Testing bridge startup..."
echo "  Running wrapper script with test (will timeout after 2 seconds)..."

# Create a test that sends nothing and times out - this will show if the bridge at least starts
timeout 2s "$WRAPPER" 2>&1 &
BRIDGE_PID=$!
sleep 1

if ps -p $BRIDGE_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Bridge process started successfully"
    kill $BRIDGE_PID 2>/dev/null
    wait $BRIDGE_PID 2>/dev/null
else
    echo -e "${YELLOW}⚠${NC} Bridge process ended (this might be normal if no input provided)"
fi
echo ""

# Check log files
echo "5. Checking log files..."
DEBUG_LOG="$HOME/.aws/logs/aws_profile_bridge.log"
ERROR_LOG="$HOME/.aws/logs/aws_profile_bridge_errors.log"

if [ -f "$DEBUG_LOG" ]; then
    SIZE=$(du -h "$DEBUG_LOG" 2>/dev/null | cut -f1)
    LINES=$(wc -l < "$DEBUG_LOG" 2>/dev/null)
    echo -e "${GREEN}✓${NC} Debug log exists: $DEBUG_LOG ($SIZE, $LINES lines)"

    if [ $LINES -gt 0 ]; then
        echo "  Last 5 lines:"
        tail -5 "$DEBUG_LOG" | sed 's/^/    /'
    else
        echo -e "${YELLOW}⚠${NC} Debug log is empty"
    fi
else
    echo -e "${YELLOW}⚠${NC} No debug log yet: $DEBUG_LOG"
fi

if [ -f "$ERROR_LOG" ]; then
    SIZE=$(du -h "$ERROR_LOG" 2>/dev/null | cut -f1)
    LINES=$(wc -l < "$ERROR_LOG" 2>/dev/null)
    echo -e "${GREEN}✓${NC} Error log exists: $ERROR_LOG ($SIZE, $LINES lines)"

    if [ $LINES -gt 0 ]; then
        echo -e "${RED}  Found errors:${NC}"
        tail -10 "$ERROR_LOG" | sed 's/^/    /'
    fi
else
    echo -e "${GREEN}✓${NC} No error log (good - means no errors)"
fi
echo ""

# Check Firefox extension
echo "6. Checking Firefox setup..."
echo "  To verify in Firefox:"
echo "  1. Go to about:debugging#/runtime/this-firefox"
echo "  2. Find 'AWS Profile Containers' extension"
echo "  3. Click 'Inspect' to see background page status"
echo "  4. Check browser console for errors"
echo ""

# Recommendations
echo "=========================================="
echo "Recommendations:"
echo "=========================================="
echo ""
echo "To see live logs:"
echo -e "  ${GREEN}./scripts/watch-logs.sh${NC}"
echo ""
echo "To test manually (with proper protocol):"
echo -e "  ${GREEN}python3 scripts/test-bridge-protocol.py${NC}"
echo ""
echo "To reinstall:"
echo -e "  ${GREEN}./install.sh --dev${NC}"
echo ""
