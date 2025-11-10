#!/bin/bash
# Test script to verify native messaging bridge works correctly

echo "=========================================="
echo "Testing AWS Profile Bridge"
echo "=========================================="
echo ""

SCRIPT_PATH="$HOME/.local/bin/aws_profile_bridge.py"

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Bridge script not found at: $SCRIPT_PATH"
    echo "   Run ./install.sh first"
    exit 1
fi

echo "✓ Bridge script found"

# Check if executable
if [ ! -x "$SCRIPT_PATH" ]; then
    echo "❌ Bridge script is not executable"
    echo "   Run: chmod +x $SCRIPT_PATH"
    exit 1
fi

echo "✓ Bridge script is executable"

# Check if AWS credentials exist
if [ ! -f "$HOME/.aws/credentials" ]; then
    echo "⚠️  AWS credentials file not found at: $HOME/.aws/credentials"
    echo "   Extension will work but show no profiles"
else
    PROFILE_COUNT=$(grep -c '^\[' "$HOME/.aws/credentials" || echo "0")
    echo "✓ AWS credentials found with $PROFILE_COUNT profiles"
fi

echo ""
echo "Testing native messaging protocol..."
echo ""

# Test: Get profiles
echo "Test 1: Requesting profile list..."
echo '{"action":"getProfiles"}' | python3 "$SCRIPT_PATH" > /tmp/bridge_test_output.bin 2>&1

if [ $? -eq 0 ]; then
    # Decode the native messaging response (skip first 4 bytes which are length)
    if [ -f /tmp/bridge_test_output.bin ] && [ -s /tmp/bridge_test_output.bin ]; then
        # Extract JSON (skip 4-byte length prefix)
        tail -c +5 /tmp/bridge_test_output.bin | python3 -m json.tool 2>/dev/null
        if [ $? -eq 0 ]; then
            echo ""
            echo "✓ Profile list retrieved successfully"
        else
            echo "⚠️  Response received but couldn't parse JSON"
            echo "   Raw output:"
            cat /tmp/bridge_test_output.bin
        fi
    else
        echo "⚠️  No output received from bridge"
    fi
else
    echo "❌ Bridge script failed with error:"
    cat /tmp/bridge_test_output.bin
    exit 1
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "If you see JSON output above with your profiles,"
echo "the native messaging bridge is working correctly!"
echo ""
echo "Next: Load the extension in Firefox to test the full integration"

rm -f /tmp/bridge_test_output.bin
