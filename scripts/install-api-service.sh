#!/usr/bin/env bash
set -euo pipefail

# AWS Profile Bridge API Service Installer - Python 3.12+
# This script installs the API server as a system service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 AWS Profile Bridge API Service Installer v2.0.0"
echo ""

# Function to print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check Python version - MUST be 3.12+
echo "Checking Python version..."
PYTHON_CMD=""

# Try various Python commands
for cmd in python3.12 python3.13 python3.14 python3 python; do
    if command -v "$cmd" &> /dev/null; then
        VERSION=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
        MAJOR=$(echo "$VERSION" | cut -d. -f1)
        MINOR=$(echo "$VERSION" | cut -d. -f2)
        
        if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 12 ]; then
            PYTHON_CMD="$cmd"
            print_success "Found Python $VERSION at $(which "$cmd")"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    print_error "Python 3.12+ is required but not found"
    echo ""
    echo "Please install Python 3.12 or later:"
    echo "  macOS:  brew install python@3.12"
    echo "  Ubuntu: sudo add-apt-repository ppa:deadsnakes/ppa"
    echo "          sudo apt update && sudo apt install python3.12"
    echo "  Fedora: sudo dnf install python3.12"
    exit 1
fi

PYTHON_PATH=$(which "$PYTHON_CMD")
echo "Using Python: $PYTHON_PATH"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create log directory
echo "Creating log directory..."
mkdir -p ~/.aws/logs
print_success "Log directory created"

# Install Python dependencies
echo "Installing Python dependencies..."
cd "$PROJECT_ROOT/native-messaging"

if ! "$PYTHON_CMD" -m pip install --user -q fastapi 'uvicorn[standard]' pydantic boto3; then
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Install the package
if ! "$PYTHON_CMD" -m pip install --user -q -e .; then
    print_error "Failed to install aws-profile-bridge package"
    exit 1
fi

print_success "Python dependencies installed"
cd "$PROJECT_ROOT"

# Detect OS and install service
echo ""
echo "Installing system service..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux systemd installation
    print_warning "Installing systemd service (Linux)"
    
    mkdir -p ~/.config/systemd/user
    
    # Generate service file with correct Python path
    sed "s|/usr/bin/python3.12|$PYTHON_PATH|g" \
        "$PROJECT_ROOT/scripts/services/aws-profile-bridge.service" \
        > ~/.config/systemd/user/aws-profile-bridge.service
    
    # Reload systemd
    systemctl --user daemon-reload
    
    # Enable service
    systemctl --user enable aws-profile-bridge.service
    
    # Start service
    systemctl --user start aws-profile-bridge.service
    
    print_success "Systemd service installed and started"
    echo ""
    echo "Service commands:"
    echo "  Status:  systemctl --user status aws-profile-bridge"
    echo "  Stop:    systemctl --user stop aws-profile-bridge"
    echo "  Start:   systemctl --user start aws-profile-bridge"
    echo "  Restart: systemctl --user restart aws-profile-bridge"
    echo "  Logs:    journalctl --user -u aws-profile-bridge -f"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS launchd installation
    print_warning "Installing launchd service (macOS)"
    
    USERNAME=$(whoami)
    
    # Generate plist with correct paths
    sed "s|/usr/local/bin/python3.12|$PYTHON_PATH|g" \
        "$PROJECT_ROOT/scripts/services/com.aws.profile-bridge.plist" | \
    sed "s|USERNAME|$USERNAME|g" \
        > ~/Library/LaunchAgents/com.aws.profile-bridge.plist
    
    # Load service
    launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
    
    print_success "Launchd service installed and started"
    echo ""
    echo "Service commands:"
    echo "  Status:  launchctl list | grep aws-profile-bridge"
    echo "  Stop:    launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist"
    echo "  Start:   launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist"
    echo "  Logs:    tail -f ~/.aws/logs/aws_profile_bridge_api.log"
    
else
    print_error "Unsupported OS: $OSTYPE"
    echo ""
    echo "Manual setup required:"
    echo "1. Install Python 3.12+ dependencies"
    echo "2. Run: $PYTHON_CMD -m aws_profile_bridge api"
    exit 1
fi

# Wait for service to start
echo ""
echo "Waiting for API server to start..."
sleep 3

# Verify API is responding
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://localhost:10999/health > /dev/null 2>&1; then
        print_success "API server is running!"
        
        # Get version info
        VERSION_INFO=$(curl -s http://localhost:10999/version)
        echo ""
        echo "Server Information:"
        echo "$VERSION_INFO" | python3 -m json.tool
        
        echo ""
        print_success "Installation complete!"
        echo ""
        echo "Next steps:"
        echo "1. API server is running on http://localhost:10999"
        echo "2. Test endpoints:"
        echo "   curl http://localhost:10999/health"
        echo "   curl -X POST http://localhost:10999/profiles"
        echo ""
        echo "Logs: tail -f ~/.aws/logs/aws_profile_bridge_api.log"
        exit 0
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

print_error "API server failed to start within 10 seconds"
echo ""
echo "Troubleshooting:"
echo "1. Check logs: tail -f ~/.aws/logs/aws_profile_bridge_api.log"
echo "2. Check service status (see commands above)"
echo "3. Try manual start: $PYTHON_CMD -m aws_profile_bridge api"
exit 1
