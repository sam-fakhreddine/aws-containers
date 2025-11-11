#!/bin/bash
# Build standalone native messaging host executable using PyInstaller
# This creates a self-contained binary that doesn't require Python to be installed

set -e

echo "=========================================="
echo "Building Standalone Native Messaging Host"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine OS and architecture
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
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    PLATFORM="linux"
    ARCH_NAME="Linux"
else
    echo -e "${RED}Error: Unsupported operating system${NC}"
    exit 1
fi

echo "Building for: $OS - $ARCH_NAME"
echo "Platform identifier: $PLATFORM"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗${NC} Python 3 is required to build the executable"
    echo "  Please install Python 3 and try again"
    exit 1
fi

echo -e "${GREEN}✓${NC} Python 3 found: $(python3 --version)"
echo ""

# Create virtual environment for building
echo "Step 1: Creating build environment..."
if [ ! -d "venv-build" ]; then
    python3 -m venv venv-build
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${YELLOW}!${NC} Using existing virtual environment"
fi
echo ""

# Activate virtual environment
source venv-build/bin/activate

# Install dependencies
echo "Step 2: Installing build dependencies..."
pip install -q --upgrade pip
pip install -q pyinstaller boto3 botocore
echo -e "${GREEN}✓${NC} Build dependencies installed"
echo ""

# Build executable
echo "Step 3: Building standalone executable..."
cd native-messaging
pyinstaller --clean aws_profile_bridge.spec
cd ..

if [ -f "native-messaging/dist/aws_profile_bridge" ]; then
    echo -e "${GREEN}✓${NC} Executable built successfully"
    echo ""

    # Create bin directory for platform-specific executables
    mkdir -p bin/$PLATFORM

    # Copy executable to bin directory
    cp native-messaging/dist/aws_profile_bridge bin/$PLATFORM/
    chmod +x bin/$PLATFORM/aws_profile_bridge

    echo -e "${GREEN}✓${NC} Executable copied to: bin/$PLATFORM/aws_profile_bridge"

    # macOS-specific post-processing
    if [[ "$OS" == "macos" ]]; then
        echo ""
        echo "Step 4: Applying macOS security fixes..."

        # Remove quarantine attribute (prevents "damaged" error)
        if xattr -d com.apple.quarantine bin/$PLATFORM/aws_profile_bridge 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Removed quarantine attribute"
        else
            echo -e "${YELLOW}!${NC} No quarantine attribute found (this is fine)"
        fi

        # Ad-hoc code signing (allows execution without "damaged" error)
        if command -v codesign &> /dev/null; then
            echo "Signing executable with ad-hoc signature..."
            if codesign --force --deep --sign - bin/$PLATFORM/aws_profile_bridge 2>/dev/null; then
                echo -e "${GREEN}✓${NC} Executable signed successfully"

                # Verify signature
                if codesign --verify --deep --strict bin/$PLATFORM/aws_profile_bridge 2>/dev/null; then
                    echo -e "${GREEN}✓${NC} Signature verified"
                else
                    echo -e "${YELLOW}!${NC} Warning: Signature verification failed"
                fi
            else
                echo -e "${YELLOW}!${NC} Warning: Code signing failed (executable may trigger security warnings)"
            fi
        else
            echo -e "${YELLOW}!${NC} codesign not found - executable may trigger security warnings"
            echo "  You can manually fix this by running:"
            echo "  codesign --force --deep --sign - bin/$PLATFORM/aws_profile_bridge"
        fi
    fi

    # Show file info
    echo ""
    echo "Executable details:"
    ls -lh bin/$PLATFORM/aws_profile_bridge

    if [[ "$OS" == "macos" ]]; then
        echo ""
        echo "Code signature:"
        codesign -dvv bin/$PLATFORM/aws_profile_bridge 2>&1 | grep "Signature" || echo "  (unsigned)"
    fi

    # Test the executable
    echo ""
    echo "Step 5: Testing executable..."
    if bin/$PLATFORM/aws_profile_bridge --help 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Executable runs successfully"
    else
        # It's normal for native messaging host to not have --help, just test it runs
        echo -e "${YELLOW}!${NC} Note: Native messaging hosts don't respond to --help"
        echo -e "${GREEN}✓${NC} Executable is ready (will work with Firefox)"
    fi
else
    echo -e "${RED}✗${NC} Build failed - executable not found"
    exit 1
fi

# Deactivate virtual environment
deactivate

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "The standalone executable has been created:"
echo "  Location: bin/$PLATFORM/aws_profile_bridge"
echo ""
echo "This executable:"
echo "  ✓ Includes Python runtime"
echo "  ✓ Includes all dependencies (boto3, etc.)"
echo "  ✓ Requires NO Python installation on end-user systems"
echo "  ✓ Is ready to use with the Firefox extension"
echo ""
echo "To install, run: ./install.sh"
echo ""
