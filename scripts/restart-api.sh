#!/bin/bash
# Quick restart script for AWS Profile Bridge API server

set -e

echo "🔄 Restarting AWS Profile Bridge API server..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist 2>/dev/null || true
    sleep 1
    launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
    echo "✅ API server restarted (macOS)"
else
    # Linux
    systemctl --user restart aws-profile-bridge
    echo "✅ API server restarted (Linux)"
fi

# Wait a moment and check status
sleep 2
curl -s http://localhost:10999/health > /dev/null && echo "✅ API server is healthy" || echo "❌ API server health check failed"
