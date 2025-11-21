#!/usr/bin/env bash
set -euo pipefail

# AWS Profile Bridge Service Manager
# v4.0.0 - Complete Service Management
# Usage: ./manage.sh [install|uninstall|start|stop|restart|status|logs|menu]

# --- Configuration ---
APP_NAME="aws-profile-bridge"
SERVICE_NAME="aws-profile-bridge"
INSTALL_DIR="$HOME/.local/share/$APP_NAME"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="$HOME/.aws/logs"
LOG_FILE="$LOG_DIR/aws_profile_bridge_api.log"
PLIST_NAME="com.aws.profile-bridge"
HEALTH_URL="http://localhost:10999/health"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helper Functions ---
print_header() { echo -e "${PURPLE}⚡ AWS Profile Bridge Manager${NC} - $1"; }
print_status() { echo -e "${BLUE}➜ $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ "${1:-}" != "EXIT" ]; then
        print_error "Operation failed. Check logs at: $LOG_FILE"
    fi
}
trap cleanup EXIT

check_uv() {
    if ! command -v uv &>/dev/null; then
        print_warning "uv not found. Installing..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        if [[ "$OSTYPE" == "darwin"* ]]; then
            export PATH="$HOME/.cargo/bin:$PATH"
        else
            export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
        fi
    fi
}

# --- Service Control ---
service_control() {
    local action=$1
    print_status "${action^}ing service..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        systemctl --user "$action" "$SERVICE_NAME"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        local USER_ID=$(id -u)
        case "$action" in
            start)
                launchctl bootstrap "gui/$USER_ID" "$HOME/Library/LaunchAgents/$PLIST_NAME.plist" 2>/dev/null || \
                launchctl load "$HOME/Library/LaunchAgents/$PLIST_NAME.plist" ;;
            stop)
                launchctl bootout "gui/$USER_ID/$PLIST_NAME" 2>/dev/null || true ;;
            restart)
                launchctl bootout "gui/$USER_ID/$PLIST_NAME" 2>/dev/null || true
                sleep 1
                launchctl bootstrap "gui/$USER_ID" "$HOME/Library/LaunchAgents/$PLIST_NAME.plist" 2>/dev/null || \
                launchctl load "$HOME/Library/LaunchAgents/$PLIST_NAME.plist" ;;
        esac
    fi
    print_success "Service ${action}ed"
}

# --- Status Check ---
check_health() {
    print_header "Service Status"
    
    # API Health
    echo -n "  ${CYAN}API Status:${NC}   "
    if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
        echo -e "${GREEN}● Online${NC}"
        echo -e "  ${CYAN}Endpoint:${NC}     $HEALTH_URL"
    else
        echo -e "${RED}● Offline${NC}"
    fi

    # OS Service Status
    echo -n "  ${CYAN}OS Service:${NC}   "
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if systemctl --user is-active --quiet "$SERVICE_NAME"; then
            echo -e "${GREEN}Active${NC}"
        else
            echo -e "${RED}Inactive${NC}"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if launchctl list | grep -q "$PLIST_NAME"; then
            echo -e "${GREEN}Loaded${NC}"
        else
            echo -e "${RED}Unloaded${NC}"
        fi
    fi
    
    echo ""
    trap - EXIT
}

# --- Logs ---
show_logs() {
    print_header "Live Logs"
    echo "Press Ctrl+C to exit..."
    echo "-----------------------"
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        print_error "Log file not found at $LOG_FILE"
    fi
}

# --- Installation ---
install_service() {
    print_header "Installation"
    check_uv
    
    print_status "Setting up directories..."
    mkdir -p "$LOG_DIR"

    if [ -d "$VENV_DIR" ]; then
        print_status "Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
    fi
    
    print_status "Creating virtual environment (Python 3.12)..."
    uv venv "$VENV_DIR" --python 3.12 --seed

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

    APP_PYTHON="$VENV_DIR/bin/python"

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
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
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
EOF

        systemctl --user daemon-reload
        systemctl --user enable "$SERVICE_NAME"
        systemctl --user start "$SERVICE_NAME"
        print_success "Systemd service active"

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        LAUNCH_DIR="$HOME/Library/LaunchAgents"
        PLIST_FILE="$LAUNCH_DIR/$PLIST_NAME.plist"
        USER_ID=$(id -u)
        
        print_status "Configuring launchd service..."
        mkdir -p "$LAUNCH_DIR"
        
        launchctl bootout "gui/$USER_ID/$PLIST_NAME" 2>/dev/null || true
        
        for i in $(seq 1 5); do
            if ! launchctl list | grep -q "$PLIST_NAME"; then
                break
            fi
            sleep 1
        done
        
        rm -f "$PLIST_FILE"
        
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
    <string>$LOG_FILE</string>
    <key>StandardErrorPath</key>
    <string>$LOG_FILE</string>
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

        if launchctl bootstrap "gui/$USER_ID" "$PLIST_FILE" 2>/dev/null || \
           launchctl load "$PLIST_FILE" 2>/dev/null; then
            print_success "Launchd service active"
        else
            print_error "Failed to load service"
            exit 1
        fi
    else
        print_error "Unsupported OS: $OSTYPE"
        exit 1
    fi

    print_status "Waiting for API verification..."
    for _ in $(seq 1 10); do
        if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
            print_success "API is online!"
            echo ""
            echo -e "  ${BLUE}Endpoint:${NC} http://localhost:10999"
            echo -e "  ${BLUE}Logs:${NC}     tail -f $LOG_FILE"
            trap - EXIT
            return 0
        fi
        sleep 1
    done

    print_error "Service started but API is not responding."
    exit 1
}

# --- Uninstallation ---
uninstall_service() {
    print_header "Uninstallation"
    
    print_status "Stopping service..."
    service_control stop 2>/dev/null || true
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        SYSTEMD_DIR="$HOME/.config/systemd/user"
        SERVICE_FILE="$SYSTEMD_DIR/$SERVICE_NAME.service"
        
        systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "$SERVICE_FILE"
        systemctl --user daemon-reload
        print_success "Systemd service removed"
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        LAUNCH_DIR="$HOME/Library/LaunchAgents"
        PLIST_FILE="$LAUNCH_DIR/$PLIST_NAME.plist"
        
        rm -f "$PLIST_FILE"
        print_success "Launchd service removed"
    fi
    
    print_status "Removing installation directory..."
    rm -rf "$INSTALL_DIR"
    
    print_success "Uninstalled successfully"
    trap - EXIT
}

# --- Interactive Menu ---
show_menu() {
    clear
    echo -e "${PURPLE}⚡ AWS Profile Bridge Manager${NC}"
    echo "---------------------------"
    echo "1) Install / Update"
    echo "2) Uninstall"
    echo "---------------------------"
    echo "3) Status Check"
    echo "4) Live Logs"
    echo "5) Restart Service"
    echo "6) Stop Service"
    echo "---------------------------"
    echo "q) Quit"
    echo ""
    read -r -p "Select an option: " choice
    echo ""

    case "$choice" in
        1) install_service ;;
        2) uninstall_service ;;
        3) check_health ;;
        4) show_logs ;;
        5) service_control restart ;;
        6) service_control stop ;;
        q|Q) exit 0 ;;
        *) print_error "Invalid option"; exit 1 ;;
    esac
}

# --- Main Execution ---
MODE=${1:-menu}

case "$MODE" in
    install)   install_service ;;
    uninstall) uninstall_service ;;
    start)     service_control start ;;
    stop)      service_control stop ;;
    restart)   service_control restart ;;
    status)    check_health ;;
    logs)      show_logs ;;
    menu)      show_menu ;;
    help|--help|-h)
        echo "Usage: $0 [install|uninstall|start|stop|restart|status|logs|menu]"
        echo ""
        echo "Commands:"
        echo "  install    - Install/update the service"
        echo "  uninstall  - Remove the service"
        echo "  start      - Start the service"
        echo "  stop       - Stop the service"
        echo "  restart    - Restart the service"
        echo "  status     - Check service status"
        echo "  logs       - Show live logs"
        echo "  menu       - Interactive menu (default)"
        ;;
    *)
        print_error "Unknown argument: $MODE"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
