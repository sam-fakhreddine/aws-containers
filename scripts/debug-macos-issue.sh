#!/bin/bash
# Debug script for macOS "Python.framework is damaged" issues
# Run this on your Mac and share the output

echo "=========================================="
echo "macOS Native Messaging Debug Info"
echo "=========================================="
echo ""

echo "1. System Information:"
echo "   Architecture: $(uname -m)"
echo "   macOS Version: $(sw_vers -productVersion 2>/dev/null || echo "N/A")"
echo ""

echo "2. Available binaries in repository:"
ls -lh bin/ 2>/dev/null || echo "   No bin/ directory"
echo ""
for dir in bin/*/; do
    if [ -d "$dir" ]; then
        echo "   $dir:"
        ls -lh "$dir" 2>/dev/null || echo "     Empty"
    fi
done
echo ""

echo "3. Installed native host:"
if [ -f "$HOME/.local/bin/aws_profile_bridge" ]; then
    echo "   Found: $HOME/.local/bin/aws_profile_bridge"
    ls -lh "$HOME/.local/bin/aws_profile_bridge"
    echo "   File type: $(file "$HOME/.local/bin/aws_profile_bridge")"
    echo "   Extended attributes:"
    xattr -l "$HOME/.local/bin/aws_profile_bridge" 2>/dev/null || echo "     None"
    echo "   Code signature:"
    codesign -dvv "$HOME/.local/bin/aws_profile_bridge" 2>&1 | head -10
elif [ -f "$HOME/.local/bin/aws_profile_bridge.py" ]; then
    echo "   Found: $HOME/.local/bin/aws_profile_bridge.py (Python script)"
    ls -lh "$HOME/.local/bin/aws_profile_bridge.py"
else
    echo "   NOT FOUND in $HOME/.local/bin/"
fi
echo ""

echo "4. Native messaging manifest:"
MANIFEST="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json"
if [ -f "$MANIFEST" ]; then
    echo "   Found: $MANIFEST"
    cat "$MANIFEST"
else
    echo "   NOT FOUND: $MANIFEST"
fi
echo ""

echo "5. Check what architecture your Mac is:"
if [[ "$(uname -m)" == "arm64" ]]; then
    echo "   You're on Apple Silicon (ARM64)"
    echo "   You need: bin/darwin-arm64/aws_profile_bridge"
else
    echo "   You're on Intel (x86_64)"
    echo "   You need: bin/darwin-x86_64/aws_profile_bridge"
fi
echo ""

echo "6. Python version (if using Python script):"
which python3 2>/dev/null || echo "   Python3 not found"
python3 --version 2>/dev/null || echo "   Can't run python3"
echo ""

echo "7. Try running the native host manually:"
if [ -f "$HOME/.local/bin/aws_profile_bridge" ]; then
    echo "   Testing: $HOME/.local/bin/aws_profile_bridge"
    if "$HOME/.local/bin/aws_profile_bridge" < /dev/null 2>&1 | head -3; then
        echo "   Status: Executed (might be waiting for input)"
    else
        echo "   Status: Failed to execute"
    fi
elif [ -f "$HOME/.local/bin/aws_profile_bridge.py" ]; then
    echo "   Testing: $HOME/.local/bin/aws_profile_bridge.py"
    if python3 "$HOME/.local/bin/aws_profile_bridge.py" < /dev/null 2>&1 | head -3; then
        echo "   Status: Executed (might be waiting for input)"
    else
        echo "   Status: Failed to execute"
    fi
fi
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "Share this output to help debug the issue."
echo ""
echo "Common issues:"
echo "  1. Architecture mismatch (Intel binary on ARM Mac or vice versa)"
echo "  2. Binary doesn't exist for your architecture"
echo "  3. Quarantine attributes still present"
echo "  4. Wrong path in native messaging manifest"
echo ""
