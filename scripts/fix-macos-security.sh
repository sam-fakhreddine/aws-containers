#!/bin/bash
# Quick fix for "Python.framework is damaged" error on macOS
# This script removes quarantine attributes and applies ad-hoc code signing

set -e

echo "=========================================="
echo "macOS Security Fix for Native Host"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}✗${NC} This script is only for macOS"
    echo "  Current OS: $OSTYPE"
    exit 1
fi

echo "This script will fix the \"Python.framework is damaged\" error"
echo "by removing quarantine attributes and signing the native host."
echo ""

# Find the native host executable
INSTALLED_PATH="$HOME/.local/bin/aws_profile_bridge"
BIN_PATHS=(
    "bin/darwin-arm64/aws_profile_bridge"
    "bin/darwin-x86_64/aws_profile_bridge"
    "api-server/dist/aws_profile_bridge"
)

# Collect all files that need fixing
FILES_TO_FIX=()

# Check installed binary
if [ -f "$INSTALLED_PATH" ]; then
    FILES_TO_FIX+=("$INSTALLED_PATH")
    echo "Found installed binary: $INSTALLED_PATH"
fi

# Check repository binaries
for bin_path in "${BIN_PATHS[@]}"; do
    if [ -f "$bin_path" ]; then
        FILES_TO_FIX+=("$bin_path")
        echo "Found repository binary: $bin_path"
    fi
done

if [ ${#FILES_TO_FIX[@]} -eq 0 ]; then
    echo -e "${YELLOW}!${NC} No binaries found to fix"
    echo ""
    echo "Looking for:"
    echo "  - $INSTALLED_PATH"
    for bin_path in "${BIN_PATHS[@]}"; do
        echo "  - $bin_path"
    done
    echo ""
    echo "Please build the native host first:"
    echo "  ./scripts/build/build-native-host.sh"
    exit 1
fi

echo ""
echo "Found ${#FILES_TO_FIX[@]} file(s) to fix"
echo ""

# Fix each file
for file_path in "${FILES_TO_FIX[@]}"; do
    echo "----------------------------------------"
    echo "Fixing: $file_path"
    echo "----------------------------------------"

    # Step 1: Remove quarantine attribute
    echo -n "Removing quarantine attribute... "
    if xattr -l "$file_path" 2>/dev/null | grep -q "com.apple.quarantine"; then
        xattr -d com.apple.quarantine "$file_path" 2>/dev/null
        echo -e "${GREEN}✓${NC} Removed"
    else
        echo -e "${YELLOW}✓${NC} Not quarantined"
    fi

    # Step 2: Remove other extended attributes that might cause issues
    echo -n "Removing other security attributes... "
    ATTRS=$(xattr "$file_path" 2>/dev/null | grep -v "^$" || true)
    if [ -n "$ATTRS" ]; then
        xattr -c "$file_path" 2>/dev/null
        echo -e "${GREEN}✓${NC} Cleaned"
    else
        echo -e "${YELLOW}✓${NC} None found"
    fi

    # Step 3: Apply ad-hoc code signature
    echo -n "Applying ad-hoc code signature... "
    if codesign --force --deep --sign - "$file_path" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Signed"

        # Verify signature
        if codesign --verify --deep --strict "$file_path" 2>/dev/null; then
            echo -n "Verifying signature... "
            echo -e "${GREEN}✓${NC} Valid"
        else
            echo -n "Verifying signature... "
            echo -e "${RED}✗${NC} Failed"
        fi

        # Show signature info
        echo ""
        echo "Signature details:"
        codesign -dvv "$file_path" 2>&1 | grep -E "(Identifier|Authority|Signature)" | sed 's/^/  /'
    else
        echo -e "${RED}✗${NC} Failed"
        echo -e "${YELLOW}Warning:${NC} Code signing failed - executable may still trigger security warnings"
    fi

    echo ""
done

echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  ✓ Removed macOS quarantine attributes"
echo "  ✓ Applied ad-hoc code signatures"
echo "  ✓ Cleared security extended attributes"
echo ""
echo "The native host should now work without the"
echo "\"Python.framework is damaged\" error."
echo ""
echo "If you still see the error:"
echo "  1. Restart Firefox completely"
echo "  2. Try reinstalling the extension"
echo "  3. Check Firefox's native messaging permissions"
echo ""
