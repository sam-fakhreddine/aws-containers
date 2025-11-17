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

# Parse command line arguments
DEV_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev       Use system Python with uv virtual environment (development mode)"
            echo "  --help, -h  Show this help message"
            echo ""
            echo "Default (no flags): Use pre-built standalone executable"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

if [ "$DEV_MODE" = true ]; then
    echo -e "${YELLOW}Development Mode:${NC} Using system Python with uv virtual environment"
    echo ""
fi

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo ""
    echo "This project requires Node.js version 22.14.0 or later, or 24.10.0 or later."
    echo ""
    echo "Please install Node.js from:"
    echo "  - https://nodejs.org/ (Official installer)"
    echo "  - https://github.com/nvm-sh/nvm (Node Version Manager)"
    echo ""
    exit 1
fi

# Parse Node version using parameter expansion (faster than subshells)
NODE_VERSION=$(node --version)
NODE_VERSION=${NODE_VERSION#v}  # Remove 'v' prefix
NODE_VERSION_BASE=${NODE_VERSION%%[-+]*}  # Strip pre-release/build metadata
NODE_MAJOR=${NODE_VERSION_BASE%%.*}  # Extract major version
NODE_MINOR=${NODE_VERSION_BASE#*.}  # Remove major.
NODE_MINOR=${NODE_MINOR%%.*}  # Extract minor version

# Check if Node version meets requirements: ^22.14.0 || >= 24.10.0
MEETS_REQUIREMENT=false

if [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 14 ]; then
    MEETS_REQUIREMENT=true
elif [ "$NODE_MAJOR" -eq 24 ] && [ "$NODE_MINOR" -ge 10 ]; then
    MEETS_REQUIREMENT=true
elif [ "$NODE_MAJOR" -gt 24 ]; then
    MEETS_REQUIREMENT=true
fi

if [ "$MEETS_REQUIREMENT" = false ]; then
    echo -e "${RED}Error: Node.js version $NODE_VERSION is not supported${NC}"
    echo ""
    echo "This project requires:"
    echo "  - Node.js 22.14.0 or later (22.x branch)"
    echo "  - Node.js 24.10.0 or later (24.x+ branch)"
    echo ""
    echo "You currently have: v$NODE_VERSION"
    echo ""
    echo "To upgrade Node.js:"
    echo "  1. Using nvm (recommended):"
    echo "     nvm install 24.10.0"
    echo "     nvm use 24.10.0"
    echo ""
    echo "  2. Download from https://nodejs.org/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js v$NODE_VERSION"
echo ""

# Cache current directory for reuse
PROJECT_ROOT="$(pwd)"

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
    # Try to extract from manifest.json (optimized with single grep)
    EXTENSION_ID=$(grep -oP '"id"\s*:\s*"\K[^"]+' dist/manifest.json 2>/dev/null || grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' dist/manifest.json | sed 's/.*"\([^"]*\)"/\1/')
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

if [ "$DEV_MODE" = true ]; then
    # Development mode: Use system Python with uv environment
    echo "Setting up development environment with uv..."
    echo "  • Using system Python with uv virtual environment"
    echo "  • Virtual environment: $PROJECT_ROOT/api-server/.venv"

    # Check if uv is installed
    if ! command -v uv &> /dev/null; then
        echo -e "${YELLOW}!${NC} uv not found. Installing uv..."

        # Install uv
        if command -v curl &> /dev/null; then
            curl -LsSf https://astral.sh/uv/install.sh | sh

            # Source the environment to make uv available
            export PATH="$HOME/.cargo/bin:$PATH"

            if ! command -v uv &> /dev/null; then
                echo -e "${RED}✗${NC} Failed to install uv. Please install it manually:"
                echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
                exit 1
            fi
        else
            echo -e "${RED}✗${NC} curl not found. Please install uv manually:"
            echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
            exit 1
        fi
    fi

    echo -e "${GREEN}✓${NC} uv is available"

    # Create uv virtual environment in api-server directory
    VENV_DIR="$PROJECT_ROOT/api-server/.venv"

    if [ -d "$VENV_DIR" ]; then
        echo "Virtual environment already exists, removing it..."
        rm -rf "$VENV_DIR"
    fi

    cd api-server

    # Clear Python bytecode cache to ensure fresh code
    echo "Clearing Python bytecode cache..."
    find src -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find src -type f -name "*.pyc" -delete 2>/dev/null || true

    echo "Creating virtual environment..."
    uv venv

    # Install dependencies in editable mode (uses source code directly)
    echo "Installing dependencies with uv (editable mode)..."
    uv pip install -e .

    # Verify editable install
    if uv pip show aws-profile-bridge | grep -q "Editable project location"; then
        echo -e "${GREEN}✓${NC} Package installed in editable mode (changes take effect immediately)"
    else
        echo -e "${YELLOW}!${NC} Warning: Package may not be in editable mode"
    fi

    cd ..

    echo -e "${GREEN}✓${NC} Virtual environment created at: $VENV_DIR"

    # Create wrapper script that activates venv and runs the API server
    WRAPPER_SCRIPT="$INSTALL_DIR/aws_profile_bridge"
    cat > "$WRAPPER_SCRIPT" <<'WRAPPER_EOF'
#!/bin/bash
# AWS Profile Bridge wrapper script for development mode
# This script activates the uv virtual environment and runs the Python bridge
#
# IMPORTANT: This uses editable mode (pip install -e .)
# Code changes take effect immediately - no reinstall needed!
# If you're not seeing changes, run: ./scripts/dev-refresh.sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find the project root (where api-server directory is)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if we're in the right place
if [ ! -d "$PROJECT_ROOT/api-server/.venv" ]; then
    # Try alternative path
    PROJECT_ROOT="__PROJECT_ROOT__"
fi

VENV_DIR="$PROJECT_ROOT/api-server/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Error: Virtual environment not found at $VENV_DIR" >&2
    echo "Please run install.sh --dev again" >&2
    exit 1
fi

# Clear Python import cache to ensure latest code is used
# This prevents stale bytecode from being used
export PYTHONDONTWRITEBYTECODE=1

# Enable debug logging (writes to ~/.aws/logs/aws_profile_bridge.log)
# This is safe - logs go to files only, not stderr
export DEBUG=1

# Activate virtual environment and run the bridge
source "$VENV_DIR/bin/activate"
exec python3 -m aws_profile_bridge "$@"
WRAPPER_EOF

    # Replace __PROJECT_ROOT__ with actual path (portable sed)
    PROJECT_ROOT_ESCAPED=$(printf '%s\n' "$PROJECT_ROOT" | sed 's/[&/\]/\\&/g')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|__PROJECT_ROOT__|$PROJECT_ROOT_ESCAPED|g" "$WRAPPER_SCRIPT"
    else
        sed -i "s|__PROJECT_ROOT__|$PROJECT_ROOT_ESCAPED|g" "$WRAPPER_SCRIPT"
    fi

    chmod +x "$WRAPPER_SCRIPT" || {
        echo -e "${RED}✗${NC} Failed to set executable permissions on wrapper"
        exit 1
    }
    echo -e "${GREEN}✓${NC} Wrapper script installed to: $WRAPPER_SCRIPT"
    INSTALLED_PATH="$WRAPPER_SCRIPT"

else
    # Production mode: Use pre-built executable or fallback to Python
    EXECUTABLE_PATH="bin/$PLATFORM/aws_profile_bridge"
    if [ -f "$EXECUTABLE_PATH" ]; then
        echo "Using pre-built standalone executable (no Python required)"
        cp "$EXECUTABLE_PATH" "$INSTALL_DIR/aws_profile_bridge" || {
            echo -e "${RED}✗${NC} Failed to copy executable"
            exit 1
        }
        chmod +x "$INSTALL_DIR/aws_profile_bridge" || {
            echo -e "${RED}✗${NC} Failed to set executable permissions"
            exit 1
        }
        echo -e "${GREEN}✓${NC} Standalone executable installed to: $INSTALL_DIR/aws_profile_bridge"
        INSTALLED_PATH="$INSTALL_DIR/aws_profile_bridge"

        # Apply macOS security fixes
        if [[ "$OS" == "macos" ]]; then
            echo ""
            echo "Applying macOS security fixes..."

            # Remove quarantine attribute
            if xattr -d com.apple.quarantine "$INSTALLED_PATH" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} Removed quarantine attribute"
            fi

            # Clear all extended attributes
            xattr -c "$INSTALLED_PATH" 2>/dev/null || true

            # Ad-hoc code signing
            if command -v codesign &> /dev/null; then
                if codesign --force --deep --sign - "$INSTALLED_PATH" 2>/dev/null; then
                    echo -e "${GREEN}✓${NC} Applied code signature"
                else
                    echo -e "${YELLOW}!${NC} Warning: Code signing failed"
                    echo "  Run this manually to fix: ./scripts/fix-macos-security.sh"
                fi
            fi
        fi
    elif [ -d "api-server/src/aws_profile_bridge" ]; then
        echo -e "${YELLOW}!${NC} Pre-built executable not found, using Python script"
        echo "  (Run ./scripts/build/build-native-host.sh to create standalone executable)"
        echo "  (Or use --dev flag for development mode with uv)"

        # Check if Python is available
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}✗${NC} Python 3 is required but not installed"
            echo "  Please either:"
            echo "  1. Run ./scripts/build/build-native-host.sh to create a standalone executable, or"
            echo "  2. Install Python 3, or"
            echo "  3. Use --dev flag for development mode"
            exit 1
        fi

        # Create a simple wrapper that runs the Python module
        WRAPPER_SCRIPT="$INSTALL_DIR/aws_profile_bridge"
        cat > "$WRAPPER_SCRIPT" <<'WRAPPER_EOF'
#!/bin/bash
# AWS Profile Bridge wrapper script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="__PROJECT_ROOT__"
cd "$PROJECT_ROOT/api-server"
exec python3 -m aws_profile_bridge "$@"
WRAPPER_EOF

        # Replace __PROJECT_ROOT__ with actual path (portable sed)
        PROJECT_ROOT_ESCAPED=$(printf '%s\n' "$PROJECT_ROOT" | sed 's/[&/\]/\\&/g')
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|__PROJECT_ROOT__|$PROJECT_ROOT_ESCAPED|g" "$WRAPPER_SCRIPT"
        else
            sed -i "s|__PROJECT_ROOT__|$PROJECT_ROOT_ESCAPED|g" "$WRAPPER_SCRIPT"
        fi

        chmod +x "$WRAPPER_SCRIPT" || {
            echo -e "${RED}✗${NC} Failed to set executable permissions on wrapper"
            exit 1
        }
        echo -e "${GREEN}✓${NC} Python wrapper script installed to: $WRAPPER_SCRIPT"
        INSTALLED_PATH="$WRAPPER_SCRIPT"
    else
        echo -e "${RED}✗${NC} Neither executable nor Python source found"
        echo "  Please run ./scripts/build/build-native-host.sh first"
        exit 1
    fi
fi
echo ""

# Step 2: Update native messaging manifest with correct path
echo "Step 2: Installing native messaging host manifest..."
mkdir -p "$NATIVE_MESSAGING_DIR" || {
    echo -e "${RED}✗${NC} Failed to create directory: $NATIVE_MESSAGING_DIR"
    exit 1
}

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

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to create manifest file"
    exit 1
fi

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
    PROFILE_COUNT=$(grep -c '^\[' "$HOME/.aws/credentials" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓${NC} Found AWS credentials file with $PROFILE_COUNT profile(s)"
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

if [ "$DEV_MODE" = true ]; then
    # Create log directory
    LOG_DIR="$HOME/.aws/logs"
    mkdir -p "$LOG_DIR"
    chmod 700 "$LOG_DIR" 2>/dev/null || true

    echo -e "${GREEN}Development Mode Summary:${NC}"
    echo "  • Using system Python with uv virtual environment"
    echo "  • Virtual environment: $PROJECT_ROOT/api-server/.venv"
    echo "  • Wrapper script: $INSTALLED_PATH"
    echo "  • Debug logging: ENABLED"
    echo ""
    echo "Debug logs are written to:"
    echo "  • stderr (visible in Firefox Browser Console)"
    echo "  • File: $LOG_DIR/aws_profile_bridge.log"
    echo ""
    echo "Log rotation:"
    echo "  • Max file size: 10 MB"
    echo "  • Backup files: 5 (automatically rotated)"
    echo "  • Total max size: ~50 MB"
    echo ""
    echo "Debug logs show:"
    echo "  • Operation timing"
    echo "  • File parsing details"
    echo "  • SSO token lookup"
    echo "  • Profile aggregation"
    echo "  • Error diagnostics"
    echo ""
fi

echo "Next steps:"
echo ""
echo "1. Open Firefox and navigate to: about:debugging#/runtime/this-firefox"
echo ""
echo "2. Click 'Load Temporary Add-on'"
echo ""
echo "3. Navigate to and select this file:"
echo "   $PROJECT_ROOT/dist/manifest.json"
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
if [ "$DEV_MODE" = true ]; then
    echo "- Testing the extension:"
    echo "  1. Load the extension in Firefox (about:debugging)"
    echo "  2. Click the extension icon to trigger profile loading"
    echo ""
    echo "📋 Debug logging is ENABLED by default in dev mode"
    echo ""
    echo "To view debug logs (in real-time):"
    echo -e "  ${GREEN}./scripts/watch-logs.sh${NC}"
    echo ""
    echo "Or manually:"
    echo "  tail -f ~/.aws/logs/aws_profile_bridge.log"
    echo ""
    echo "Log files:"
    echo "  • Debug log: ~/.aws/logs/aws_profile_bridge.log"
    echo "  • Error log: ~/.aws/logs/aws_profile_bridge_errors.log"
    echo "  • Auto-rotated at 10 MB (keeps 5 backups)"
    echo ""
    echo "Note: Logs go to FILES only (not stderr - safe for native messaging)"
fi
echo ""
if [[ "$OS" == "macos" ]]; then
    echo "If you see '\"Python.framework\" is damaged' error on macOS:"
    echo "  ./scripts/fix-macos-security.sh"
    echo ""
fi

if [ "$DEV_MODE" = false ]; then
    echo "For a fully self-contained installation (no Python required):"
    echo "  ./scripts/build/build-native-host.sh"
    echo ""
    echo "For development mode with system Python and uv:"
    echo "  ./install.sh --dev"
    echo ""
fi

echo -e "${GREEN}Happy containerizing!${NC}"
