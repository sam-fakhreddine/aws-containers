#!/usr/bin/env bash
set -euo pipefail

# AWS Profile Bridge API Service Installer
# v3.1.0 - Powered by uv

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

APP_NAME="aws-profile-bridge"
SERVICE_NAME="aws-profile-bridge"
INSTALL_DIR="$HOME/.local/share/$APP_NAME"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="$HOME/.aws/logs"

echo -e "${PURPLE}⚡ AWS Profile Bridge API Service Installer (uv edition)${NC}"

# --- Helper Functions ---

print_status() { echo -e "${BLUE}➜ $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Installation failed."
    fi
}

trap cleanup EXIT

# --- Pre-flight: uv Detection ---

print_status "Checking for uv..."
if ! command -v uv &>/dev/null; then
    print_warning "uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Add to current shell path explicitly for this run
    if [[ "$OSTYPE" == "darwin"* ]]; then
        export PATH="$HOME/.cargo/bin:$PATH"
    else
        export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    fi
else
    print_success "Found uv $(uv --version)"
fi

# --- Installation ---

# 1. Environment Setup
print_status "Setting up directories..."
mkdir -p "$LOG_DIR"

# 2. Virtual Environment (Managed by uv)
print_status "Creating virtual environment (Python 3.12)..."
rm -rf "$VENV_DIR"
uv venv "$VENV_DIR" --python 3.12 --seed

# 3. Dependency Installation (Fast)
print_status "Syncing dependencies..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

uv pip install \
    --python "$VENV_DIR" \
    -e "$PROJECT_ROOT/api-server" \
    fastapi \
    'uvicorn[standard]' \
    pydantic \
    boto3

print_success "Dependencies installed"

# 4. Service Configuration
APP_PYTHON="$VENV_DIR/bin/python"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # --- Linux Systemd ---
    SYSTEMD_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="$SYSTEMD_DIR/$SERVICE_NAME.service"
    
    print_status "Configuring systemd service..."
    mkdir -p "$SYSTEMD_DIR"
    systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true

    cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=AWS Profile Bridge API
After=network.target

[Service]
Type=simple
ExecStart=$APP_PYTHON -m aws_profile_bridge api
Restart=on-failure
RestartSec=5
StandardOutput=append:$LOG_DIR/aws_profile_bridge_api.log
StandardError=append:$LOG_DIR/aws_profile_bridge_api.log
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
EOF

    systemctl --user daemon-reload
    systemctl --user enable "$SERVICE_NAME"
    systemctl --user start "$SERVICE_NAME"
    print_success "Systemd service active"

elif [[ "$OSTYPE" == "darwin"* ]]; then
    # --- macOS Launchd ---
    LAUNCH_DIR="$HOME/Library/LaunchAgents"
    PLIST_NAME="com.aws.profile-bridge"
    PLIST_FILE="$LAUNCH_DIR/$PLIST_NAME.plist"
    USER_ID=$(id -u)
    
    print_status "Configuring launchd service..."
    mkdir -p "$LAUNCH_DIR"
    
    # Unload existing service if present
    launchctl bootout "gui/$USER_ID/$PLIST_NAME" 2>/dev/null || true
    rm -f "$PLIST_FILE"
    sleep 1
    
    cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>$APP_PYTHON</string>
        <string>-m</string>
        <string>aws_profile_bridge</string>
        <string>api</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/aws_profile_bridge_api.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/aws_profile_bridge_api.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONUNBUFFERED</key>
        <string>1</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

    # Load the service
    if launchctl bootstrap "gui/$USER_ID" "$PLIST_FILE" 2>/dev/null; then
        print_success "Launchd service active"
    else
        # If bootstrap fails, try load instead
        launchctl load "$PLIST_FILE" 2>/dev/null || {
            print_error "Failed to load service. Trying manual start..."
            "$APP_PYTHON" -m aws_profile_bridge api > "$LOG_DIR/aws_profile_bridge_api.log" 2>&1 &
            print_success "Started API server manually (PID: $!)"
        }
    fi

else
    print_error "Unsupported OS: $OSTYPE"
    exit 1
fi

# --- Verification ---

print_status "Waiting for API verification..."
HEALTH_URL="http://localhost:10999/health"

for _ in $(seq 1 10); do
    if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
        print_success "API is online!"
        echo ""
        echo -e "  ${BLUE}Endpoint:${NC} http://localhost:10999"
        echo -e "  ${BLUE}Logs:${NC}     tail -f $LOG_DIR/aws_profile_bridge_api.log"
        trap - EXIT
        exit 0
    fi
    sleep 1
done

print_error "Service started but API is not responding."
echo "Check logs at: $LOG_DIR/aws_profile_bridge_api.log"
exit 1
