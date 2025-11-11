#!/bin/bash
# Installation script for AWS Profile Containers Firefox Extension

set -e

echo "=========================================="
echo "AWS Profile Containers - Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine OS, platform, and architecture
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    # Detect macOS architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        PLATFORM="darwin-arm64"
        ARCH_NAME="Apple Silicon (ARM64)"
    else
        PLATFORM="darwin-x86_64"
        ARCH_NAME="Intel (x86_64)"
    fi
    NATIVE_MESSAGING_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    PLATFORM="linux"
    ARCH_NAME="Linux"
    NATIVE_MESSAGING_DIR="$HOME/.mozilla/native-messaging-hosts"
else
    echo -e "${RED}Error: Unsupported operating system${NC}"
    exit 1
fi

echo "Detected OS: $OS ($ARCH_NAME)"
echo "Platform: $PLATFORM"
echo ""

# Determine extension ID (configurable via environment variable)
if [ -n "$EXTENSION_ID" ]; then
    echo "Using extension ID from environment: $EXTENSION_ID"
elif [ -f "dist/manifest.json" ]; then
    # Try to extract from manifest.json
    EXTENSION_ID=$(grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' dist/manifest.json | sed 's/.*"\([^"]*\)"/\1/')
    if [ -n "$EXTENSION_ID" ]; then
        echo "Using extension ID from manifest.json: $EXTENSION_ID"
    fi
fi

# Fallback to default if still not set
if [ -z "$EXTENSION_ID" ]; then
    EXTENSION_ID="aws-profile-containers@yourname.local"
    echo -e "${YELLOW}!${NC} Using default extension ID: $EXTENSION_ID"
    echo "  To customize, set EXTENSION_ID environment variable or update dist/manifest.json"
fi
echo ""

# Step 1: Install native messaging host executable
echo "Step 1: Installing native messaging host..."
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

# Check if pre-built executable exists
EXECUTABLE_PATH="bin/$PLATFORM/aws_profile_bridge"
if [ -f "$EXECUTABLE_PATH" ]; then
    echo "Using pre-built standalone executable (no Python required)"
    cp "$EXECUTABLE_PATH" "$INSTALL_DIR/aws_profile_bridge"
    chmod +x "$INSTALL_DIR/aws_profile_bridge"
    echo -e "${GREEN}✓${NC} Standalone executable installed to: $INSTALL_DIR/aws_profile_bridge"
    INSTALLED_PATH="$INSTALL_DIR/aws_profile_bridge"
elif [ -f "native-messaging/aws_profile_bridge.py" ]; then
    echo -e "${YELLOW}!${NC} Pre-built executable not found, using Python script"
    echo "  (Run ./scripts/build/build-native-host.sh to create standalone executable)"

    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗${NC} Python 3 is required but not installed"
        echo "  Please either:"
        echo "  1. Run ./scripts/build/build-native-host.sh to create a standalone executable, or"
        echo "  2. Install Python 3"
        exit 1
    fi

    cp native-messaging/aws_profile_bridge.py "$INSTALL_DIR/aws_profile_bridge.py"
    chmod +x "$INSTALL_DIR/aws_profile_bridge.py"
    echo -e "${GREEN}✓${NC} Python script installed to: $INSTALL_DIR/aws_profile_bridge.py"
    INSTALLED_PATH="$INSTALL_DIR/aws_profile_bridge.py"
else
    echo -e "${RED}✗${NC} Neither executable nor Python script found"
    echo "  Please run ./scripts/build/build-native-host.sh first"
    exit 1
fi
echo ""

# Step 2: Update native messaging manifest with correct path
echo "Step 2: Installing native messaging host manifest..."
mkdir -p "$NATIVE_MESSAGING_DIR"

# Create manifest with correct path and extension ID
cat > "$NATIVE_MESSAGING_DIR/aws_profile_bridge.json" <<EOF
{
  "name": "aws_profile_bridge",
  "description": "AWS Profile Bridge for reading credentials file",
  "path": "$INSTALLED_PATH",
  "type": "stdio",
  "allowed_extensions": [
    "$EXTENSION_ID"
  ]
}
EOF

echo -e "${GREEN}✓${NC} Native messaging manifest installed to: $NATIVE_MESSAGING_DIR/aws_profile_bridge.json"
echo ""

# Step 3: Check for Node.js and Yarn
echo "Step 3: Checking build dependencies..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}!${NC} Yarn not found. Installing dependencies with npm instead..."
    USE_NPM=true
else
    USE_NPM=false
fi

echo -e "${GREEN}✓${NC} Build tools available"
echo ""

# Step 4: Install dependencies
echo "Step 4: Installing extension dependencies..."

if [ "$USE_NPM" = true ]; then
    npm install
else
    yarn install --frozen-lockfile
fi

echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 5: Build extension
echo "Step 5: Building extension..."

if [ "$USE_NPM" = true ]; then
    npm run build
else
    yarn build
fi

echo -e "${GREEN}✓${NC} Extension built successfully"
echo ""

# Step 6: Check for AWS credentials file
echo "Step 6: Checking AWS credentials..."

if [ -f "$HOME/.aws/credentials" ]; then
    PROFILE_COUNT=$(grep -c '^\[' "$HOME/.aws/credentials" || echo "0")
    echo -e "${GREEN}✓${NC} Found AWS credentials file with $PROFILE_COUNT profiles"
else
    echo -e "${YELLOW}!${NC} AWS credentials file not found at: $HOME/.aws/credentials"
    echo "  You'll need to set up AWS credentials before using the extension."
fi
echo ""

# Step 7: Instructions for loading in Firefox
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Open Firefox and navigate to: about:debugging#/runtime/this-firefox"
echo ""
echo "2. Click 'Load Temporary Add-on'"
echo ""
echo "3. Navigate to and select this file:"
echo "   $(pwd)/dist/manifest.json"
echo ""
echo "4. The extension icon should appear in your toolbar"
echo ""
echo "5. Click the extension icon to see your AWS profiles"
echo ""
echo -e "${YELLOW}Note:${NC} Temporary extensions are removed when Firefox restarts."
echo "      For permanent installation, you'll need to sign the extension."
echo ""
echo "=========================================="
echo "Testing the Installation"
echo "=========================================="
echo ""
echo "To test if everything is working:"
echo ""
echo "1. Click the extension icon in Firefox"
echo "2. You should see a list of your AWS profiles"
echo "3. Click on a profile to open it in a container"
echo ""
echo "If you see 'Setup Required', try:"
echo "- Restarting Firefox"
echo "- Checking that the native messaging host is executable:"
echo "  ls -la $INSTALLED_PATH"
echo "- Checking the native messaging manifest:"
echo "  cat $NATIVE_MESSAGING_DIR/aws_profile_bridge.json"
echo ""
echo "For a fully self-contained installation (no Python required):"
echo "  ./scripts/build/build-native-host.sh"
echo ""
echo -e "${GREEN}Happy containerizing!${NC}"
